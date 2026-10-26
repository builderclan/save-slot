# Changelog

All notable changes to the SaveSlot project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Single-Instance Institutional White-Labeling**: Centralized campus configuration (`src/lib/config/campus.ts`) with smart acronym (`extractAcronym`) and URL slug derivation (`slugify`) driven by `NEXT_PUBLIC_CAMPUS_*` environment variables.
- **Dynamic Brand Injection**: Injected institutional identity into navigation, authentication views, SEO metadata, web manifest, sitemaps, and `.ics` calendar exports.
- **Admin Workspace Loading Skeleton**: Added a 2-column sidebar loading skeleton (`src/app/admin/loading.tsx`) eliminating Cumulative Layout Shift (CLS).

### Changed

- **Next.js & Vitest Engine Upgrades**: Upgraded Next.js to `16.4.3` and Vitest to `5.0.5`.
- **Response Headers Modernization**: Updated `X-XSS-Protection: 0` per OWASP guidance and removed `preload` from `Strict-Transport-Security`.
- **Read-Path Campus Optimization**: Removed database mutation writes from `getPrimaryCampusId()`, caching resolved UUIDs in memory.
- **Slug Derivation Synchronization**: Aligned slug and acronym extraction across migration scripts and `scripts/seed.js`.

### Fixed

- **Principal Event Creation UI Leak**: Restricted Notice Board `isPrivileged` guard in `src/features/events/hooks/use-notice-board.ts` to Community Leads and Admins, preventing Principals from seeing the "Create Event" button and aligning UI with backend RBAC.
- **Open Redirect Vulnerability**: Rejected backslash normalization bypasses (`/\evil.com`) in `src/app/login/page.tsx`, strictly enforcing URL origin checks.
- **Auth Rate-Limiter Race Conditions**: Replaced multi-step read-then-write checks in `src/lib/rate-limit.ts` with atomic PostgreSQL upserts (`.insert().onConflictDoUpdate().returning()`), explicit `::timestamptz` casts, and rolling-window L1 cache preservation.
- **Multi-Tenant Campus Isolation Leaks**: Added missing tenant guards in `src/app/api/lead/events/route.ts` (returns `403 Forbidden` for unassociated accounts) and rendered an empty desk view on `src/app/principal/page.tsx` when `campusId` is absent.
- **Server-Side 409 Conflict Guard**: Enforced server-side double-booking and calendar-day lead-time policy validation on lead event proposals and edits.
- **TimePicker & DatePicker Accessibility**: Added keyboard navigation (`ArrowUp`/`ArrowDown`/`Enter`/`Space`/`Escape`/`Tab`), portal auto-scroll synchronization on mount, and Escape focus restoration.
- **DatePicker Preset Safety Guard**: Blocked date presets from selecting dates preceding `parsedMinDate`.
- **Card Interactive Trapping**: Fixed click delegation in `<Card isClickable>` to allow nested buttons and links to trigger naturally.
- **Admin Triage Filter Reset**: Auto-reset community filter to `"all"` when a selected club's pending proposals reach zero.
- **Production Seed Guard Bypass**: Corrected account query filters in `scripts/seed.js` to strictly preserve live accounts in production.

### Security

- **RPC Identity Verification**: Revoked client-supplied `p_admin_id` and enforced server-side `auth.uid()` in `approve_community()` and `reject_community()` (migration `011`).
- **RPC Public Execution Revocation**: Revoked `EXECUTE` privileges on community administrative RPCs from `PUBLIC`.
- **Client-Side Privilege Escalation Guard**: Hardened `community_members_insert` RLS policy to strictly require `role = 'member'`.
- **Stored XSS Protocol Whitelisting**: Enforced `SafeUrlSchema` on event posters and RSVP links, rejecting dangerous protocols (`javascript:`, `data:`).
- **Public Data Leakage Protection**: Restricted public `/api/communities` queries strictly to `status = 'approved'`.
- **Error Response Sanitization**: Stripped internal error stacks and database details from 500 error responses across all public and administrative API routes.

---

## [0.2.0] - 2026-10-19

### Added

- **Domain-Colocated Feature Slices (`src/features/`)**:
  - `src/features/admin/`: Full vertical slice for Admin Console (views, modals, stats, sidebar controls, tests, and API).
  - `src/features/lead/`: Full vertical slice for Community / Club Lead workspace (proposal wizard steps, views, modals, tests, and API).
  - `src/features/principal/`: Full vertical slice for College Principal Desk (split-view desk, triage inbox, schedule calendar, audit history, and rejection modals).
  - `src/features/events/`: Full vertical slice for Student Notice Board & Campus Events (month view, week view, mini-calendar, event card, filter bar, detail modal, category badge, and API).
  - `src/features/conflicts/`: Typed client and contract for the SafeSlot automated venue conflict prevention engine.
  - `src/features/venues/`: Dedicated client for campus facility lookups and management.
  - `src/features/auth/`: Centralized authentication and password reset API client.
