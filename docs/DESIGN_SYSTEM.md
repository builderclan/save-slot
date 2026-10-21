# SaveSlot Design System & UI Specification

**System**: SaveSlot Design System (SDS)  
**Philosophy**: Minimalist SaaS • Quiet Precision • High-Craft Ergonomics (Linear / Apple / Raycast aesthetic)  
**Stack**: Next.js 16 (App Router), React 19, Tailwind CSS v4, Lucide Icons, date-fns  
**Version**: 2.0.0  
**Target Institution**: Albertian Institute of Science & Technology (AISAT)  

---

## 1. Design Philosophy: Quiet Precision

SaveSlot is built for campus event scheduling, administrative sanctioning, and student discovery. It rejects SaaS clichés (sparkles, neon glow rings, loud rainbow gradients, and fake metric widgets) in favor of **Quiet Precision**:

1. **Restraint over Decoration**: White, neutral zinc, and slate surfaces form a quiet canvas. Color is reserved strictly for meaningful semantic states (status, category classification, role authority, conflict warnings).
2. **Hairline Boundaries**: Spatial separation is achieved through razor-sharp hairline borders (`border-zinc-200/80` or `border-slate-200/80`) and subtle background elevations rather than heavy, muddy shadows.
3. **Tactile Feedback**: Every interactive surface yields physical feedback upon interaction: `active:scale-[0.98]`, subtle micro-transitions (`150ms ease`), and distinct active/focus rings.
4. **Frictionless Information Architecture**: Information density is balanced. On desktop, power-user density displays calendar overviews with quick-jump mini calendars. On mobile (< 768px), views gracefully adapt to full-width edge-to-edge lists with hairline dividers (`divide-y divide-zinc-100`) and thumb-friendly bottom sheets.
5. **Speed & Optimism**: Instant visual updates, optimistic toggles, and zero cumulative layout shift (CLS) using tabular numbers (`font-variant-numeric: tabular-nums`).

---

## 2. Design Tokens & Foundations

### 2.1 Surfaces & Canvas

| Surface Token | Light Theme Value | Usage |
| :--- | :--- | :--- |
| `surface-canvas` | `#FAFAFA` (`zinc-50`) | Global page canvas, secondary background behind floating cards |
| `surface-card` | `#FFFFFF` (`white`) | Primary card background, active segmented pill, dialog windows |
| `surface-muted` | `#F4F4F5` (`zinc-100`) | Input fields, inactive tab containers, table header bars |
| `surface-hover` | `#F4F4F5` (`zinc-100`) | Row hover, secondary button hover, dropdown item hover |
| `surface-overlay` | `rgba(9, 9, 11, 0.45)` | Backdrop blur overlay for modals and sheets |

### 2.2 Typography System

The typography pairs **Inter** for clean readability and **JetBrains Mono** for fixed-width alignment of numbers, times, and capacity metrics.

