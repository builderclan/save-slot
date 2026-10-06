# SaveSlot UI / UX Design System & Interface Specification

**Product**: SaveSlot — Campus Events & Scheduling Platform  
**Target Institution**: Albertian Institute of Science & Technology (AISAT)  
**Design Philosophy**: Linear / Apple Institutional Craft (Quiet, tactile, zero-clutter)  
**Version**: 1.2.0  
**Status**: Implemented & Verified in Current Production Build  

---

## 1. Design Philosophy & Aesthetic Core

SaveSlot avoids generic SaaS templates, neon pulse pills, rainbow gradient stripes, sparkles, and fake metric widgets. It is designed around institutional authority, calm visual density, and tactile micro-interactions:

- **Quiet Restraint**: High-contrast slate typography on pristine neutral surfaces (`#FFFFFF`, `#F8FAFC`, `#F1F5F9`) with purposeful, semantic accents (Purple for Executive Principal, Indigo for Community Leads, Emerald for Active System).
- **Hairline Precision**: Subtle borders (`border-slate-200/80`, `border-slate-100`) and hairline dividers (`w-px h-4 bg-slate-300/80`) create clear spatial boundaries without heavy shadows.
- **Tactile Feedback**: Interactive elements provide instant physical confirmation via `active:scale-[0.98]` and `active:bg-slate-100/70`.
- **Mobile-First Edge-to-Edge**: On compact viewports (e.g., 360px mobile), elements snap to full-width hairline dividers (`divide-y divide-slate-100`), eliminating cramped desktop data tables.

---

## 2. Design Tokens & Color Palette

### 2.1 Surfaces & Backgrounds

| Token / Class | Hex / Value | Usage |
| :--- | :--- | :--- |
| `bg-white` | `#FFFFFF` | Primary card surfaces, active segmented tab pills, modal sheets |
| `bg-slate-50` | `#F8FAFC` | App canvas background, input backgrounds, table header bars |
| `bg-slate-100/90` | `rgba(241, 245, 249, 0.9)` | Segmented pill containers, secondary action badges |
| `bg-white/95 backdrop-blur-md` | — | Sticky top navigation bar with glassy light diffusion |

### 2.2 Typography & Text Colors

The typographic system pairs **Inter** (Primary UI & Calendar Data) with **JetBrains Mono** (Timestamps, Capacity Meters & Identifiers) via `next/font/google`:

- **Primary Body & Grid**: `Inter` (`--font-inter` → `--font-sans`) with OpenType features `cv02`, `cv03`, `cv04`, `cv11`.
- **Numeric & Metrics**: `font-variant-numeric: tabular-nums;` ensuring fixed-width alignment across dates and timestamps without layout shift.
- **Monospace Accent**: `JetBrains Mono` (`--font-mono`) for capacity utilization (`45/120 cap`) and administrative identifiers.

| Token / Class | Size / Weight | Usage |
| :--- | :--- | :--- |
| `text-slate-900` | Bold / Semibold | Brand title, page headings, active tab labels, event titles |
| `text-slate-700` | Medium (`font-medium`) | Navigation labels, card descriptions, interactive button text |
| `text-slate-500` | Regular (`text-xs`) | Timestamps, venue locations, subtitle metadata, secondary badges |
| `text-slate-400` | Regular (`text-[11px]`) | Search placeholders, empty state instructions, hairline icons |

### 2.3 Semantic Brand & Role Accents

| Persona / Function | Accent Token | Background Pill | Border Token | Meaning |
| :--- | :--- | :--- | :--- | :--- |
| **Principal / Vice Principal** | `text-purple-900` / `text-purple-600` | `bg-purple-50` / `bg-purple-100/60` | `border-purple-200` | Executive institutional oversight |
| **Community Leads** | `text-indigo-700` / `text-indigo-600` | `bg-indigo-50` / `bg-indigo-100/50` | `border-indigo-200` | Club & department organizers |
| **Campus Admin** | `text-amber-900` / `text-amber-600` | `bg-amber-50` / `bg-amber-100/60` | `border-amber-200` | Infrastructure & venue management |
| **Conflict-Free Engine** | `text-emerald-700` | `bg-emerald-50` | `border-emerald-200` | Active conflict-prevention indicator |
| **Double-Booking / Reject** | `text-rose-700` / `text-rose-600` | `bg-rose-50` | `border-rose-200` | Scheduling clashes & rejections |

