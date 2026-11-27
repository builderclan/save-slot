# SaveSlot v1.0.0 — REST API Reference

**System:** SaveSlot REST API  
**Version:** `1.0.0` *(Target API Contract — Planned Rebuild from `v0.3.0` POC)*  
**Protocol:** HTTPS / JSON  
**Auth:** HTTP-Only Cookie (`saveslot_session`)  
**Validation:** Zod 4  

---

## 1. Conventions & Status Codes

All routes sit under `/api/*`, validate inputs with Zod, and serve a dedicated single-college instance (no multi-tenant `campus_id` routing).

| Status | Meaning | When It Happens |
| :--- | :--- | :--- |
| `200 OK` | Success | Read, update, approval, report submission, or login |
| `201 Created` | Created | New event proposal, department, community, venue, or user |
| `400 Bad Request` | Validation error | Malformed JSON, Zod error, or invalid state transition |
| `401 Unauthorized` | Not signed in | Missing or expired session cookie |
| `403 Forbidden` | Blocked / Not allowed | Wrong role, or **overdue post-event report block** |
| `404 Not Found` | Missing | Target record does not exist |
| `409 Conflict` | Clash / Race condition | Soft/hard venue overlap or `FOR UPDATE` collision |
| `429 Too Many Requests` | Rate limited | 5 failed login attempts in 15 minutes |

---

## 2. Public Endpoints (No Login Required)

### 2.1 `GET /api/events`

Returns `published` and `completed` events for the student notice board.

- **Query Params:** `origin_type` (`community | department | college`), `community_scope` (`internal | external`), `department_id`, `community_id`, `category`, `start`, `end`, `search`, `limit` (default `50`, max `100`), `offset`.
- **Privacy:** Never returns `draft`, `pending_*`, `rejected`, `needs_reschedule`, or budget/fund fields.

### 2.2 `GET /api/departments`, `GET /api/communities`, `GET /api/venues`

- `GET /api/departments`: Active departments (`id`, `name`, `code`).
- `GET /api/communities`: Active communities (`id`, `name`, `slug`, `code`, `scope`, `category`, `logo_url`).
- `GET /api/venues`: Active campus venues (`id`, `name`, `building`, `capacity`).

### 2.3 `GET /api/verify/[code]`

Public QR verification lookup by `reference_number` (e.g. `AISAT/2026-27/CSE/014`, URL-encoded) or `event.id`.

- **Returned:** `referenceNumber`, `title`, `originType`, `communityScope`, `hosts` (primary + co-hosts), `venue`, `startTime`, `endTime`, `status`, `isLeadTimeOverridden`, and `approvalChain` (`stage`, `action`, `actorName`, `actorRole`, `timestamp`).
- **Hidden:** Estimated/actual funds, rejection reasons, and personal emails or phone numbers.

### 2.4 `POST /api/conflicts/check`

Checks soft (`pending_stage2`, `pending_executive`) and hard (`published`) venue overlaps, target audience overlaps, and the 7-day advance notice policy. Returns up to 3 `SafeSlotSuggestion` alternatives.

---

## 3. Authentication (`/api/auth/*`)

- `POST /api/auth/login`: Email + password sign-in protected by `auth_rate_limits`.
- `POST /api/auth/logout`: Clears `saveslot_session`.
- `GET /api/auth/me`: Returns current user profile, `departmentId`, assigned `communities`, and effective permissions (`isActingHod`, `isFic`, etc.).
- `POST /api/auth/reset-password/request` & `POST /api/auth/reset-password/confirm`: Self-service password reset for Admin-provisioned accounts.

---

## 4. Proposer Workspace (`/api/workspace/*`)

*For `lead`, `staff`, and `principal`/`vice_principal` (for `college` events or assigned closures).*

### 4.1 `GET /api/workspace/events`

Lists proposals created by the caller or belonging to their Community/Department, including soft-reserved status, co-host approval progress, rejection feedback, and `overdueReports` (any `published` event owned or coordinated by the user whose `end_time < now()` lacks an `event_reports` row).

### 4.2 `POST /api/workspace/events`

Creates a `draft` or submits straight to `pending_stage2` (or `published` if P/VP creates a `college` event).

- **Overdue Gate (`403`):** Blocks `lead` and `staff` from submitting new proposals whenever `overdueReports.length > 0`.
- **Key Payload Fields:** `originType`, `primaryDepartmentId` / `primaryCommunityId`, `coHosts` (`[{ entityType, id }]`), `mentors` (`[{ name, roleTitle, organization, mentorType }]`), `estimatedBudget`, `fundingSource`, `coordinatorId` *(optional for College events)*.

### 4.3 `PUT /api/workspace/events/[id]` & `POST /api/workspace/events/[id]/submit`

- `PUT`: Edits a `draft`, `rejected`, or `needs_reschedule` proposal.
- `POST .../submit`: Submits a saved `draft` or resubmits a `rejected`/`needs_reschedule` event—resetting all `event_stage2_approvals` rows to `pending` and logging `submitted` in `event_approvals`. (Subject to the Overdue Gate and Safe-Slot check.)

### 4.4 `POST /api/workspace/events/[id]/cancel` & `DELETE /api/workspace/events/[id]`

- `DELETE`: Removes unapproved (`draft` / `rejected`) proposals.
- `POST .../cancel`: Cancels an upcoming `published` event with a mandatory `cancellationReason` (logs audit entry and releases the venue lock).

### 4.5 `POST /api/workspace/events/[id]/report`

