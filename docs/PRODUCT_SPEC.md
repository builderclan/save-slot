# SaveSlot v1.0.0 — Product Specification

**Product:** SaveSlot — College Event Scheduling, Approval & NAAC/NBA Reporting  
**College:** Albertian Institute of Science & Technology (AISAT) *(Dedicated Single-College Host & DB)*  
**Version:** `1.0.0` *(Full-System Spec — Rebuilt from the `v0.3.0` POC)*  
**Academic Year:** July 1 – June 30  

---

## 1. Why We Are Rebuilding

The `v0.3.0` POC proved out the public student notice board and the venue conflict checker, and the college loved it. Now they want to replace all paper slips, scattered WhatsApp threads, and manual spreadsheets across AISAT with one digital workflow.

To run the whole college on SaveSlot, `v1.0.0` expands the POC in five practical ways:

1. **Three Event Origins:** Separate workflows for **Community** events (both internal clubs and outside organizations), **Department** events (`ECE`, `EEE`, `CSE`, `AI`, `ME`, `CE`, etc.), and **College** events (Annual Day, Sports Day, Convocation).
2. **Multi-Stage & Joint Approvals:** Events route through the right people—Faculty-in-Charge or HOD first, then Principal or Vice Principal—and co-hosted events wait for every participating host to sign off.
3. **Soft vs. Hard Venue Holds:** Pending requests hold a slot privately so nobody else double-books it, while only Principal/VP-approved events appear on the public notice board.
4. **Post-Event Closure Reports:** Once an event ends, organizers must log attendance, mentors/resource persons, and total funds used before they can propose another event.
5. **Printable Filing & QR Verification:** Every approved event gets a formal AISAT reference number (`AISAT/2026-27/CSE/014`), an A4 print-ready dossier for physical NAAC/NBA files, and a QR code anyone can scan to verify authenticity.

---

## 2. Scheduling & Conflict Rules ("Safe Slot")

1. **Soft Reservations (`pending_stage2`, `pending_executive`):** While an event is waiting for approval, its venue and time are soft-reserved. Other organizers cannot book that slot, and approvers can see the hold, but students browsing `/` do not see unapproved events.
2. **Hard Reservations (`published`):** Once the Principal or Vice Principal approves (or creates a College event), the slot locks permanently and goes live on the public notice board.
3. **7-Day Advance Notice:** Community and Department events must be submitted at least 7 days ahead. The Principal or Vice Principal can override this rule if needed—the system shows a clear warning first and records the override in the audit log.
4. **College Event Priority:** When the Principal or VP schedules a College-wide event that overlaps existing Community or Department bookings, they can bump the conflicting events (`needs_reschedule`) and notify those organizers to pick a new slot.

---

## 3. People, Accounts & Permissions

Students browse the public notice board and verify QR codes **without logging in**. Accounts are created by Admin (email + password, with self-service password reset) only for staff, leads, and approvers.

| Role | Who They Are | What They Can Do | Guardrails |
| :--- | :--- | :--- | :--- |
| **`admin`** | Campus IT / Operations | Manage Departments, Communities (Internal/External), Venues, and User accounts; assign HODs, Acting HODs, FICs, Staff, and Leads; flip the emergency Acting HOD toggle; configure campus settings. | **Cannot approve or reject events.** Keeps IT setup separate from college governance. |
| **`principal`** / **`vice_principal`** | Executive Leadership | Give final approval (or reject) for Community, Dept, and Joint events; create and auto-publish College events; assign a Staff coordinator to close out College events; override the 7-day rule or bump conflicting events; create Communities; view/print all reports; emergency Acting HOD toggle. | Either Principal or VP can act—whichever reviews it first completes the executive step. Exempt from overdue report blocks. |
| **`hod`** *(+ Acting HOD)* | Department Head | Stage 2 approval/rejection for Department and Joint events; quick-verify post-event reports; toggle **Acting HOD** mode on/off themselves when going on leave; print Department reports. | Scoped to their own Department. |
| **`fic`** | Faculty-in-Charge | Stage 2 approval/rejection for assigned Community and Joint events; quick-verify post-event reports; print assigned Community reports. One FIC can oversee multiple communities, and a community can have multiple FICs. | Scoped to assigned Communities. *(Note: a Staff faculty member can also hold FIC or Acting HOD duties without needing a second account.)* |
| **`staff`** | Department Faculty | Propose Department or Joint events; edit or delete rejected proposals; submit post-event NAAC/NBA closure reports and funds used (including assigned College events). | Blocked from proposing new events if any past event has an unsubmitted closure report. |
| **`lead`** | Community Lead or Dept Student Coordinator | Propose events for their Community or Department (including Joint events); see soft-reserved slots; edit/delete rejected proposals; submit post-event reports. | Blocked from proposing new events if any past event has an unsubmitted closure report. |
| **Public** | Students & Visitors | Browse `/` (Month, Week, Board), filter by Origin/Dept/Community/Category, export `.ics` or Google Calendar, verify printed sheets at `/verify/[code]`. | No login needed; cannot see drafts, soft holds, or financial/rejection details. |

---

## 4. Event Types & Approval Chains

### 4.1 Event Origins

1. **Community (`community`)**
   - Tagged as either **`internal`** (college clubs/societies) or **`external`** (outside organizations visiting campus). Both labels are clearly shown on the UI and printed reports.
   - Communities are added and managed by Admin or Principal/VP.
   - **Flow:** `Lead` $\rightarrow$ `Faculty-in-Charge (any assigned FIC)` $\rightarrow$ `Principal / VP`

