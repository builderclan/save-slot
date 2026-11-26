# SaveSlot v1.0.0 — System Architecture & Technical Specifications

**Version:** `1.0.0` *(Target Architecture — Dedicated 1-Host, 1-DB per College)*  
**Stack:** Next.js 16 (App Router, Turbopack), React 19, Tailwind CSS v4, Drizzle ORM, PostgreSQL (Supabase)

---

## 1. Deployment & Architecture Model

Each college runs its own **independent application host and dedicated PostgreSQL database** (not a shared multi-tenant SaaS database). Because of this, `v1.0.0` drops the POC `campuses` table and all `campus_id` foreign keys, replacing them with a single-row `college_settings` config table for Admin-editable letterhead and reference settings.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                             PRESENTATION LAYER                               │
│  - Public Notice Board (/) & Public QR Verification (/verify/[code])         │
│  - Role Workspaces: /lead, /staff, /tic, /hod, /principal, /admin            │
│  - Printable A4 Reporting Views (/reports/events/[id], /reports/summary)     │
└──────────────────────────────────────┬───────────────────────────────────────┘
                                       │
┌──────────────────────────────────────▼───────────────────────────────────────┐
│                             APPLICATION LAYER                                │
│  - Safe-Slot & Conflict Engine (src/lib/conflicts/engine.ts)                 │
│  - Multi-Stage Workflow & Reference Sequence Service (src/lib/workflows/)    │
│  - Overdue Post-Event Gate & Policy Validators (src/lib/validations/)        │
│  - Session & Effective-Role Resolver (src/lib/auth.ts)                       │
│  - Notification Dispatcher (In-App v1.0.0; WhatsApp Adapter TODO)            │
└──────────────────────────────────────┬───────────────────────────────────────┘
                                       │
