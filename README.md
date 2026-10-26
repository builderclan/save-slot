# SaveSlot — Campus Notice Board & Event Scheduling SaaS

A centralized, conflict-free event discovery and scheduling platform built specifically for college campuses. Ensures every student event receives a verified **"Safe Slot"** (free of venue double-bookings and split audience clashes) while enforcing a mandatory **7-day prior notice policy**.

---

## 📚 Project Documentation

Detailed design documents, specifications, and architecture are maintained in [`docs/`](./docs):

- **[System Design Doc (`docs/DESIGN_DOC.md`)](./docs/DESIGN_DOC.md)**: Comprehensive architectural blueprint, concurrency control, connection resilience, and schema specs.
- **[UI / UX Design System (`docs/UI_DESIGN_DOC.md`)](./docs/UI_DESIGN_DOC.md)**: Visual aesthetic, design tokens, typography pairing (Inter + JetBrains Mono), responsive breakpoints, and component specs.
- **[Product Specification (`docs/PRODUCT_SPEC.md`)](./docs/PRODUCT_SPEC.md)**: Product philosophy, user personas, lead-time rules, and feature requirements.
- **[System Architecture (`docs/ARCHITECTURE.md`)](./docs/ARCHITECTURE.md)**: Database ERD, deterministic conflict engine algorithms, and RBAC matrix.
- **[Database Migrations Guide (`docs/MIGRATIONS.md`)](./docs/MIGRATIONS.md)**: Versioned SQL migrations, ledger table architecture, dev/prod workflows, and CI/CD automation.
- **[Development Plan (`docs/DEVELOPMENT_PLAN.md`)](./docs/DEVELOPMENT_PLAN.md)**: Phased implementation roadmap, milestone checklist, and test scenarios.
- **[Changelog (`CHANGELOG.md`)](./CHANGELOG.md)**: Chronological record of vertical-slice domain architecture, features, and release milestones.

---

## 👥 User Roles & Access

| Role | Access Level | Description |
| :--- | :--- | :--- |
| **Students** | Public (No login) | Browse visual notice board, month/week calendar views, filter by club/category, and export to Google/Apple Calendar. |
| **Community Leads** | Authenticated (`/lead`) | Propose events for their assigned club with real-time clash warnings and automatic "Safe Slot" suggestions. |
| **Vice Principal** | Authenticated (`/principal`) | Executive sign-off authority: review Safe-Slot cleared club proposals, grant institutional approval, or decline with feedback. |
| **College Principal** | Authenticated (`/principal`) | Executive sign-off authority: institutional approval, master schedule triage, and policy enforcement. |
| **Campus Admin** | Authenticated (`/admin`) | Operations management: manage physical venues, user accounts, and campus clubs. |

### Pre-seeded Demo Accounts