2. **Department (`department`)**
   - Belongs to an academic department (`ECE`, `EEE`, `CSE`, `AI`, `Mechanical`, `Civil`, or any department added by Admin).
   - **Flow:** `Staff / Dept Student Coordinator` $\rightarrow$ `HOD (or active Acting HOD)` $\rightarrow$ `Principal / VP`

3. **College (`college`)**
   - Institutional events like Annual Day, Sports Day, or Convocation.
   - Created directly by **Principal** or **Vice Principal** and **auto-published immediately**.
   - P/VP can assign a **Staff Coordinator** who handles the post-event NAAC/NBA closure report afterward.

4. **Joint / Co-Hosted Events**
   - One primary host (Department or Community) initiates the proposal and tags one or more co-hosts (e.g., `CSE` hosting with `AI`, or a `Community` hosting with `CSE`).
   - **Reference Number Prefix:** Uses the primary initiating host's code (e.g., `AISAT/2026-27/CSE/014`).
   - **Parallel Sign-Off:** Every participating host must approve Stage 2 (`CSE HOD` **and** `AI HOD`, or `FIC` **and** `HOD`) before the proposal moves to Principal/VP. If any one approver rejects, the whole proposal returns to `rejected`.
   - **Parallel Closure Verification:** After the event, every participating host's HOD/FIC must verify the post-event report before it locks as `completed`.

### 4.2 Event Lifecycle States

- `draft`: Saved, not yet submitted.
- `pending_stage2`: Submitted for Stage 2 review; venue is soft-reserved.
- `pending_executive`: All Stage 2 approvers signed off; waiting on Principal or VP (still soft-reserved).
- `published`: Approved by P/VP (or created as a College event). Reference number generated; venue hard-locked; live on `/`.
- `needs_reschedule`: Bumped by a College-level event; organizer must pick a new time/venue and resubmit.
- `rejected`: Returned by Stage 2 or Executive with a mandatory reason. The organizer can delete it or edit and resubmit (restarting from Stage 2).
- `cancelled`: Withdrawn by the organizer or cancelled by P/VP.
- `pending_report_verification`: Event ended and organizer submitted the post-event report; waiting for HOD/FIC (or P/VP for College events) to verify.
- `completed`: Closure report verified and locked for physical filing.

---

## 5. Pre-Event Proposals & Post-Event NAAC/NBA Reports

### Phase 1 — Before the Event (Proposal)

- Event basics: Title, Description, Origin, Primary Host + Co-hosts, Category, Target Audience, Venue & Time, Cover Poster, Registration URL.
- **Planned Mentors / Resource Persons:** Name, Role/Designation, Organization/Company, and whether they are `Internal` or `External`.
- **Estimated Budget:** Planned amount (INR) and Funding Source (`College Fund`, `Department Fund`, `Sponsor / External`, `Self-Funded`, `No Cost`).

### Phase 2 — After the Event (Closure Report)

- **Immediate Submission Gate:** As soon as an event's `end_time` passes, its organizer (`Lead` or `Staff`) cannot submit any new event proposals until they file the overdue post-event report. *(Principal and VP are exempt.)*
- **What Gets Recorded:**
  - Confirmed Mentors / Resource Persons (Name, Role, Company/Organization, Internal/External).
  - **Total Fund Used:** Final spending figure (INR), Funding Source, and brief notes *(no bill uploads needed in `v1.0.0`; itemized billing will be reviewed later with college finance)*.
  - Attendance counts: Students, Faculty, and External guests.
  - NAAC/NBA Summary, Outcomes, and optional link to photos or attendance sheets.
- **Verification:** Submitting moves the event to `pending_report_verification`. Required HODs/FICs (or P/VP if a Staff coordinator closes a College event) verify and lock it as `completed`. If P/VP closes a College event directly, it moves straight to `completed`.

---

## 6. Reference Numbers, Printable Filing & QR Verification

1. **Reference Numbers (`AISAT/2026-27/CSE/014`):**
   - Academic year runs **July 1 – June 30**.
   - Numbers are generated **only when P/VP grants final approval** (or creates a College event), so rejected or deleted drafts never leave gaps.
   - The sequential counter (`001`, `002`, ...) resets per **primary host code per academic year**.
2. **Individual Event Dossier (`/reports/events/[id]`):**
   - Clean A4 print layout (`Save as PDF` or direct print) showing the AISAT header, Reference Number, Origin & Internal/External label, Venue & Schedule, Mentors table, Estimated vs. Actual Funds Used, Attendance, NAAC/NBA Summary, and the full **Timestamped Approval Log** (Stage, Person, Role/Acting HOD note, Exact Timestamp, Remarks, Rule Overrides).
   - Bottom stamp: *"Electronically Approved via SaveSlot — No Physical Signature Required"* alongside a QR code pointing to `/verify/[code]`.
3. **Consolidated Register (`/reports/summary`):**
   - Filterable by Academic Year, Date Range, Origin, Internal/External Community, Department, and Status, with totals (Events, Participants, Funds Used), A4 print table, and CSV export.
4. **Public QR Verification (`/verify/[code]`):**
   - Anyone scanning the printed QR code sees: Reference Number, Title, Date/Time, Venue, Origin & Host(s), Approval Chain (Names, Roles, Timestamps), and Status.
   - Financial numbers, rejection remarks, and personal contact details are **never** shown publicly.

---

## 7. Notifications & Technical Targets

- **In-App Inbox (`v1.0.0`):** Real-time notifications for pending approvals, rejections, bumped slots, Acting HOD toggles, and overdue closure reports.
- **WhatsApp (Roadmap TODO):** Kept out of `v1.0.0` due to messaging cost, behind a clean notification interface for easy plug-in later.
- **Reliability & UX:** Fast SSR notice board (`/`), clean 360px mobile & 1280px desktop layouts, transactional double-booking locks, and login rate-limiting.
