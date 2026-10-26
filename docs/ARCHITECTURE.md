# System Architecture & Technical Specifications

## 1. High-Level Architecture

The platform is designed around a modern full-stack Next.js 16 (App Router) architecture running on React 19 and Tailwind CSS v4, backed by a PostgreSQL database managed via Supabase.

```
┌────────────────────────────────────────────────────────────────────────┐
│                          PRESENTATION LAYER                            │
│  - Next.js 16 App Router (Server & Client Components)                  │
│  - Tailwind CSS v4 Design System & Micro-animations                    │
│  - Public Student Notice Board (SSR + Client-side filtering)           │
│  - Authenticated Workspaces (/lead and /admin)                         │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                           APPLICATION LAYER                            │
│  - Conflict & Safe-Slot Engine (lib/conflicts/engine.ts)               │
│  - Policy Validator (7-day rule, venue capacity, time sanity)          │
│  - Session & RBAC Auth Middleware (lib/auth/session.ts)                │
│  - Calendar Export Service (Google Cal URL generator & .ics builder)   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                            DATA ACCESS LAYER                           │
│  - RESTful API Handlers (/api/events, /api/venues, /api/users)         │
│  - Supabase Database Client & PostgreSQL connection pooling            │
│  - Row-Level Security (RLS) & Server-side Authorization Guards         │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                            DATABASE (PostgreSQL)                       │
│  Tables: campuses, venues, communities, users, events                  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Database Schema (PostgreSQL / Supabase)

### 2.1 Table: `campuses`

Represents the campus entity (single-campus scope with multi-campus readiness).

```sql
CREATE TABLE campuses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    timezone VARCHAR(50) DEFAULT 'UTC',
    created_at TIMESTAMPTZ DEFAULT now()
);
```

### 2.2 Table: `venues`

Physical locations available for booking on campus.

```sql
CREATE TABLE venues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campus_id UUID REFERENCES campuses(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255) NOT NULL,
    capacity INT NOT NULL DEFAULT 50,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);
```

### 2.3 Table: `communities`

Recognized campus clubs, societies, and academic departments.

```sql
CREATE TABLE communities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campus_id UUID REFERENCES campuses(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    category VARCHAR(50) NOT NULL, -- 'Tech', 'Cultural', 'Sports', 'Academic', 'Social'
    description TEXT,
    logo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);
```

### 2.4 Table: `users`

Administrators and Community Leads (Created only by Admins; no public registration).

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('student', 'organizer', 'admin', 'principal', 'vice_principal')),
    community_id UUID REFERENCES communities(id) ON DELETE SET NULL, -- Null for admins and principal
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);
```

### 2.5 Table: `events`

Campus events submitted by Leads or created by Admins.

```sql
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campus_id UUID REFERENCES campuses(id) ON DELETE CASCADE,
    community_id UUID REFERENCES communities(id) ON DELETE CASCADE,
    venue_id UUID REFERENCES venues(id) ON DELETE RESTRICT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'published', 'rejected', 'cancelled', 'draft')),
    rejection_reason TEXT,
    cover_image TEXT,
    registration_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Essential Performance Indexes for Conflict Engine & Feed
CREATE INDEX idx_events_timeline ON events (start_time, end_time, status);
CREATE INDEX idx_events_venue_window ON events (venue_id, start_time, end_time) WHERE status != 'rejected';
CREATE INDEX idx_events_community ON events (community_id);
```

### 2.6 Table: `auth_rate_limits`

Persistent rate-limiting table providing atomic lockout tracking across serverless functions (Migration `012_add_auth_rate_limits.sql`).

```sql
CREATE TABLE auth_rate_limits (
    key VARCHAR(255) PRIMARY KEY, -- "ip:1.2.3.4" or "email:user@campus.edu"
    failed_attempts INT NOT NULL DEFAULT 1,
    first_failed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    locked_until TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_auth_rate_limits_locked_until ON auth_rate_limits (locked_until);
```

---

## 3. The Safe-Slot & Conflict Resolution Engine

### 3.1 Hard Conflict vs Soft Clash Detection

```
                     Candidate Event: [Ts ------------ Te] @ Venue V
                                             ▲
                                             │ Overlap Check
                                             ▼
                 Existing Event:      [Es ------------ Ee] @ Venue V
                 Condition: (Ts < Ee) AND (Te > Es) AND (Status != 'rejected')
```

1. **Hard Conflict (Double Booking)**:
   - Triggers when `candidate.venue_id == existing.venue_id` AND `(candidate.start_time < existing.end_time) AND (candidate.end_time > existing.start_time)`.
   - Result: Hard block for leads (or warning with suggested alternative slots).

2. **Lead Time Policy Violation**:
   - `candidate.start_time < (current_timestamp + INTERVAL '7 days')`.
   - Result: Submissions earlier than 7 days ahead are flagged with a lead-time error.

### 3.2 Safe-Slot Discovery Algorithm

When a clash is detected, the engine runs a fast deterministic search for alternate slots:

1. **Option A (Same Venue, Later in Day)**:
   - Evaluates slots immediately following the conflicting event ending: `Es_end + 30 min buffer`.
2. **Option B (Same Time, Alternative Active Venue)**:
   - Checks other venues with similar capacity that are completely free during `[Ts, Te]`.
3. **Option C (Next Available Day, Same Time Slot)**:
   - Advances by +24 hours to find the earliest free identical slot in the target venue.

---

## 4. Authentication & Role-Based Access Control (RBAC)

- **Session Token**: Secure, HTTP-only cookie containing verified session data (`userId`, `role`, `communityId`, `fullName`).
- **Route Protection Matrix**:

| Route Group | Audience | Auth Required | Permissions Enforced |
| :--- | :--- | :---: | :--- |
| `/` (Notice Board) | Students / Public | ❌ No | Server Component (SSR) initial hydration + interactive client filter island |
| `/lead/*` | Community Leads | ✅ Yes | Server-side layout guard + lead-scoped event proposals & status tracking |
| `/principal/*` | College Principal | ✅ Yes | Server-side layout guard + institutional approval & master schedule view |
| `/admin/*` | Campus Admins | ✅ Yes | Server-side layout guard + venues, users, and emergency event triage |
| `/api/communities` | All / Public | ❌ No | Public listing of all active campus communities |
| `/api/conflicts/check` | All / Leads | ❌ No | Real-time clash detection & 3-way safe-slot recommendations |
| `/api/auth/*` | All | ❌ No | Login, logout, current session inspection |
| `/api/admin/*` | Campus Admins | ✅ Yes | Admin-only API operations with strict Zod validation |
| `/api/lead/*` | Community Leads | ✅ Yes | Lead-scoped event mutations & proposals |

### 4.1 Transactional Concurrency Control & Double-Booking Guard

To prevent Time-of-Check to Time-of-Use (TOCTOU) race conditions when concurrent administrators or principals approve events:

1. Approval handlers execute inside an explicit PostgreSQL transaction (`withTransaction`).
2. The target event and colliding published events in the same venue are locked using `SELECT ... FOR UPDATE`.
3. If a race condition publishes a collision during triage, the transaction aborts with HTTP 409 Conflict.
4. Server-side 409 conflict checks also guard `POST /api/lead/events` and `PUT /api/lead/events/[id]`.

### 4.2 Distributed Authentication Rate Limiting

To defeat credential stuffing and brute-force attacks across ephemeral Vercel serverless functions:

1. Rate limits are tracked by client IP (prioritizing trusted `x-real-ip`) and target email key.
2. Failed login attempts execute an atomic PostgreSQL upsert (`.insert().onConflictDoUpdate().returning()`) with explicit `::timestamptz` casts:
   - Exceeding 5 failed attempts inside a 15-minute rolling window triggers an immediate 5-minute lockout (`HTTP 429` with `Retry-After: 300`).
3. An in-memory L1 cache (`Map<string, CacheEntry>`) with LRU-style eviction bounds overhead to under 1ms for benign repeated lookups while falling back to rolling-window tracking if database connectivity fluctuates.

### 4.3 Multi-Tenant Campus Boundary Enforcement

To support multi-campus readiness and prevent cross-institutional data leakage:

1. Privileged users (Admin, Principal, Vice Principal) are verified against their associated `campus_id`.
2. Requests lacking an active `campus_id` receive a hard `403 Forbidden` (`{ error: "Campus association required" }`) on Lead, Admin, and Principal API routes.
3. Database queries strictly filter by `events.campus_id = campus_id`.

---

## 5. Technology Stack & Key Packages

- **Framework**: Next.js 16.4.3 (App Router with Turbopack).
- **UI Library**: React 19.2.8.
- **Styling**: Tailwind CSS v4 (`@tailwindcss/postcss`).
- **Typography**: Inter (UI & tabular numerals) & JetBrains Mono (metrics & codes) via `next/font/google`.
- **Database & Client**: Supabase (`@supabase/supabase-js`, `@supabase/ssr`), Drizzle ORM (`drizzle-orm`), and `pg` with TCP keepAlive & 15s timeout.
- **Testing**: Vitest 5.0.5 (354 tests, 42 suites).
- **Icons & Components**: `lucide-react`, `date-fns` v4.
- **Validation**: `zod` v4.

---

## 6. Domain-Colocated Feature Slices (Vertical Slices)

To eliminate cross-cutting monoliths and avoid scattered dependencies, the presentation and application layers are organized as self-contained domain vertical slices under `src/features/`:

```
src/
├── features/
│   ├── admin/        # Views (triage, events, venues, users, audit), modals, tests, and useAdminDashboard hook
│   ├── lead/         # Proposal wizard (details, schedule, poster), modals, tests, and useLeadWorkspace hook
│   ├── principal/    # Split-view desk, triage inbox, master schedule, audit history, and rejection modal
│   ├── events/       # Calendar notice board (month, week, mini-calendar, event card), detail modal, category badge, and useNoticeBoard hook
│   ├── conflicts/    # Automated conflict prevention API client
│   ├── venues/       # Campus venue querying and mutation API client
│   └── auth/         # Session and password recovery API client
│
├── components/
│   ├── ui/           # Pure cross-cutting design system primitives (Modal, StatusBadge, NotificationBanner, EmptyState)
│   └── layout/       # Shared app shell & header (Navbar, CalendarNavControls)
│
├── lib/
│   ├── api-client.ts # Centralized typed HTTP client with error handling
│   ├── auth.ts       # Server-side auth & token verification
│   ├── db.ts         # Resilient database connection pooling with retry mechanics
│   └── validations/  # Zod schemas & inferred TypeScript contracts
│
└── app/              # Declarative Next.js App Router pages, layouts, and route handlers
```

### 6.1 Architectural Rules

1. **Vertical Slice Autonomy**: Each feature slice owns its API client functions, state hooks, presentation subcomponents, and colocated unit tests.
2. **Clean Public API (Barrels)**: Each slice exports its public interface via an `index.ts` file, preventing brittle deep-directory imports.
3. **Pure Primitives**: `src/components/` is strictly reserved for shared UI primitives (`ui/`) and layout wrappers (`layout/`). Domain-specific business logic is prohibited inside `src/components/`.
4. **Typed Central API**: Client components consume typed API methods through `src/lib/api-client.ts`, eliminating raw `fetch()` calls and duplicate type contracts.