- **Centralized Typed HTTP Client (`src/lib/api-client.ts`)**:
  - Reusable fetch wrapper with automatic JSON serialization, defensive error unwrapping, and custom `ApiException`.
- **Domain Custom Hooks**:
  - `useAdminDashboard()`: Encapsulates URL query synchronization, dataset loading per tab, and modal state transitions.
  - `useLeadWorkspace()`: Encapsulates lead event filtering, search, sorting, and proposal withdrawal.
  - `useNoticeBoard()`: Encapsulates multi-category filtering, date horizons, search, and deep-link event selection.
- **Centralized Design System Tokens (`src/app/globals.css`)**:
  - Mapped theme color tokens (`--color-card`, `--color-surface-hover`, `--color-danger`, `--color-success`) into the Tailwind CSS v4 `@theme` engine.
  - Explicit font bindings for `Inter` (`--font-sans`) on body and `JetBrains Mono` (`--font-mono`) on code elements.
  - Reusable UI utilities (`.btn-base`, `.btn-primary`, `.btn-secondary`, `.btn-danger`, `.btn-ghost`, `.input-base`, `.select-base`, `.card-surface`, `.focus-ring`).
- **Proposal Wizard Modularization**:
  - Decomposed 869-line monolithic modal into independent step components: `step-details.tsx`, `step-schedule.tsx`, and `step-poster.tsx`.

### Changed

- **App Router Orchestrators**:
  - `src/app/admin/page.tsx`: Shrunk from 759 lines to 240 lines (-68%) by delegating state to `useAdminDashboard`.
  - `src/app/lead/page.tsx`: Shrunk from 469 lines to 260 lines by delegating state to `useLeadWorkspace`.
  - `src/app/page.tsx`: Cleanly imports `NoticeBoardClient` from `@/features/events`.
- **Pure Component Layer (`src/components/`)**:
  - Refined to strictly contain shared design system primitives (`src/components/ui/`) and the root layout shell (`src/components/layout/`).
- **Validation Types (`src/lib/validations/`)**:
  - Exported Zod-inferred TypeScript input/output contracts for strict end-to-end type safety.

### Fixed

- **Desk View Loading Waterfall & Skeleton Flashing**:
  - Encapsulated the root student notice board (`page.tsx`) and its skeleton (`loading.tsx`) into an isolated `(board)` route group.
  - Eliminated root-level Suspense fallback leakage into `/principal`, `/admin`, and `/lead`, ensuring desk views immediately display their dedicated loading skeletons without flashing the student calendar view.
- **Lead Workspace Layout & Skeleton Width Consistency**:
  - Synchronized the live Lead Workspace container (`src/app/lead/page.tsx`) width (`max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6`), page background (`bg-slate-50/50`), and elevated card container with `src/app/lead/loading.tsx`, eliminating layout shifts and matching the skeleton screen's visual boundaries.

### Removed

- **Legacy Facade Directories**:
  - Deleted `src/components/admin/` (views colocated in `src/features/admin/components/`).
  - Deleted `src/components/lead/` (views colocated in `src/features/lead/components/`).
  - Deleted `src/components/principal/` (views colocated in `src/features/principal/components/`).
  - Deleted `src/components/events/` and `src/components/notice-board/` (views colocated in `src/features/events/components/`).
- **Redundant Static Assets**:
  - Pruned duplicate icons (`public/icon.png`, `public/apple-icon.png`, `public/favicon.ico`) in favor of Next.js App Router metadata conventions.

---

## [0.1.0] - 2026-10-18

### Added

- **Multi-Persona E2E User Journey Test Suite**:
  - Comprehensive vitest suite covering Student, Club Lead, Principal, and Campus Admin flows.
- **Principal & Vice Principal Desk**:
  - Master schedule, approval inbox, and decision history with multi-campus role-based access control.
- **Automated SafeSlot Conflict Engine**:
  - Microsecond-level double-booking and cohort quiet-hour detection algorithms.
- **Edge Incremental Static Regeneration (ISR)**:
  - 60-second revalidation pipeline for public campus notice boards.

[Unreleased]: https://github.com/builderclan/save-slot/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/builderclan/save-slot/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/builderclan/save-slot/releases/tag/v0.1.0
