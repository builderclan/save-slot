# Contributing to SaveSlot

Thank you for your interest in contributing to SaveSlot! We welcome bug reports, feature enhancements, documentation improvements, and architectural suggestions.

---

## Code of Conduct

Please treat all members of the community with dignity, respect, and professionalism. We are dedicated to providing a welcoming, inclusive, and harassment-free environment for everyone.

---

## Getting Started

### Prerequisites

- **Node.js**: v20 or higher
- **pnpm**: v10 (`npm install -g pnpm`)
- **PostgreSQL**: PostgreSQL 15+ (or Supabase local/cloud project)

### Local Development Setup

1. **Fork and clone** the repository:

   ```bash
   git clone https://github.com/your-org/saveslot.git
   cd saveslot
   ```

2. **Install dependencies**:

   ```bash
   pnpm install
   ```

3. **Configure environment**:
   Copy `.env.example` to `.env` and fill in your Supabase & PostgreSQL credentials:

   ```bash
   cp .env.example .env
   ```

4. **Run database migrations**:

   ```bash
   pnpm db:migrate:status
   pnpm db:migrate
   ```

5. **Run the development server**:

   ```bash
   pnpm dev
   ```

   Open [http://localhost:3000](http://localhost:3000) to see the application.

---

## Coding Standards & Design Guidelines

- **Next.js 16 (App Router)**: Adhere to Turbopack conventions and Next.js 16 file-system routing. Notice that edge route proxies use `src/proxy.ts` (Next.js 16 convention replacing `middleware.ts`).
- **Styling**: Tailwind CSS v4. Avoid generic SaaS templates, neon pulses, rainbow gradients, and AI clichés. Maintain a quiet, high-craft Linear / Apple aesthetic.
- **Type Safety**: Write clean, strict TypeScript. Validate all API boundaries with **Zod 4**.
- **Database Safety**: Never run unbounded queries without limits. Always parameterize queries (`$1, $2, ...`) via `src/lib/db.ts` to prevent SQL injection.
- **Concurrency**: Use explicit PostgreSQL row locks (`SELECT ... FOR UPDATE` inside `withTransaction`) when updating event approval states.

---

## Quality & Validation Pipeline

Before submitting a pull request, run the complete validation suite:

```bash
pnpm validate
```

This runs:

1. `pnpm typecheck` (TypeScript strict mode)
2. `pnpm lint` (ESLint 9)
3. `pnpm test` (Vitest unit tests)
4. `pnpm build` (Production Turbopack build)

---

## Pull Request Guidelines

1. **Branch Naming**:
   - `feature/your-feature-name`
   - `fix/issue-description`
   - `refactor/component-name`
2. **Atomic Commits**: Keep changes logical, self-contained, and well-described using [Conventional Commits](https://www.conventionalcommits.org/) format (e.g. `feat(events): add recurring conflict checks`, `fix(auth): wrap user creation in transaction`).
3. **Tests**: Ensure any new business logic, API routes, or validation schemas are accompanied by unit tests under `__tests__/`.
