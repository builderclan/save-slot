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
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'lead')),
    community_id UUID REFERENCES communities(id) ON DELETE SET NULL, -- Null for admins
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
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
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

* **Session Token**: Secure, HTTP-only cookie containing verified session data (`userId`, `role`, `communityId`, `fullName`).
* **Route Protection Matrix**:

| Route Group | Audience | Auth Required | Permissions Enforced |
| :--- | :--- | :---: | :--- |
| `/` (Notice Board) | Students / Public | ❌ No | Public read of `approved` events |
| `/calendar` | Students / Public | ❌ No | Public calendar grid & list |
| `/events/[id]` | Students / Public | ❌ No | Public event detail view |
| `/lead/*` | Community Leads | ✅ Yes | Can view/edit own community events; submit new events |
| `/admin/*` | Campus Admins | ✅ Yes | Full access: approve/reject, CRUD users, venues, events |
| `/api/auth/*` | All | ❌ No | Login, logout, current session inspection |
| `/api/admin/*` | Campus Admins | ✅ Yes | Admin-only API operations |
| `/api/lead/*` | Community Leads | ✅ Yes | Lead-scoped event mutations |

---

## 5. Technology Stack & Key Packages

* **Framework**: Next.js 16.3.5 (App Router with Turbopack).
* **UI Library**: React 19.2.8.
* **Styling**: Tailwind CSS v4 (`@tailwindcss/postcss`).
* **Database & Client**: Supabase (`@supabase/supabase-js`, `@supabase/ssr`, `pg`).
* **Icons & Components**: `lucide-react`, `date-fns` v4.
* **Validation**: `zod` v4.