### 2.4 Event Category Color Matrix

Each event category on the calendar has a distinct, desaturated, high-readability colorway:

| Category | Text Token | Background | Border | Dot Indicator |
| :--- | :--- | :--- | :--- | :--- |
| **Tech** | `text-blue-700` | `bg-blue-50/70` | `border-blue-200/60` | `bg-blue-500` |
| **Career** | `text-emerald-700` | `bg-emerald-50/70` | `border-emerald-200/60` | `bg-emerald-500` |
| **Arts** | `text-pink-700` | `bg-pink-50/70` | `border-pink-200/60` | `bg-pink-500` |
| **Social** | `text-purple-700` | `bg-purple-50/70` | `border-purple-200/60` | `bg-purple-500` |
| **Sports** | `text-orange-700` | `bg-orange-50/70` | `border-orange-200/60` | `bg-orange-500` |
| **Academic** | `text-indigo-700` | `bg-indigo-50/70` | `border-indigo-200/60` | `bg-indigo-500` |
| **Workshop** | `text-amber-700` | `bg-amber-50/70` | `border-amber-200/60` | `bg-amber-500` |

---

## 3. Layout Grid & Responsive Breakpoints

SaveSlot uses a flexible responsive viewport matrix:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Sticky Header (h-14, 100vw, z-40, backdrop-blur-md)                         │
├───────────────────┬─────────────────────────────────────────────────────────┤
│ Left Sidebar      │ Main Content Canvas (flex-1, min-w-0, overflow-auto)    │
│ (hidden on mobile,│                                                         │
│  w-64 on lg+,     │ - Month Grid (7 equal columns, min-h-[110px] cells)     │
│  p-4, space-y-6)  │ - Week Grid (7 columns with hourly time markers)        │
│                   │ - Board View (Multi-column horizontal overflow cards)   │
└───────────────────┴─────────────────────────────────────────────────────────┘
```

- **Mobile Viewport (`< 768px`)**:
  - Full-width stacked layout.
  - Sidebar filters convert into a floating or bottom drawer modal with `sticky bottom-0` trigger.
  - Events render as edge-to-edge list rows with hairline dividers (`divide-y divide-slate-100`).
- **Tablet Viewport (`768px - 1023px`)**:
  - Center navigation displays view switcher and segmented pill bar.
  - Left date controls collapse redundant month texts.
- **Desktop Viewport (`1024px - 1920px`)**:
  - 2-column layout: Sticky 256px (`w-64`) left control panel + fluid calendar canvas (`max-w-[1920px]`).

---

## 4. Component Interface Specifications

### 4.1 Unified Divided Navigation Bar

The centerpiece of the top header (`src/components/layout/navbar.tsx`):

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ [Logo] SaveSlot [AISAT]  │  October 2026 [<][>] [Today]                                          │
│                                                                                                  │
│          ┌──────────────────────────────────────────────────────────────┐                        │
│          │ [📅 Month]  [📅 Week]  [⊞ Board]   │   [🎓 Vice Principal Desk] │                        │
│          └──────────────────────────────────────────────────────────────┘                        │
│                                                                                                  │
│                                                      Mr Paul Ansel V / VP  [Avatar]  [Sign Out]  │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

#### Anatomy & States

1. **Container**: `flex items-center p-1 rounded-xl bg-slate-100/90 border border-slate-200/80 gap-1 text-xs shadow-2xs`.
2. **View Modes (`Month`, `Week`, `Board`)**:
   - **Active Tab**: `bg-white text-slate-900 font-semibold shadow-xs rounded-lg px-2.5 lg:px-3 py-1.5`.
   - **Inactive Tab**: `text-slate-600 hover:text-slate-900 rounded-lg px-2.5 lg:px-3 py-1.5 transition-all`.
3. **Hairline Divider**:
   - `w-px h-4 bg-slate-300/80 mx-1 shrink-0` (Rendered only when user has privileged workspace access).
4. **Role Workspace Shortcut (`Vice Principal Desk` / `Lead Workspace` / `Admin Console`)**:
   - Embedded directly on the right side of the divider.
   - Text & icon inherit role colorway (`text-purple-900`, `text-purple-600` icon).
   - Hover state: `hover:bg-white/80 hover:text-purple-950 active:scale-[0.98]`.
5. **Contextual Route Transition**:
   - On `/`: Displays view modes + divider + role workspace link.
   - On `/principal`: Replaces view modes with standard segmented navigation (`[📅 Calendar] [🎓 Vice Principal Desk]`), where `Vice Principal Desk` holds the active raised white pill state.

---

### 4.2 Left Filter Sidebar (`NoticeBoardClient`)

Fixed 256px utility column on the left side of `/`:

1. **Primary Action**: `+ Create Event` button (leads to propose modal for leads/admins, or `/login` for unauthenticated visitors).
2. **MiniCalendar**:
   - Compact 7x6 month grid for rapid date jumping.
   - Today indicator: subtle blue/indigo circular fill.
   - Selected date indicator: solid rounded pill.
3. **Instant Search Field**:
   - Left-padded `Search` icon with clear `(X)` reset button.
   - Real-time search across event title, description, organizing club name, and venue name.
4. **"My calendars" Category Checklist**:
   - Header with `All` and `Clear` quick-toggle buttons.
   - Category row with colored status dot, category name, and custom checkbox.
5. **Time Horizon Pills**:
   - Segmented 2x2 grid buttons: `All Dates`, `Today`, `Next 7 Days`, `Weekend`.
6. **System Status Pill**:
   - Bottom badge with pulsing green dot: `SaveSlot™ System • Active — Automated conflict-prevention enabled for all campus venues.`

---

### 4.3 Month View Grid (`MonthView`)

- **Header**: 7-column day names (`Sunday` through `Saturday`) in uppercase/semibold slate.
- **Day Cells**:
  - Minimum height: `110px` on desktop.
  - Border: Hairline grid (`border-r border-b border-slate-200/70`).
  - Dates from adjacent months: Dimmed slate (`text-slate-400 bg-slate-50/40`).
  - Current day: Highlighted circular badge (`bg-indigo-600 text-white font-bold`).
- **Event Chips**:
  - Horizontal pill showing start time (e.g., `4:00 PM`) and truncated title.
  - Category-themed background and border.
  - Hover: Elevation shadow (`shadow-xs scale-[1.01]`).
  - Overflow: `+N more` button triggering a popover listing all events for the day.

---

### 4.4 Week View Grid (`WeekView`)

- **Header**: 7 columns mapped to active week dates with weekday abbreviation and day number.
- **Hourly Grid**: Vertically scrollable timeline starting at 8:00 AM through 10:00 PM with 1-hour gridlines.
- **Event Block**:
  - Absolute positioning calculated based on `start_time` and `end_time` minutes.
  - Shows event title, venue name badge (`📍 Main Auditorium`), and category pill.

---

### 4.5 Board View (Kanban Swimlanes)

- **Columns**: 7 columns corresponding to event categories (`Tech`, `Arts`, `Sports`, `Career`, `Academic`, `Social`, `Workshop`).
- **Cards (`EventCard`)**:
  - Aspect ratio cover image (with fallback category graphic).
  - Organizer community pill with avatar/logo.
  - Title, date & time range, and venue badge with capacity warning.
  - Direct deep-link modal trigger on click.

---

### 4.6 Event Detail Modal (`EventDetailModal`)

Centrally focused dialog (`max-w-xl`, backdrop blur):

- **Hero Banner**: High-resolution event image with gradient overlay.
- **Metadata Grid**:
  - Organizing club with logo.
  - Date & localized time formatted with `date-fns`.
  - Venue name, building, and physical address.
  - Category badge & tags list.
  - Registration link button (`Register Now ↗`).
- **Export Actions**:
  - `Add to Google Calendar` button (opens direct calendar URL in new tab).
  - `Download .ics` button (triggers immediate download of RFC 5545 calendar file).

---

### 4.7 Executive Approval Desk (`/principal`)

Dedicated approval workspace with an executive purple palette:

1. **Header**:
   - Title: `Executive Approval Desk` (or `Vice Principal Approval Desk`).
   - Summary: Real-time count of pending proposals requiring institutional sanction.
2. **Segmented Tab Control**:
   - `Pending Approvals (N)` vs `Decision History (N)`.
3. **Pending Event Triage Card**:
   - Organizer profile and community badge.
   - Event title, full description, and intended audience.
   - Proposed venue with live capacity utilization meter:
     $$\text{Utilization} = \frac{\text{Expected Attendance}}{\text{Venue Capacity}} \times 100\%$$
   - **Lead Time Status Badge**:
     - `✓ 7+ Days Notice` (Green pill): Complies with institutional booking policy.
     - `⚠ Short Notice (< 7 Days)` (Amber pill): Flags late submissions.
   - **Action Bar**:
     - `Reject with Reason` (Rose outline button): Opens rationale modal.
     - `Approve & Publish` (Emerald fill button): Commits transactional publication.
4. **Historical Review Log**:
   - Chronological table showing past reviews.
   - Status badge: `Approved` (Emerald) vs `Rejected` (Rose).
   - Reviewer identity pill: Displays `Reviewed by Mr Paul Ansel V (Vice Principal)`.
   - Rejection feedback block displaying the written rationale sent to the lead.

---

### 4.8 Lead Workspace Proposal Modal (`ProposeEventModal`)

Wizard for submitting events with real-time clash resolution:

1. **Form Fields**: Title, Community selector, Category, Venue picker, Start & End datetime pickers, Description, Virtual link, Cover image.
2. **Live Conflict Checking**:
   - Debounced query to `/api/conflicts/check` whenever `venue_id`, `start_time`, or `end_time` changes.
3. **Conflict Resolution Banner**:
   - If a double-booking is detected:
     - Rose-bordered alert showing conflicting event title, organizer, and time window.
     - **Safe-Slot Recommendation Cards**:
       - `Option A`: Later today in the same venue (+30m after conflict).
       - `Option B`: Alternative active venue of equivalent capacity at the same time.
       - `Option C`: Next available day at the same time.
     - **1-Click "Apply Slot"**: Updates form inputs immediately with the suggested slot.

---

## 5. Micro-Interactions & Animation Specs

- **Modal Transitions**: `animate-in fade-in zoom-in-95 duration-150` with `backdrop-blur-sm bg-slate-900/40`.
- **Drawer Slide-ins**: `animate-in slide-in-from-top-2 duration-150`.
- **Button Touch Feedback**: `transition-all duration-100 active:scale-[0.98]`.
- **List Item Hover**: `transition-colors duration-150 hover:bg-slate-50`.
- **Focus States**: Accessible focus ring `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2`.

---

## 6. Accessibility & Form Factor Compliance

- **Semantic Landmarks**: Strict `<header>`, `<nav aria-label="...">`, `<main>`, `<section>`, and `<footer>` elements.
- **ARIA Attributes**: `role="tablist"`, `role="tab"`, `aria-selected="true"`, `aria-expanded`, and descriptive `aria-label` tags on all icon-only buttons.
- **Color Contrast**: All text combinations meet or exceed WCAG 2.1 AA standards (minimum 4.5:1 contrast ratio for body text).
- **Target Sizes**: All interactive touch targets are a minimum of `36px × 36px` on desktop and `44px × 44px` on mobile viewports.