Submits the post-event NAAC/NBA closure report (`event_reports` + confirmed `event_mentors`) once `now() > end_time`.

- Transitions `published` $\rightarrow$ `pending_report_verification` (for Community, Dept, and Staff-coordinated College events), or directly to `completed` when submitted by P/VP for a College event.

---

## 5. Stage 2 Desks (`/api/hod/*` & `/api/fic/*`)

### 5.1 Department HOD (`/api/hod/*`)

*Accessible to the department's `hod_user_id`, or `acting_hod_user_id` while `is_acting_hod_active = true`.*

- `GET /api/hod/queue`: Dept & Joint events in `pending_stage2` or `pending_report_verification` needing this department's action.
- `POST /api/hod/events/[id]/approve` & `POST /api/hod/events/[id]/reject`: Records sign-off on `event_stage2_approvals` + `event_approvals`; advances to `pending_executive` only when every required co-host has approved.
- `PATCH /api/hod/events/[id]/report/verify`: Quick-verifies closure report (locks `completed` once all participating hosts verify) or returns it for revision (`request_revision`).
- `PATCH /api/hod/acting-hod`: Lets the primary HOD toggle `is_acting_hod_active` on/off when going on leave.

### 5.2 Community Faculty-in-Charge (`/api/fic/*`)

*Accessible to users assigned as `fic` on the community in `community_members`.*

- `GET /api/fic/queue`: Assigned Community & Joint events awaiting Stage 2 approval or closure report verification.
- `POST /api/fic/events/[id]/approve`, `POST /api/fic/events/[id]/reject`, `PATCH /api/fic/events/[id]/report/verify`.

---

## 6. Executive Desk (`/api/principal/*`)

*Requires `principal` or `vice_principal`.*

- `GET /api/principal/queue`: Pending executive approvals, decision history, College events, and master campus schedule.
- `POST /api/principal/events/[id]/approve`:
  - Runs inside `db.transaction` with `SELECT ... FOR UPDATE` on venue & colliding events.
  - Accepts `overrideLeadTime: true` + `overrideReason` if within 7 days.
  - Atomically increments `event_reference_counters` (`AISAT/YYYY-YY/CODE/NNN`), writes `event_approvals`, and sets status to `published`.
- `POST /api/principal/events/[id]/reject`: Mandatory `rejectionReason`; sets status to `rejected`.
- `POST /api/principal/college-events`: Creates and auto-publishes a `college` event (supports 7-day override, optional `coordinatorId`, and `forceRescheduleEventIds` to bump colliding Dept/Community events to `needs_reschedule`).
- `PATCH /api/principal/events/[id]/report/verify`: Verifies closure reports submitted by Staff coordinators for `college` events or final executive report verification.
- `POST /api/principal/communities`: Allows P/VP to add Internal/External communities.
- `PATCH /api/principal/departments/[id]/acting-hod`: Emergency Acting HOD toggle.

---

## 7. Admin IT & Operations (`/api/admin/*`)

*Requires `admin`. **No event approval or rejection endpoints live here.***

- `GET / PATCH /api/admin/settings`: Update `college_settings` (college name, `short_code` prefix, letterhead subtitle, logo URL, academic year start month).
- `GET / POST / PATCH / DELETE /api/admin/departments`: Manage departments (`CSE`, `ECE`, `EEE`, `AI`, `ME`, `CE`), assign `hod_user_id` & `acting_hod_user_id`, and emergency `is_acting_hod_active` toggle.
- `GET / POST / PATCH /api/admin/communities` & `POST / DELETE /api/admin/communities/[id]/members`: Manage Internal/External communities (`scope`, `code`) and link `lead` / `fic` users.
- `GET / POST / PATCH /api/admin/venues`: Campus venue CRUD.
- `GET / POST / PATCH / DELETE /api/admin/users`: Create and manage staff/lead/approver accounts (`role`, `department_id`, `designation`).

---

## 8. Reports & Notifications

### 8.1 Reports & Closure (`/api/reports/*`, `/api/workspace/events/[id]/report`, `/api/verify/[code]`)

*Scoped by role: P/VP (all campus), HOD (department events), FIC (assigned communities), Lead/Staff (own events).*

- `GET / POST /api/workspace/events/[id]/report`: Load or submit post-event NAAC/NBA closure report + confirmed mentors. Transitions `published` → `pending_report_verification` (or `completed` directly for college events closed by P/VP).
- `PATCH /api/fic/events/[id]/report/verify`: FIC report verification (`decision`: `verify` | `request_revision`, optional `remarks`).
- `PATCH /api/hod/events/[id]/report/verify`: HOD report verification (`decision`: `verify` | `request_revision`, optional `remarks`).
- `PATCH /api/principal/events/[id]/report/verify`: Executive report verification; marks event `completed`.
- `GET /api/reports/events/[id]`: Full dossier payload (metadata, mentors, estimated vs. actual funds, NAAC/NBA summary, chronological `event_approvals`, QR verify URL).
- `GET /api/reports/summary`: Consolidated register filtered by `academicYear`, `startDate`, `endDate`, `originType`, `communityScope`, `departmentId`, `status`, `search`; supports `?format=csv`.
- `GET /api/verify/[code]`: Public unauthenticated QR verification endpoint returning reference metadata & approval trail (no funds, rejection notes, or personal contacts).

### 8.2 Notifications (`/api/notifications/*`)

- `GET /api/notifications`: User's in-app notifications + unread badge count.
- `PATCH /api/notifications/[id]/read` & `POST /api/notifications/read-all`: Mark notifications read.