- **Primary Font**: `Inter`, `-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, `sans-serif`
  - Font features enabled: `"cv02", "cv03", "cv04", "cv11"`
  - Tabular numerals enabled: `font-variant-numeric: tabular-nums;`
- **Monospace Font**: `JetBrains Mono`, `ui-monospace`, `Menlo`, `monospace`

#### Typographic Scale

| Role | Class | Size / Line Height | Weight | Tracking | Usage |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Display Heading** | `text-2xl font-bold tracking-tight` | 24px / 32px | 700 | `-0.025em` | Page titles, hero banners |
| **Section Heading** | `text-lg font-semibold tracking-tight` | 18px / 26px | 600 | `-0.02em` | Card group titles, modal headers |
| **Subheading** | `text-sm font-semibold` | 14px / 20px | 600 | `-0.01em` | Table headers, tab titles, widget labels |
| **Body (Default)** | `text-sm font-normal` | 14px / 20px | 400 | `normal` | Descriptions, inputs, body text |
| **Body (Compact)** | `text-xs font-normal` | 12px / 16px | 400 | `normal` | Event chips, venue tags, metadata |
| **Caption / Badge** | `text-[11px] font-medium uppercase tracking-wider` | 11px / 14px | 500 | `0.05em` | Status labels, time stamps, category tags |
| **Mono Metrics** | `font-mono text-xs font-medium` | 12px / 16px | 500 | `normal` | Capacity utilization (e.g. `45/120 cap`), timestamps |

### 2.3 Semantic Color Tokens

SaveSlot employs a restrained monochrome base with purposeful semantic accents:

#### Role Brand Accents

- **Executive Principal / VP**: Subtle executive violet/purple
  - Text: `text-purple-700`
  - Fill / Tint: `bg-purple-50`
  - Border: `border-purple-200/80`
- **Community Leads**: Refined indigo
  - Text: `text-indigo-700`
  - Fill / Tint: `bg-indigo-50`
  - Border: `border-indigo-200/80`
- **Campus Admin**: Warm institutional amber
  - Text: `text-amber-700`
  - Fill / Tint: `bg-amber-50`
  - Border: `border-amber-200/80`

#### Status & State Tokens

- **Published / Approved / Safe**: Emerald
  - `bg-emerald-50 text-emerald-700 border-emerald-200/80`
- **Pending Sanction**: Amber
  - `bg-amber-50 text-amber-700 border-amber-200/80`
- **Rejected / Clash / Danger**: Rose / Crimson
  - `bg-rose-50 text-rose-700 border-rose-200/80`
- **Draft / Inactive / Withdrawn**: Neutral Slate/Zinc
  - `bg-zinc-100 text-zinc-600 border-zinc-200/80`

### 2.4 Event Category Matrix

Desaturated, accessible, and high-readability category colors:

| Category | Text Token | Background Tint | Border Hairline | Indicator Dot |
| :--- | :--- | :--- | :--- | :--- |
| **Tech** | `text-blue-700` | `bg-blue-50/70` | `border-blue-200/70` | `bg-blue-500` |
| **Career** | `text-emerald-700` | `bg-emerald-50/70` | `border-emerald-200/70` | `bg-emerald-500` |
| **Arts** | `text-pink-700` | `bg-pink-50/70` | `border-pink-200/70` | `bg-pink-500` |
| **Social** | `text-purple-700` | `bg-purple-50/70` | `border-purple-200/70` | `bg-purple-500` |
| **Sports** | `text-orange-700` | `bg-orange-50/70` | `border-orange-200/70` | `bg-orange-500` |
| **Academic** | `text-indigo-700` | `bg-indigo-50/70` | `border-indigo-200/70` | `bg-indigo-500` |
| **Workshop** | `text-amber-700` | `bg-amber-50/70` | `border-amber-200/70` | `bg-amber-500` |

### 2.5 Hairlines, Shadows & Radii

- **Hairline Borders**: `1px solid rgba(228, 228, 231, 0.8)` (`border-zinc-200/80` or `border-slate-200/80`)
- **Corner Radii**:
  - `rounded-md`: 6px (Micro badges, tags, compact buttons)
  - `rounded-lg`: 8px (Form inputs, event chips, standard buttons)
  - `rounded-xl`: 12px (Cards, segmented containers, list rows)
  - `rounded-2xl`: 16px (Modals, bottom sheets, main panels)
  - `rounded-full`: 9999px (Pills, user avatars, indicator dots)
- **Diffuse Multi-Layer Shadows**:
  - `shadow-2xs`: `0 1px 2px 0 rgba(0, 0, 0, 0.03)`
  - `shadow-xs`: `0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.03)`
  - `shadow-sm`: `0 2px 6px -1px rgba(0, 0, 0, 0.06), 0 1px 4px -2px rgba(0, 0, 0, 0.04)`
  - `shadow-xl`: `0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)` (Modals)

---

## 3. UI Component Primitives & Specifications

All components reside in `src/components/ui/` with strictly typed TypeScript interfaces.

### 3.1 Button (`src/components/ui/button.tsx`)

A unified, high-craft button supporting multiple visual variants, responsive sizing, and loading states:

- **Variants**:
  - `primary`: Sleek high-contrast solid (zinc-900 with white text, or deep brand indigo)
  - `secondary`: Clean white surface with hairline border (`bg-white border-zinc-200 text-zinc-800 hover:bg-zinc-50`)
  - `ghost`: Transparent with subtle hover wash (`hover:bg-zinc-100 text-zinc-600 hover:text-zinc-900`)
  - `danger`: Refined rose button for destructive actions
  - `outline`: Bordered with neutral styling
- **Sizes** (44px min touch target on mobile via `min-h-[44px]`):
  - `sm`: `min-h-[44px] sm:min-h-0 h-auto sm:h-8 px-2.5 py-2 sm:py-0 text-xs rounded-lg`
  - `md`: `min-h-[44px] sm:min-h-0 h-auto sm:h-9 px-3.5 py-2 sm:py-0 text-sm rounded-lg`
  - `lg`: `min-h-[44px] sm:min-h-0 h-auto sm:h-10 px-4 py-2 sm:py-0 text-sm rounded-xl`
  - `icon`: `min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 h-11 w-11 sm:h-8 sm:w-8 p-0 rounded-lg flex items-center justify-center`
- **Feedback**: `active:scale-[0.98] transition-all duration-150`

### 3.2 Form Inputs (`src/components/ui/input.tsx`, `select.tsx`)

- Crisp, minimal input fields with hairline border `border-zinc-200/90` and clean background `bg-zinc-50/60` transitioning smoothly to `bg-white` on focus.
- Accessible focus ring: `focus:border-zinc-400 focus:ring-2 focus:ring-zinc-900/10 outline-none`.
- Integrated icon slots (left prefix or right suffix) for search, dates, and currency.

### 3.3 StatusBadge (`src/components/ui/status-badge.tsx`)

- Displays event approval, conflict detection, and notice lead-time statuses.
- Formats:
  - Standard pill (`px-2 py-0.5 text-xs rounded-full border font-medium`)
  - Dot pill (with a 6px status indicator circle)
  - Compact icon pill

### 3.4 Modal & Mobile Bottom Sheet (`src/components/ui/modal.tsx`)

- **Desktop (>= 768px)**:
  - Centered floating dialog with backdrop blur (`backdrop-blur-sm bg-zinc-950/45` / `surface-overlay`).
  - Subtle entrance animation: `animate-in fade-in zoom-in-95 duration-150`.
  - Accessible ESC listener, focus containment, and click-outside dismissal.
- **Mobile (< 768px)**:
  - Automatically elevates into an ergonomic bottom sheet.
  - Smooth bottom-up slide: `animate-in slide-in-from-bottom duration-200`.
  - Tactile grab handle at the top (`w-12 h-1 bg-zinc-300 rounded-full mx-auto my-2`).

### 3.5 SegmentedControl & Tabs (`src/components/ui/tabs.tsx`)

- Elevated segmented container: `p-1 rounded-xl bg-zinc-100/90 border border-zinc-200/80 flex items-center gap-1`.
- Active item: Crisp white background, subtle hairline shadow `shadow-xs`, semibold text `text-zinc-900`.
- Inactive item: Soft neutral text `text-zinc-600 hover:text-zinc-900 hover:bg-white/60`.

### 3.6 EmptyState (`src/components/ui/empty-state.tsx`)

- Calm, institutional empty state presentation:
  - Subtle icon contained within a soft rounded neutral container.
  - Concise heading and explanation.
  - Contextual call-to-action button.

---

## 4. Key Application Views & Redesign Architecture

### 4.1 Header & Top Navigation Bar

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ [Logo] SaveSlot [AISAT]  │  October 2026 [<] [>] [Today]                                               │
│                                                                                                        │
│           ┌──────────────────────────────────────────────────────────────┐                             │
│           │ [Month]  [Week]  [Board]   │   [Role Workspace Shortcut]     │                             │
│           └──────────────────────────────────────────────────────────────┘                             │
│                                                                                                        │
│                                                      [User Name / Role]  [Avatar]  [Sign Out / Login]  │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

1. **Left Zone**:
   - SaveSlot brand mark + campus moniker tag (`AISAT`).
   - Hairline vertical separator (`h-4 w-px bg-zinc-200`).
   - Date navigation: Month Year title with `<` and `>` chevron buttons + `Today` shortcut.
2. **Center Zone**:
   - Unified segmented pill: Month, Week, Board calendar views + contextual shortcut to privileged consoles (Lead Desk, Principal Desk, Admin Console).
3. **Right Zone**:
   - User identity pill with role chip and clean logout or login action.

### 4.2 Notice Board & Calendar Canvas (`/`)

1. **Sidebar Utility Rail** (`w-64` on desktop, collapsible bottom-sheet filter drawer on mobile):
   - **Primary Action**: Minimal high-contrast `+ Create Event` button.
   - **MiniCalendar**: Compact, frictionless month navigation calendar with today indicator.
   - **Instant Search**: Debounced search with shortcut hint (`/`) and clear button.
   - **Category Checklist**: All 7 categories with desaturated color dots and event counts.
   - **Time Horizon Switcher**: Segmented toggle for `All`, `Today`, `Next 7 Days`, `Weekend`.
   - **System Conflict Engine Status**: Subtle status badge verifying automated clash prevention is online.
2. **Main Calendar Canvas**:
   - **Month View**: 7-column grid with clean hairline dividers, subtle day numbering, category-tinted event pills with time and venue badges.
   - **Week View**: Time-blocked hourly columns with clear chronological event cards.
   - **Board View**: Category kanban swimlanes with card thumbnails, community badges, and capacity indicators.

### 4.3 Executive Approval Desk (`/principal`)

- Designed for the Principal & Vice Principal for quick, authoritative event triaging:
  - Status overview counters (Pending Sanction, Decision History).
  - Triage cards with real-time venue utilization metrics:
    $$\text{Utilization} = \frac{\text{Expected Attendance}}{\text{Venue Capacity}} \times 100\%$$
  - Lead-time compliance indicator (`7+ Days Notice` vs `Short Notice Warning`).
  - Action buttons: Quick `Approve & Publish` (Emerald) and `Reject with Reason` (Rose outline).

### 4.4 Lead Workspace (`/lead`)

- Event management for student club heads and community leads:
  - Tabbed overview: `Active & Published`, `Pending Sanction`, `Drafts / Past`.
  - Safe-Slot Proposal Wizard:
    - Step 1: Basic Event Details (Title, Description, Community, Category).
    - Step 2: Schedule & Venue with Real-Time Conflict Detection.
    - Automatic 3-way clash resolution options when a venue double-booking occurs.

---

## 5. Mobile Ergonomics & Responsive Standards

- **Mobile First Breakpoint (< 768px)**:
  - Sticky header shrinks to 48px height with clean compact brand and menu toggles.
  - Floating sticky action bar at the bottom for quick filters and event creation.
  - Calendar converts into an edge-to-edge chronological feed with hairline separators.
  - Minimum touch target: `44px × 44px`.
- **Tablet (768px - 1023px)**:
  - Center navigation condenses view switcher.
  - Collapsible sidebar.
- **Desktop (1024px+)**:
  - Full two-column command center with sticky 256px utility sidebar and fluid calendar canvas.

---

## 6. Accessibility & Performance Guardrails

- **WCAG 2.1 AA Compliance**: All text pairings maintain a minimum contrast ratio of 4.5:1.
- **Keyboard Navigation**:
  - `Esc`: Closes any open modal or drawer.
  - `/`: Immediately focuses the calendar search input.
  - `Tab` / `Shift+Tab`: Predictable focus flow with accessible focus rings.
- **Performance Budget**:
  - Zero heavy unindexed database queries.
  - Sub-50ms render response using React 19 memoization (`useMemo`, `useCallback`).
  - Bundle size maintained strictly under control by utilizing built-in Tailwind CSS v4 and standard Lucide icons without bulky external UI libraries.
