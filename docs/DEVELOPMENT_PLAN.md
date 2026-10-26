# Phased Development & Implementation Plan

## 1. Roadmap Overview

```
Phase 1: Database & Seed Layer
   └── PostgreSQL Schema, Supabase Client & Pre-seeded Demo Data
Phase 2: Authentication & RBAC Layer
   └── Secure Cookie Sessions, Login Page & Role Guard Middleware
Phase 3: Public Student Notice Board
   └── Visual Card Feed, Month Grid, Week View, Search, Filters & ICS Export
Phase 4: Deterministic Safe-Slot & Conflict Engine
   └── Overlap Detection, 7-Day Rule Validator & 3-Way Alternative Slot Generator
Phase 5: Community Lead Portal
   └── Dashboard, Event Submission Form with Live Clash Previews & Status Tracking
Phase 6: Admin Management Console
   └── Review & Triage Queue, User CRUD, Venue CRUD & Emergency Override
Phase 7: End-to-End Testing & Polish
   └── Production Build Validation, Cross-role User Journeys & Responsive Polish
```

---

## 2. Phase Breakdown

### Phase 1: Database Schema & Demo Seed (Completed)

* **Objective**: Create clean PostgreSQL tables and seed realistic campus data for instant testability.
* **Deliverables**:
  * [x] 1. SQL migration creating `campuses`, `venues`, `communities`, `users`, `events`, and `community_members`.
  * [x] 2. Indexing for fast range lookups (`start_time`, `end_time`, `venue_id`, `target_audience`).
  * [x] 3. Seed script provisioning:
    * 1 Campus: *"Albertian Institute of Science & Technology (AISAT)"*.
    * 4 Venues: *Turing Auditorium*, *Seminar Hall A*, *Innovation Lab 201*, *Central Quad Pavilion*.
    * 3 Communities: *Coding Club*, *Design Society*, *E-Cell*.
    * 6 Users (1 Principal, 1 Vice Principal, 1 Admin, 3 Community Leads).
    * 10+ Pre-populated Events (Mix of Approved, Pending, and scheduled conflicts to test the engine).

### Phase 2: Authentication & Role Middleware (Completed)

* **Objective**: Provide reliable sign-in for Executives, Admins, and Leads without open public registration.
* **Deliverables**:
  * [x] 1. Lightweight, secure password verification and session cookie management (`lib/auth`).
  * [x] 2. Unified login route `/login` with role-aware redirection:
    * College Principal & Vice Principal $\rightarrow$ `/principal`
    * Admins $\rightarrow$ `/admin`
    * Community Leads $\rightarrow$ `/lead`
  * [x] 3. Next.js middleware / layout guards preventing unauthorized route access.
  * [x] 4. User navigation header showing current user info and one-click logout.

### Phase 3: Public Student Notice Board (Completed)

* **Objective**: Build a visually stunning, responsive notice board and calendar for students.
* **Deliverables**:
  * [x] 1. **Visual Card Feed**: Vibrant event posters with badges, dates, venues, and descriptions.
  * [x] 2. **Month Calendar Grid**: Interactive days with event dots, popover previews, and day selection.
  * [x] 3. **Week Timeline View**: Hour-by-hour view showcasing daily schedules.
  * [x] 4. **Board View**: Category swimlanes for high-level campus scanning.
  * [x] 5. **Filter & Search Bar**: Instant filtering by search query, category, community, and time horizon ("Today", "This Week").
  * [x] 6. **Event Detail Modal**: Complete details, organizer links, and calendar export:
    * Direct Google Calendar deep link.
    * `.ics` iCalendar file download.

### Phase 4: Deterministic Conflict & Safe-Slot Engine (Completed)

* **Objective**: Provide real-time clash calculation and intelligent alternate slot recommendations.
* **Deliverables**:
  * [x] 1. Pure TypeScript conflict engine (`lib/conflicts/engine.ts`):
    * `detectVenueClash(venueId, startTime, endTime, excludeEventId)`
    * `validateLeadTime(startTime, minDays = 7)`
    * `findSafeSlots(targetVenue, desiredStart, desiredDuration, targetCategory)`
  * [x] 2. Structured conflict response schema returning clash severity, colliding event details, and 3 safe slot options.

### Phase 5: Community Lead Portal (Completed)

* **Objective**: Enable community leads to propose events seamlessly under campus policies.
* **Deliverables**:
  * [x] 1. Lead dashboard displaying statistics and event list with status chips (`Pending`, `Approved`, `Rejected`).
  * [x] 2. Event submission modal/form with real-time feedback:
    * Enforces the 7-day prior notice rule.
    * Detects conflicts live as venue and timing are adjusted.
    * One-click application of recommended "Safe Slots".
  * [x] 3. Rejection feedback viewer showing administrative notes.

### Phase 6: Admin Management Console (Completed)

* **Objective**: Provide administrators full control over events, users, and campus venues.
* **Deliverables**:
  * [x] 1. **Triage Console**: Review pending events with one-click Approve or Reject (with feedback note).
  * [x] 2. **User Management (CRUD)**: Table of Leads and Admins with "Add User" modal and role assignment.
  * [x] 3. **Venue Management (CRUD)**: Table of campus venues with capacity and active status toggling.
  * [x] 4. **Manual Override**: Ability for admins to force-schedule or adjust event slots if an exception is warranted.

### Phase 7: Verification & Final Polish (Completed)

* **Objective**: Ensure complete system stability, test coverage, and aesthetic excellence.
* **Deliverables**:
  * [x] 1. Verification of all user journeys: Student browsing, Lead submitting, Admin approving, Principal triaging.
  * [x] 2. Production build validation (`pnpm build`) and lint checks (`pnpm lint`).
  * [x] 3. Vitest test coverage: 42 suites, 354 unit & integration tests passing.
  * [x] 4. Responsive UI audit across mobile, tablet, and desktop viewports.

---

## 3. Seed Credentials & Test Accounts

| Role | Name | Email | Password | Assigned Community |
| :--- | :--- | :--- | :--- | :--- |
| **Principal** | Dr. K. S. Mathew (Principal) | `principal@campus.edu` | `principal123` | Institutional Authority |
| **Vice Principal** | Dr. Sarah Varghese | `viceprincipal@campus.edu` | `viceprincipal123` | Institutional Authority |
| **Admin** | Campus Dean of Affairs | `admin@campus.edu` | `admin123` | *All (Campus-wide)* |
| **Lead** | Alex Chen (Coding Club) | `lead.coding@campus.edu` | `lead123` | *Coding Club* |
| **Lead** | Sarah Lin (Design Society) | `lead.design@campus.edu` | `lead123` | *Design Society* |
| **Lead** | Marcus Vance (E-Cell) | `lead.ecell@campus.edu` | `lead123` | *E-Cell* |
| **Student** | Public Visitor | *No login needed* | *N/A* | *Public access* |
