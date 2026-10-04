# Campus Notice Board & Safe-Slot Calendar SaaS — Product Specification

## 1. Executive Summary

Campus event scheduling is notoriously plagued by double-booked auditoriums, clashing club activities, fragmented WhatsApp announcements, and last-minute event notices that leave students uninformed and split attendance.

This platform is a **single-campus SaaS** designed as an **Interactive Student Notice Board** coupled with a **Deterministic Safe-Slot & Conflict Resolution Engine**. It provides a frictionless experience for students to discover verified campus events while empowering campus administrations and community leads to coordinate without collisions.

---

## 2. Core Philosophy: The "Safe Slot" Principle

Every campus event must be guaranteed a **"Safe Slot"**:

1. **Zero Venue Collision**: The physical venue (e.g. Auditorium, Tech Lab) cannot be booked by any other event during that timeframe.
2. **Audience Protection**: Community events are scheduled to minimize major timing conflicts, ensuring maximum student turnout.
3. **The 7-Day Prior Notice Rule**: Community leads must submit event proposals at least **7 full calendar days in advance**. This eliminates last-minute scrambles, enables timely administrative review, and gives students adequate notice to plan their attendance.

---

## 3. User Personas & Permissions

```
┌────────────────────────────────────────────────────────────────────────┐
│                              1. ADMIN                                  │
│  - Full administrative authority over the entire campus instance       │
│  - Full CRUD on All Events (Approve, Reject with reasons, Edit, Delete) │
│  - Full CRUD on Users (Add/edit Leads and Admins; no public signups)   │
│  - Full CRUD on Venues (Auditoriums, Labs, Amphitheater, etc.)         │
│  - Full CRUD on Campus Communities & Clubs                             │
│  - Operations Console: Facility readiness and account management       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ manages
┌───────────────────────────────────▼────────────────────────────────────┐
│                        2. COLLEGE PRINCIPAL                            │
│  - Institutional executive approval authority (/principal)             │
│  - Triage Console: Review Safe-Slot cleared proposals from Leads       │
│  - Grant institutional authorization or decline with feedback presets  │
│  - Master campus schedule overview across all clubs and departments   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ oversees
┌───────────────────────────────────▼────────────────────────────────────┐
│                        3. COMMUNITY LEADS                              │
│  - Authenticated leaders of recognized campus clubs and societies      │
│  - Added directly by Campus Admin (no public registration form)        │
│  - Scoped access: Can only submit/edit events for assigned community   │
│  - Enforced 7-day prior notice policy on submissions                   │
│  - Real-time Safe Slot Assistant: warns of venue/time clashes and      │
│    proposes 3 viable alternative slots                                 │
│  - Track status of submissions (Pending, Approved, Rejected)           │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ publishes to
┌───────────────────────────────────▼────────────────────────────────────┐
│                    4. STUDENTS (PUBLIC NOTICE BOARD)                   │
│  - 100% Public Access: Zero login or registration barrier               │
│  - Multi-View Calendar & Notice Board: Month Grid, Week Timeline,      │
│    and Visual Event Poster Card Feed                                   │
│  - Real-time search, category filters (Tech, Arts, Sports, Career, etc.)│
│  - Detailed Event Modal: venue, timings, host club, RSVP links         │
│  - One-click "Add to Google Calendar" and Apple Calendar (.ics export) │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Detailed Feature Requirements

### 4.1 Public Student Notice Board (Frontend)

* **View Modes**:
  * **Visual Notice Board (Default)**: Visual event cards with cover imagery, date badges, host community tags, and quick-action buttons.
  * **Month Calendar Grid**: High-level overview of the month showing event density dots and compact titles.
  * **Week Timeline**: Hour-by-hour visual schedule of campus activities to quickly spot free slots and daily highlights.
* **Filtering & Discovery**:
  * **Search Bar**: Debounced search by title, description, or host name.
  * **Category Filter**: Filter by tags (`Technical`, `Cultural`, `Sports`, `Career/Workshop`, `Social`, `Academic`).
  * **Community Filter**: Filter events by specific clubs (e.g., Coding Club, Robotics, Debating Society).
  * **Date Quick-Selectors**: "Today", "This Weekend", "Next 7 Days", "This Month".
* **Event Detail Drawer / Modal**:
  * Rich event banner/poster.
  * Date, exact time range, and duration.
  * Venue details with location / hall guidance.
  * Organizing community info and contact.
  * External registration / ticket link (optional).
  * "Add to Calendar" (.ics download & direct Google Calendar link).

---

### 4.2 Community Lead Portal

* **Dashboard Overview**:
  * Summary cards: Total Events Hosted, Upcoming Approved, Submissions In Review, Rejected.
  * List of community's events with status badges (`Pending Review`, `Approved`, `Rejected`).
* **Event Submission Workflow**:
  * Fields: Title, Category, Target Venue, Start Time, End Time, Description, Registration URL, Cover Image.
  * **Rule Enforcement**: System prevents submission if `start_date < current_date + 7 days` (with visual feedback explaining the 1-week policy).
  * **Live Conflict Engine**:
    * As the lead selects Venue + Date + Time, the engine actively queries existing approved/pending events.
    * If a clash is detected, displays an alert: *"Main Auditorium is already booked by Robotics Club from 2:00 PM – 5:00 PM."*
    * Instantly computes and displays **3 Alternate Safe Slots** (e.g. *"Same venue at 5:30 PM"*, *"Seminar Hall A at 2:00 PM"*, or *"Next day at 2:00 PM"*).
  * Lead submits $\rightarrow$ Event is saved with status `pending`.

---

### 4.3 Admin Management Console

* **Event Review & Triage Queue**:
  * Dedicated triage feed for all `pending` submissions.
  * Detailed conflict breakdown if any soft overlap exists.
  * Actions:
    * **Approve**: Immediately publishes event to the Public Notice Board.
    * **Reject with Note**: Opens a feedback modal to specify reasons (e.g., *"Auditorium undergoing maintenance; please select Seminar Hall"*).
    * **Reschedule / Override**: Admin can manually adjust venue or timings if needed.
* **User Management (CRUD)**:
  * Table of all system users.
  * Admin action: "Add User" (Name, Email, Temporary Password, Role: Admin or Community Lead, Assigned Community).
  * Ability to deactivate, edit, or reset passwords.
* **Venue Management (CRUD)**:
  * Manage campus venues (Name, Location, Capacity, Equipment/Amenities, Active Status).
* **Community Management (CRUD)**:
  * Manage recognized student clubs and organizations (Name, Category, Description, Logo, Assigned Lead).

---

## 5. Non-Functional Requirements & Performance

* **Page Load Speed**: Fast initial load (< 1s) with Server-Side Rendering (SSR) for public notice board routes.
* **Instant Optimistic Interactivity**: Tab and filter switches respond in < 50ms without full-page reloads.
* **Responsive Layout**: 100% mobile-optimized for students checking the notice board on their smartphones.
* **Data Security & Privacy**: Admin and Lead endpoints protected with session validation; no sensitive user data exposed to public endpoints.