┌──────────────────────────────────────▼───────────────────────────────────────┐
│                              DATA ACCESS LAYER                               │
│  - REST API Handlers (/api/events, /api/workspace/*, /api/hod/*, /api/tic/*, │
│    /api/principal/*, /api/admin/*, /api/reports/*, /api/verify/*)            │
│  - Drizzle ORM + Resilient pg.Pool (src/lib/db.ts) with Retry & KeepAlive    │
│  - PostgreSQL Row-Level Locking (SELECT ... FOR UPDATE) & RLS                │
└──────────────────────────────────────┬───────────────────────────────────────┘
                                       │
┌──────────────────────────────────────▼───────────────────────────────────────┐
│                      DEDICATED COLLEGE DATABASE (PostgreSQL)                 │
│  college_settings, departments, communities, community_members, users,       │
│  venues, events, event_stage2_approvals, event_approvals, event_mentors,     │
│  event_reports, event_reference_counters, notifications, auth_rate_limits    │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Database Schema (`v1.0.0` PostgreSQL / Drizzle DDL)

> **Launch Strategy:** Each college launches on a fresh database using the advisory-locked migration runner (`scripts/migrate.js`) with a clean `v1.0.0` schema (dropping `campuses` and `campus_id`).

### 2.1 `college_settings` & `venues`

```sql
-- Single-row table storing college identity, letterhead, and ref-code defaults
CREATE TABLE college_settings (
    id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    college_name VARCHAR(255) NOT NULL,         -- e.g., Albertian Institute of Science & Technology
    short_code VARCHAR(20) NOT NULL,            -- e.g., AISAT (used in reference numbers)
    letterhead_subtitle VARCHAR(255),
    logo_url TEXT,
    academic_year_start_month INT NOT NULL DEFAULT 7, -- July 1 - June 30
    timezone VARCHAR(50) NOT NULL DEFAULT 'Asia/Kolkata',
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE venues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    building VARCHAR(255) NOT NULL,
    capacity INT,
    address TEXT,
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT venues_building_name_key UNIQUE (building, name)
);
```

### 2.2 `departments` *(New in v1.0.0)*

```sql
CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,               -- e.g., Computer Science & Engineering
    code VARCHAR(20) NOT NULL UNIQUE,         -- e.g., CSE, ECE, EEE, AI, ME, CE
    hod_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    acting_hod_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    is_acting_hod_active BOOLEAN NOT NULL DEFAULT false,
    acting_hod_toggled_by UUID REFERENCES users(id) ON DELETE SET NULL,
    acting_hod_toggled_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);
```

### 2.3 `communities` *(Updated in v1.0.0)*

```sql
CREATE TABLE communities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(20) NOT NULL UNIQUE,         -- Reference prefix e.g., GDG, IEEE, FOSS
    scope VARCHAR(20) NOT NULL DEFAULT 'internal' CHECK (scope IN ('internal', 'external')),
    category VARCHAR(100) NOT NULL DEFAULT 'General',
    description TEXT,
    logo_url TEXT,
    website TEXT,
    instagram VARCHAR(100),
    status VARCHAR(50) DEFAULT 'approved',
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);
```

### 2.4 `users`, `community_members` & `auth_rate_limits`

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (
        role IN ('admin', 'principal', 'vice_principal', 'hod', 'tic', 'staff', 'lead')
    ),
    designation VARCHAR(150),
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    avatar_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE community_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'lead' CHECK (role IN ('lead', 'tic', 'member')),
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT community_members_community_user_unique UNIQUE (community_id, user_id)
);

CREATE TABLE auth_rate_limits (
    key VARCHAR(255) PRIMARY KEY, -- "ip:1.2.3.4" or "email:user@college.edu"
    failed_attempts INT NOT NULL DEFAULT 1,
    first_failed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    locked_until TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 2.5 `events` *(Updated in v1.0.0)*

```sql
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    origin_type VARCHAR(20) NOT NULL CHECK (origin_type IN ('community', 'department', 'college')),
    community_id UUID REFERENCES communities(id) ON DELETE RESTRICT,
    department_id UUID REFERENCES departments(id) ON DELETE RESTRICT,
    venue_id UUID REFERENCES venues(id) ON DELETE SET NULL,
    coordinator_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Optional College event closure owner
    reference_number VARCHAR(100) UNIQUE,                        -- Assigned on final P/VP approval
    academic_year VARCHAR(20),                                   -- e.g., '2026-27' (July 1 - June 30)
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(50) NOT NULL,
    target_audience TEXT[] NOT NULL DEFAULT ARRAY['All Students'],
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    timezone VARCHAR(50) DEFAULT 'Asia/Kolkata',
    location_name VARCHAR(255) NOT NULL,
    is_virtual BOOLEAN DEFAULT false,
    virtual_link TEXT,
    external_registration_url TEXT,
    cover_image_url TEXT,
    estimated_budget NUMERIC(12, 2) NOT NULL DEFAULT 0,
    funding_source VARCHAR(100) DEFAULT 'No Cost',
    is_lead_time_overridden BOOLEAN NOT NULL DEFAULT false,
    override_reason TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (
        status IN (
            'draft',
            'pending_stage2',
            'pending_executive',
            'published',
            'needs_reschedule',
            'rejected',
            'cancelled',
            'pending_report_verification',
            'completed'
        )
    ),
    rejection_reason TEXT,
    cancellation_reason TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT events_time_range_check CHECK (end_time > start_time),
    CONSTRAINT events_origin_owner_check CHECK (
        (origin_type = 'community' AND community_id IS NOT NULL) OR
        (origin_type = 'department' AND department_id IS NOT NULL) OR
        (origin_type = 'college')
    )
);

CREATE INDEX idx_events_status_start ON events (status, start_time);
CREATE INDEX idx_events_origin_dept ON events (origin_type, department_id, community_id);
CREATE INDEX idx_events_venue_time ON events (venue_id, start_time, end_time);
CREATE INDEX idx_events_ref_num ON events (reference_number);
```

### 2.6 Workflow, Audit, Mentors, Reports & Notifications *(New in v1.0.0)*

```sql
CREATE TABLE event_stage2_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    entity_type VARCHAR(20) NOT NULL CHECK (entity_type IN ('department', 'community')),
    department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
    community_id UUID REFERENCES communities(id) ON DELETE CASCADE,
    is_primary BOOLEAN NOT NULL DEFAULT false,
    approval_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    approval_remarks TEXT,
    report_verify_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (report_verify_status IN ('pending', 'verified', 'revision_requested')),
    report_verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
    report_verified_at TIMESTAMPTZ,
    report_remarks TEXT,
    CONSTRAINT stage2_entity_target_check CHECK (
        (entity_type = 'department' AND department_id IS NOT NULL AND community_id IS NULL) OR
        (entity_type = 'community' AND community_id IS NOT NULL AND department_id IS NULL)
    )
);

CREATE UNIQUE INDEX idx_stage2_unique_dept ON event_stage2_approvals (event_id, department_id) WHERE department_id IS NOT NULL;
CREATE UNIQUE INDEX idx_stage2_unique_comm ON event_stage2_approvals (event_id, community_id) WHERE community_id IS NOT NULL;

CREATE TABLE event_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    stage VARCHAR(50) NOT NULL,               -- submission | stage2_hod | stage2_tic | executive | override | report_submit | report_verify
    action VARCHAR(50) NOT NULL,              -- submitted | approved | rejected | bumped | overridden | verified | revision_requested
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    actor_name_snapshot VARCHAR(255) NOT NULL,
    actor_role_snapshot VARCHAR(100) NOT NULL,
    remarks TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE event_mentors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    role_title VARCHAR(255) NOT NULL,
    organization VARCHAR(255) NOT NULL,
    mentor_type VARCHAR(20) NOT NULL CHECK (mentor_type IN ('internal', 'external')),
    phase VARCHAR(20) NOT NULL DEFAULT 'planned' CHECK (phase IN ('planned', 'confirmed'))
);

CREATE TABLE event_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL UNIQUE REFERENCES events(id) ON DELETE CASCADE,
    actual_fund_used NUMERIC(12, 2) NOT NULL DEFAULT 0,
    funding_source VARCHAR(100) NOT NULL DEFAULT 'No Cost',
    fund_notes TEXT,
    student_count INT NOT NULL DEFAULT 0,
    faculty_count INT NOT NULL DEFAULT 0,
    external_count INT NOT NULL DEFAULT 0,
    summary TEXT NOT NULL,
    outcomes TEXT NOT NULL,
    evidence_url TEXT,
    submitted_by UUID REFERENCES users(id) ON DELETE SET NULL,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE event_reference_counters (
    academic_year VARCHAR(20) NOT NULL,
    host_code VARCHAR(20) NOT NULL,
    last_seq INT NOT NULL DEFAULT 0,
    PRIMARY KEY (academic_year, host_code)
);

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## 3. Domain-Colocated Feature Slices (`v1.0.0`)

```
src/
├── features/
│   ├── events/        # Public Notice Board, origin/dept filters, Internal/External badges
│   ├── workspace/     # Unified proposer workspace (/lead & /staff), joint co-host picker, overdue gate, post-event report form
│   ├── stage2/        # /tic & /hod approval queues, Acting HOD toggle, report verification
│   ├── principal/     # /principal executive triage, College event creation, 7-day & bump overrides, emergency Acting HOD toggle
│   ├── admin/         # /admin IT & Ops: College settings, Departments, Communities, Venues, Users, Acting HOD fallback
│   ├── reports/       # A4 printable Event Dossier, Consolidated Register, CSV export, QR generator
│   ├── verify/        # Public /verify/[code] read-only authenticity verification
│   ├── notifications/ # In-app inbox & future WhatsApp provider interface
│   ├── conflicts/     # Conflict & Safe-Slot client
│   ├── venues/        # Venue client
│   └── auth/          # Email/password session & recovery
├── components/
│   ├── ui/            # Design primitives (Button, Modal, StatusBadge, PrintLayout)
│   └── layout/        # Unified Navbar + Notification Bell
└── lib/
    ├── auth.ts
    ├── db.ts
    ├── conflicts/engine.ts
    ├── workflows/     # Academic year helper, atomic ref-number generator, Stage 2 router
    └── validations/   # Zod v4 schemas
```

---

## 4. Concurrency, Governance & Security Rules

1. **Zero Admin Approval Authority:** API handlers under `/api/admin/*` never mutate event approval state; Admin manages settings, org units, venues, and accounts only.
2. **Effective Role Resolution (Multi-Duty Faculty):** Authorization resolves permissions from both `users.role` and assignment tables (`departments`, `community_members`), so faculty assigned as `tic` or active `acting_hod` need only one account.
3. **Atomic Reference Numbering:** Inside the P/VP final approval transaction, the counter increments via `INSERT INTO event_reference_counters ... ON CONFLICT DO UPDATE SET last_seq = event_reference_counters.last_seq + 1 RETURNING last_seq`, guaranteeing unique, gap-free `AISAT/2026-27/CSE/014` codes.
4. **Immediate Overdue Submission Gate:** `POST /api/workspace/events` (and `submit`) checks whether the user (`lead` or `staff`) created or coordinates any `published` event whose `end_time < now()` without an `event_reports` row. If found, returns `403 Forbidden`.
5. **Distributed Auth Rate Limiting:** Keeps `auth_rate_limits` (5 failed logins in 15 min $\rightarrow$ 5-minute lockout).
6. **Dedicated Single-Tenant Isolation:** Each college runs its own host and database (`college_settings`), removing `campus_id` joins and lookup overhead across all queries and RLS rules.
