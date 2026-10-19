# Changelog

All notable changes to the SaveSlot project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

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