| Role | Email | Password | Assigned Community |
| :--- | :--- | :--- | :--- |
| **College Principal** | `principal@campus.edu` | `principal123` | Institutional Authority |
| **Campus Admin** | `admin@campus.edu` | `admin123` | Campus-Wide Operations |
| **Coding Club Lead** | `lead.coding@campus.edu` | `lead123` | Coding Club |
| **Design Society Lead** | `lead.design@campus.edu` | `lead123` | Design Society |
| **E-Cell Lead** | `lead.ecell@campus.edu` | `lead123` | Entrepreneurship Cell |

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 16.4.3](https://nextjs.org) (App Router, Turbopack)
- **Frontend**: [React 19.2.8](https://react.dev), [Tailwind CSS v4](https://tailwindcss.com)
- **Database & ORM**: PostgreSQL / [Supabase](https://supabase.com), [Drizzle ORM](https://orm.drizzle.team)
- **Testing**: [Vitest 5.0.5](https://vitest.dev) (42 test suites, 354 unit & integration tests)
- **Icons & Utilities**: `lucide-react`, `date-fns` v4, `clsx`, `tailwind-merge`, `zod`

---

## 🏛️ Institutional Configuration & White-Labeling

SaveSlot uses an environment-driven single-instance configuration model (`src/lib/config/campus.ts`). Deployments adapt to any college campus simply by supplying `.env` variables:

```env
# Institutional Identity (Required in production)
NEXT_PUBLIC_CAMPUS_NAME="Albertian Institute of Science and Technology"

# Smart Auto-Derivation (Optional overrides)
# NEXT_PUBLIC_CAMPUS_SHORT_NAME="AISAT"    # Auto-derived as acronym if omitted
# NEXT_PUBLIC_CAMPUS_SLUG="aisat"          # Auto-derived as slug if omitted
# NEXT_PUBLIC_CAMPUS_TIMEZONE="Asia/Kolkata" # Default: Asia/Kolkata
# NEXT_PUBLIC_CAMPUS_EMAIL_DOMAIN="aisat.edu" # Default: campus.edu
```

The configuration is validated at server boot time and dynamically injected across:

- Top navigation bar & layout headings
- Login, forgot-password, and reset-password portals
- Page `<title>` tags, meta descriptions, and OpenGraph cards
- Web app manifest (`site.webmanifest`) and SEO sitemaps
- iCalendar (`.ics`) file exports and Google Calendar event organizer attributes

---

## 🚀 Getting Started

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and configure your institutional identity and database credentials:

```bash
cp .env.example .env
```

SaveSlot supports a **Hybrid Database Configuration**:

- **Option 1 (Recommended)**: Provide a unified `DATABASE_URL` (standard for Supabase, Neon, and Drizzle Kit):

  ```env
  DATABASE_URL=postgresql://postgres.your-ref:your-password@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require
  ```

- **Option 2 (Discrete Parameters)**: Provide individual `DB_*` variables (`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`). Migration scripts, Drizzle Kit, and runtime connection pools automatically construct the connection URL with URL-encoded credentials when `DATABASE_URL` is omitted.

### 3. Run Database Migrations

```bash
# Check ledger status of applied and pending migrations
pnpm db:migrate:status

# Apply pending migrations safely
pnpm db:migrate
```

### 4. Seed Development Data (Optional)

```bash
pnpm db:seed
```

### 5. Run Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## 🧪 Testing & Code Quality

SaveSlot maintains strict quality checks across TypeScript, ESLint, unit testing, and production builds:

```bash
# Run unit & integration tests (354 tests across 42 suites)
pnpm test

# Run tests in watch mode
pnpm test:watch

# TypeScript typechecking (0 errors)
pnpm typecheck

# ESLint analysis
pnpm lint

# Master validation pipeline (Migration check + Typecheck + Lint + Test + Build)
pnpm validate
```

---

## 🔒 Security & Concurrency Architecture

- **Atomic Auth Rate Limiting**: Distributed PostgreSQL rate-limiting table (`auth_rate_limits`) with atomic upserts (`.insert().onConflictDoUpdate()`) and rolling-window in-memory L1 cache to prevent race conditions during concurrent brute-force attacks (5 failed attempts -> 5-minute lockout).
- **Strict Multi-Tenant Scoping**: All Lead, Principal, and Admin queries verify `campus_id` associations, returning `403 Forbidden` for unassociated accounts to eliminate cross-tenant data leaks.
- **Open Redirect Protection**: Enforced strict origin resolution against `window.location.origin` and backslash (`\`) normalization rejection.
- **Server-Side Conflict Guard**: Transactional 409 conflict detection enforcing the mandatory 7-day prior notice policy and double-booking prevention.
- **Defensive HTTP Headers**: Configured with OWASP recommendations (`X-XSS-Protection: 0`, `Strict-Transport-Security: max-age=31536000; includeSubDomains`).

---

## 📦 Production Build

```bash
# Verify production Turbopack build
pnpm build

# Start production server
pnpm start
```
