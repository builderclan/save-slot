# Changelog

All notable changes to the SaveSlot project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0] - Unreleased

### Institutional Configuration & White-Labeling

- **Single-Instance Institutional Configuration**:
  - Added centralized configuration in `src/lib/config/campus.ts` (`campusConfig`).
  - Automatic derivation of short name acronyms (`extractAcronym`) and slugs (`slugify`), with boot-time validation.
  - Dynamically injects institution identity into navigation, login, forgot-password, reset-password, page metadata (`title`, descriptions, OpenGraph), `site.webmanifest`, sitemaps, and calendar `.ics` exports.

### Security & Hardening

- **Database RPC Caller Identity Verification (SEC-01)**:
  - Migration `011_harden_rpc_and_community_members_rls.sql` drops client-supplied `p_admin_id` in `approve_community()` and `reject_community()`, strictly enforcing server-side `auth.uid()` checks and revoking execute permissions from the `anon` role.
- **Client-Side Privilege Escalation Prevention on Community Members (SEC-02)**:
  - Hardened `community_members_insert` RLS policy to strictly require `role = 'member'`, preventing authenticated users from self-elevating into `lead` or `admin` roles.
- **Stored XSS Protocol Whitelisting (SEC-03)**:
  - Enforced `SafeUrlSchema` on `coverImageUrl` and `externalRegistrationUrl`, rejecting non-HTTP protocols (`javascript:`, `data:`, `vbscript:`) at the Zod validation layer.
- **Next.js & Engine Dependency Hardening (SEC-04)**:
  - Upgraded Next.js and `eslint-config-next` to `16.4.3` to eliminate Image Optimization remote execution / SSRF vulnerabilities (GHSA-2464-fhr4-w9xw, GHSA-673q-mjm6-r5xr, GHSA-cjq9-62q9-8jv4, GHSA-h694-7cp9-m8p3, GHSA-39w2-rjm5-chcv).
  - Updated Vitest test runner to `5.0.5`.
- **Production Seed Guard & Demo Account Gating (SEC-05)**:
  - Added strict environment safeguard in `scripts/seed.js` forbidding execution against remote or production databases unless explicitly permitted.
  - Hardened populated production database checks in `scripts/seed.js` to strictly preserve live accounts in production.
- **Host Poisoning & Open Redirect Defense (SEC-06 & SEC-12)**:
  - Hardened `auth/callback/route.ts` against spoofed `X-Forwarded-Host` headers and enforced relative internal paths (`/` and not `//`).
  - Hardened `src/app/login/page.tsx` against backslash normalization bypasses (`/\evil.com`) by strictly verifying parsed URLs against `window.location.origin`.
- **Strict Multi-Tenant Campus Isolation & IDOR Prevention (SEC-07 & SEC-14)**:
  - Enforced mandatory `campus_id` verification across all administrative endpoints (`/api/admin/events/*`, `/api/admin/venues/*`, `/api/admin/communities/*`, `/api/admin/users/*`).
  - Added tenant boundaries in `src/app/api/lead/events/route.ts` returning `403 Forbidden` (`{ error: "Campus association required" }`) when privileged accounts lack `campus_id`.
  - Rendered a graceful empty desk view on `src/app/principal/page.tsx` when `campusId` is absent.
- **Public Data Leakage Protection (SEC-08)**:
  - Restricted public `/api/communities` queries to `status = 'approved'` only.
- **API Error Message Sanitization & Info Leak Defense (SEC-09)**:
  - Sanitized 500 internal server error responses across all administrative and public API handlers, returning uniform client messages while retaining detailed logs on the server.
- **Defensive HTTP Headers (SEC-10)**:
  - Added `Strict-Transport-Security` (`max-age=31536000; includeSubDomains`) and `X-XSS-Protection: 0` headers in `next.config.ts`.
- **Atomic Distributed Auth Rate Limiting & Cooldown (SEC-11 & SEC-13)**:
  - Migration `012_add_auth_rate_limits.sql` provisions the `auth_rate_limits` table.
  - Implemented atomic PostgreSQL upserts (`.insert().onConflictDoUpdate().returning()`) with explicit `::timestamptz` casts, rolling-window L1 memory cache fallback, and `firstFailedAt` preservation in `src/lib/rate-limit.ts` (5 failed attempts -> 5-minute lockout).
- **RPC Execute Permission Revocation (SEC-15)**:
  - Revoked `EXECUTE` on `approve_community` and `reject_community` functions from `PUBLIC` in migration `011_harden_rpc_and_community_members_rls.sql`.

### UI & Accessibility Polish

- **TimePicker & DatePicker Keyboard Navigation & Positioning**:
  - Added full keyboard accessibility (`ArrowUp`/`ArrowDown`/`Enter`/`Space`/`Escape`/`Tab`), portal auto-scroll synchronization on mount, and Escape focus restoration to trigger buttons.
- **DatePicker Preset Safety Guard**:
  - Prevented date preset buttons from selecting dates preceding `parsedMinDate`.
- **Card Interactive Child Delegation**:
  - Fixed `closest("[role='button']")` click guard in `<Card isClickable>` to permit clicks on child links, buttons, and text.
- **Admin Triage Filter Auto-Reset**:
  - Added reactive reset in `src/features/admin/components/admin-triage-view.tsx` resetting `selectedCommunity` to `"all"` when the selected club has no remaining proposals.
- **Admin Layout Loading Skeleton (CLS Elimination)**:
  - Replaced spinner in `src/app/admin/loading.tsx` with a full 2-column sidebar workspace skeleton, eliminating Cumulative Layout Shift.

### Conflict Engine & Core Workflows

- **Server-Side 409 Conflict Guard**:
  - Enforced server-side 409 conflict detection on lead event proposals and edits in `src/app/api/lead/events/route.ts` and `src/app/api/lead/events/[id]/route.ts`.
  - Enforced calendar-day lead time policy in conflict engine.
- **Slug & Acronym Derivation Alignment**:
  - Harmonized acronym and slug derivation across `scripts/seed.js`, `scripts/migrate-principal.js`, and `scripts/migrate-vice-principal.js`.
- **Read-Path Database Mutation Removal**:
  - Eliminated campus record writes from `getPrimaryCampusId()` in `src/lib/campus.ts`, caching resolved UUIDs in memory.

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
