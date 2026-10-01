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

### Phase 1: Database Schema & Demo Seed
* **Objective**: Create clean PostgreSQL tables and seed realistic campus data for instant testability.
* **Deliverables**:
  1. SQL migration creating `campuses`, `venues`, `communities`, `users`, and `events`.
  2. Indexing for fast range lookups (`start_time`, `end_time`, `venue_id`).
  3. Seed script provisioning:
     - 1 Campus: *"Apex Institute of Technology"*.
     - 4 Venues: *Main Auditorium*, *Seminar Hall A*, *Innovation Lab*, *Open Amphitheater*.
     - 3 Communities: *Coding Club*, *Design Society*, *E-Cell*.
     - 4 Users (1 Admin, 3 Community Leads).
     - 10+ Pre-populated Events (Mix of Approved, Pending, and scheduled conflicts to test the engine).

### Phase 2: Authentication & Role Middleware
* **Objective**: Provide reliable sign-in for Admins and Leads without open public registration.
* **Deliverables**:
  1. Lightweight, secure password verification and session cookie management (`lib/auth`).
  2. Unified login route `/login` with role-aware redirection:
     - Admins $\rightarrow$ `/admin`
     - Community Leads $\rightarrow$ `/lead`
  3. Next.js middleware / layout guards preventing unauthorized route access.
  4. User navigation header showing current user info and one-click logout.

### Phase 3: Public Student Notice Board
* **Objective**: Build a visually stunning, responsive notice board and calendar for students.
* **Deliverables**:
  1. **Visual Card Feed**: Vibrant event posters with badges, dates, venues, and descriptions.
  2. **Month Calendar Grid**: Interactive days with event dots, popover previews, and day selection.
  3. **Week Timeline View**: Hour-by-hour view showcasing daily schedules.
  4. **Filter & Search Bar**: Instant filtering by search query, category, community, and time horizon ("Today", "This Week").
  5. **Event Detail Modal**: Complete details, organizer links, and calendar export:
     - Direct Google Calendar deep link.
     - `.ics` iCalendar file download.

### Phase 4: Deterministic Conflict & Safe-Slot Engine
* **Objective**: Provide real-time clash calculation and intelligent alternate slot recommendations.
* **Deliverables**:
  1. Pure TypeScript conflict engine (`lib/conflicts/engine.ts`):
     - `detectVenueClash(venueId, startTime, endTime, excludeEventId)`
     - `validateLeadTime(startTime, minDays = 7)`
     - `findSafeSlots(targetVenue, desiredStart, desiredDuration, targetCategory)`
  2. Structured conflict response schema returning clash severity, colliding event details, and 3 safe slot options.

### Phase 5: Community Lead Portal
* **Objective**: Enable community leads to propose events seamlessly under campus policies.
* **Deliverables**:
  1. Lead dashboard displaying statistics and event list with status chips (`Pending`, `Approved`, `Rejected`).
  2. Event submission modal/form with real-time feedback:
     - Enforces the 7-day prior notice rule.
     - Detects conflicts live as venue and timing are adjusted.
     - One-click application of recommended "Safe Slots".
  3. Rejection feedback viewer showing administrative notes.

### Phase 6: Admin Management Console
* **Objective**: Provide administrators full control over events, users, and campus venues.
* **Deliverables**:
  1. **Triage Console**: Review pending events with one-click Approve or Reject (with feedback note).
  2. **User Management (CRUD)**: Table of Leads and Admins with "Add User" modal and role assignment.
  3. **Venue Management (CRUD)**: Table of campus venues with capacity and active status toggling.
  4. **Manual Override**: Ability for admins to force-schedule or adjust event slots if an exception is warranted.

### Phase 7: Verification & Final Polish
* **Objective**: Ensure complete system stability, test coverage, and aesthetic excellence.
* **Deliverables**:
  1. Verification of all user journeys: Student browsing, Lead submitting, Admin approving.
  2. Production build validation (`pnpm build`) and lint checks (`pnpm lint`).
  3. Responsive UI audit across mobile, tablet, and desktop viewports.

---

## 3. Seed Credentials & Test Accounts

| Role | Name | Email | Password | Assigned Community |
| :--- | :--- | :--- | :--- | :--- |
| **Admin** | Campus Dean of Affairs | `admin@campus.edu` | `admin123` | *All (Campus-wide)* |
| **Lead** | Alex Chen (Coding Club) | `lead.coding@campus.edu` | `lead123` | *Coding Club* |
| **Lead** | Sarah Lin (Design Society) | `lead.design@campus.edu` | `lead123` | *Design Society* |
| **Lead** | Marcus Vance (E-Cell) | `lead.ecell@campus.edu` | `lead123` | *E-Cell* |
| **Student** | Public Visitor | *No login needed* | *N/A* | *Public access* |
