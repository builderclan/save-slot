# SaveSlot — Development & Rebuild Plan (`v1.0.0`)

## 1. Where We Are Coming From: `v0.3.0` POC (Completed)

The `v0.3.0` Proof of Concept proved out the core scheduling UI and technical stack (Next.js 16, React 19, Tailwind v4, Drizzle ORM, Supabase PostgreSQL, Vitest):

- [x] **POC Phases 1–2:** Initial database schema (`campuses`, `venues`, `communities`, `users`, `events`), cookie auth, and persistent login rate-limiting.
- [x] **POC Phases 3–4:** Public Student Notice Board (Month, Week, Board, `.ics` / Google Cal export) and the Safe-Slot Conflict Engine (`src/lib/conflicts/engine.ts`).
- [x] **POC Phases 5–7:** Community Lead proposal wizard, Principal/VP single-step desk (`/principal`), Admin CRUD console, and automated Vitest + build checks.

---

## 2. Rebuild Plan (`v1.0.0` Full College System)

> **Deployment & Database Model:** Each college runs its own independent app host and dedicated PostgreSQL database (not a shared multi-tenant SaaS DB). Dev and production launches for `v1.0.0` start from a clean schema reset using `scripts/migrate.js`, **dropping `campuses` and all `campus_id` foreign keys** in favor of a single-row `college_settings` table.

### Phase 1: Schema, Roles & Admin Setup

- **Goal:** Put the new data model in place and separate IT setup from event approvals.

- **Deliverables:**
  - [ ] Fresh `v1.0.0` SQL migrations and Drizzle schema (`src/db/schema/*`): `college_settings` (replaces `campuses`), `departments`, updated `communities` (`scope`, `code`), expanded `users`, updated `events`, `event_stage2_approvals`, `event_approvals`, `event_mentors`, `event_reports`, `event_reference_counters`, and `notifications` (removing `campus_id` across tables, queries, and RLS).
  - [ ] Effective-role auth helpers (`src/lib/auth.ts`) so faculty (`staff`) assigned as `tic` or active `acting_hod` automatically unlock those desks without needing duplicate logins.
  - [ ] Admin Console (`/admin`) updates: College Settings (name, prefix, letterhead, logo), Departments CRUD (`ECE`, `EEE`, `CSE`, `AI`, `ME`, `CE`), Internal/External Communities CRUD (also accessible to P/VP), multi-TIC & Dept Staff/Student Coordinator assignments, emergency Acting HOD toggle, and **removal of all event approval actions from Admin**.
  - [ ] Clean `v1.0.0` seed script (`scripts/seed.js`) covering all 7 roles plus an Acting HOD test scenario.

### Phase 2: Multi-Stage Approvals, Overrides & Notifications

- **Goal:** Build the three event origins, parallel co-host sign-offs, soft/hard venue holds, and the overdue closure block.

- **Deliverables:**
  - [ ] Unified Proposer Workspace (`/lead` & `/staff`): Origin selector (`Community` / `Department`), Joint Co-Host picker, Planned Mentors + Estimated Budget fields, immediate post-`end_time` overdue report block, and edit/resubmit flow for rejected proposals.
  - [ ] Stage 2 Desks (`/hod` & `/tic`): Parallel Stage 2 approval/rejection queues, HOD self-toggle for Acting HOD mode, and mandatory rejection feedback.
  - [ ] Updated Safe-Slot Engine (`src/lib/conflicts/engine.ts`): Treat `pending_stage2` and `pending_executive` as soft reservations (blocked in conflict checks, hidden from `/`).
  - [ ] Executive Desk (`/principal`): Stage 3 approval/rejection, direct College Event creation (auto-published, optional Staff coordinator assignment), explicit 7-day lead-time override with warning confirmation, College-event collision override (`needs_reschedule` bump), and emergency Acting HOD toggle.
  - [ ] In-App Notification Inbox (`notifications` table + header bell; WhatsApp left behind an interface on the roadmap).

### Phase 3: Closure Reports, Reference Numbers & Printable Dossiers

- **Goal:** Replace physical paper slips and manual Excel registers with verified closure reports, AISAT reference codes, A4 printouts, and QR verification.

- **Deliverables:**
  - [ ] Atomic Reference Number generator (`AISAT/<YYYY-YY>/<HOST_CODE>/<NNN>`) running inside final P/VP approval with July 1 – June 30 academic year rollover.
  - [ ] Post-Event Closure Form (`event_reports` + confirmed `event_mentors`: Internal/External, Role, Company; Total Fund Used; Student/Faculty/External counts; NAAC/NBA summary & outcomes) + HOD/TIC/P-VP quick-verification queue (`pending_report_verification` $\rightarrow$ `completed`).
  - [ ] A4 Print-CSS Individual Event Dossier (`/reports/events/[id]`): AISAT letterhead, full timestamped `event_approvals` log, mentor & fund tables, *"Electronically Approved via SaveSlot — No Physical Signature Required"* stamp, and vector QR code.
  - [ ] Consolidated Register (`/reports/summary`): Filterable by Academic Year, Date Range, Origin, Community Scope, Department, and Status, with A4 print view and CSV export.
  - [ ] Public QR Verification (`/verify/[code]`): Read-only authenticity page displaying Ref No, Title, Date, Venue, Origin, Approval Chain Names + Timestamps, and Status—while hiding funds, rejection notes, and personal contacts.

### Phase 4: Public Notice Board Refresh & Full QA

- **Goal:** Bring the new origins and filters to `/` and verify everything end-to-end.

- **Deliverables:**
  - [ ] Public Notice Board (`/`) filters for Origin (`College`, `Department`, `Community - Internal`, `Community - External`), Department (`CSE`, `ECE`, `EEE`, `AI`, `ME`, `CE`), Category, and Search, plus Internal/External badges.
  - [ ] Responsive UI check across 360px mobile & 1280px desktop, plus browser Print-to-PDF check on A4 dossiers.
  - [ ] Full unit, workflow, and integration tests + `pnpm validate` (`db:migrate:check`, `typecheck`, `lint`, `test`, `build`).

---

## 3. Target Seed Accounts (`v1.0.0`)

| Role | Assignment | Purpose in Dev Seed |
| :--- | :--- | :--- |
| **`admin`** | Campus IT / Ops | Sets up Departments, Communities, Venues, Users; emergency Acting HOD toggle |
| **`principal`** & **`vice_principal`** | AISAT Executive | Final Stage 3 approval, College events, overrides, full printable reports |
| **`hod`** | CSE, AI, ECE, EEE, ME, CE | Stage 2 Dept approval, Acting HOD self-toggle, closure verification |
| **`staff`** *(+ Acting HOD)* | CSE Faculty | Proposes Dept events; steps in as Acting HOD when toggled active |
| **`tic`** | Internal & External Communities | Stage 2 Community approval (multi-community & multi-TIC) + closure verification |
| **`lead`** | Community Leads & Dept Student Coordinators | Proposes Community, Dept, or Joint events; files post-event closure reports |
| **Public** | Unauthenticated | Zero-login Notice Board (`/`) & QR Verification (`/verify/[code]`) |
