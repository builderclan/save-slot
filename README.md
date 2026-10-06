# SaveSlot — Campus Notice Board & Event Scheduling SaaS

A centralized, conflict-free event discovery and scheduling platform built specifically for college campuses. Ensures every student event receives a verified **"Safe Slot"** (free of venue double-bookings and split audience clashes) while enforcing a mandatory **7-day prior notice policy**.

---

## 📚 Project Documentation

Detailed design documents, specifications, and architecture are maintained in [`docs/`](./docs):

- **[System Design Doc (`docs/DESIGN_DOC.md`)](./docs/DESIGN_DOC.md)**: Comprehensive architectural blueprint, concurrency control, connection resilience, and schema specs.
- **[UI / UX Design System (`docs/UI_DESIGN_DOC.md`)](./docs/UI_DESIGN_DOC.md)**: Visual aesthetic, design tokens, typography pairing (Inter + JetBrains Mono), responsive breakpoints, and component specs.
- **[Product Specification (`docs/PRODUCT_SPEC.md`)](./docs/PRODUCT_SPEC.md)**: Product philosophy, user personas, lead-time rules, and feature requirements.
- **[System Architecture (`docs/ARCHITECTURE.md`)](./docs/ARCHITECTURE.md)**: Database ERD, deterministic conflict engine algorithms, and RBAC matrix.
- **[Development Plan (`docs/DEVELOPMENT_PLAN.md`)](./docs/DEVELOPMENT_PLAN.md)**: Phased implementation roadmap, milestone checklist, and test scenarios.

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

- **Framework**: [Next.js 16](https://nextjs.org) (App Router, Turbopack)
- **Frontend**: [React 19](https://react.dev), [Tailwind CSS v4](https://tailwindcss.com)
- **Database**: PostgreSQL / [Supabase](https://supabase.com)
- **Icons & Utilities**: `lucide-react`, `date-fns` v4, `clsx`, `tailwind-merge`

---

## 🚀 Getting Started

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Configure Environment

Ensure your `.env` contains valid Supabase database credentials (see `.env.example`).

### 3. Run Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

### 4. Build for Production

```bash
pnpm build
pnpm start
```
