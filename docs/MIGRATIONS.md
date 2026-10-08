# Database Migrations Architecture & Operations Guide

This guide details SaveSlot's database migration strategy (**Option A: Timestamped/Sequenced SQL Files with Ledger Table & GitHub Actions**), explaining how schema changes are safely tested in development and deployed to production without data loss or race conditions.

---

## 1. System Overview

Database migrations in SaveSlot use a versioned ledger table pattern:
1. **Migration Files**: Stored under [`migrations/`](file:///c:/Users/main/codinways/builderclan/calendar-bc/migrations) as ordered SQL files (`001_...sql`, `002_...sql`, etc.).
2. **Ledger Table**: Tracks executed migrations in PostgreSQL (`public._schema_migrations`).
3. **Migration Runner**: [`scripts/migrate.js`](file:///c:/Users/main/codinways/builderclan/calendar-bc/scripts/migrate.js) executes pending migrations within transactions, guarded by PostgreSQL advisory locks.
4. **CI/CD Automation**: [`.github/workflows/db-migrate.yml`](file:///c:/Users/main/codinways/builderclan/calendar-bc/.github/workflows/db-migrate.yml) runs migrations upon merge to `main` using repository secrets.

```mermaid
flowchart TD
    subgraph Local [Developer Machine (Dev Environment)]
        DevCode[Write Migration: migrations/00X_xxx.sql] --> DevStatus[pnpm db:migrate:status]
        DevStatus --> DevMigrate[pnpm db:migrate]
        DevMigrate --> DevDB[(Dev PostgreSQL / Supabase)]
    end

    subgraph GitHub [GitHub Actions CI/CD (Prod Environment)]
        PR[Merge PR to main] --> Workflow[db-migrate.yml Workflow]
        Workflow --> LockCheck[Acquire pg_advisory_lock]
        LockCheck --> LedgerCheck[Compare _schema_migrations]
        LedgerCheck --> RunPending[BEGIN -> Run SQL -> INSERT Ledger -> COMMIT]
        RunPending --> ProdDB[(Production PostgreSQL / Supabase)]
        RunPending --> ReleaseLock[Release Lock & Notify]
    end

    subgraph Vercel [Vercel Hosting]
        VercelDeploy[Deploy Web Application]
        Note[Runs Next.js App Router ONLY<br/>Zero DB Migrations in Build Step]
    end

    PR --> VercelDeploy
```

---

## 2. Managing Two Environments: `dev` and `prod`

### Development Environment
- Connected via `.env` or `.env.local` pointing to your development database (e.g. local Docker Postgres or a Dev Supabase project).
- Run commands:
  ```bash
  # Check which migrations are pending vs applied
  pnpm db:migrate:status

  # Preview pending migrations without executing
  pnpm db:migrate --dry-run

  # Apply pending migrations
  pnpm db:migrate
  ```

### Production Environment
- Production database credentials are stored in **GitHub Repository Secrets**:
  - `PROD_DB_HOST` (or `DB_HOST`)
  - `PROD_DB_PORT` (default: `6543`)
  - `PROD_DB_USER`
  - `PROD_DB_PASSWORD`
  - `PROD_DB_NAME` (default: `postgres`)
  - `DB_SSL_REJECT_UNAUTHORIZED` (`false`)
- Migrations deploy automatically when code merges to `main`.
- Can also be triggered manually via GitHub Actions **Run workflow** (`workflow_dispatch`) with environment selection.

---

## 3. Why Migrations Must NEVER Run on Vercel

A common anti-pattern is executing database migrations inside `next build` or serverless API routes on Vercel. In SaveSlot, this is strictly prohibited for the following reasons:

| Risk | Vercel Build / Serverless Migrations | GitHub Actions Workflow (SaveSlot) |
| :--- | :--- | :--- |
| **Concurrent Race Conditions** | Parallel preview builds and production builds execute DDL at the same time, leading to deadlock or corrupted ledger records. | Guaranteed sequential execution (`cancel-in-progress: false`, advisory locks). |
| **Failed Deploys & Dirty State** | If `next build` runs a migration and then fails on a TypeScript error, the DB is already mutated while deployment is aborted. | CI tests (`lint`, `typecheck`, `test`) must pass before production deployment. |
| **Connection Starvation** | Serverless function invocations spin up dozens of ephemeral instances; migrating in handlers exhausts connection limits. | Runs a single dedicated client instance with an advisory lock. |
| **Execution Timeouts** | Vercel build & serverless steps have rigid timeouts (10s - 15s). Large DDL changes can time out mid-execution. | GitHub Actions provides ample job timeouts for transactional DDL. |

---

## 4. How the Ledger Table Works

The migration runner ensures the table `public._schema_migrations` exists:

```sql
CREATE TABLE IF NOT EXISTS public._schema_migrations (
  name VARCHAR(255) PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Transaction Safety
Each migration `.sql` file is executed inside its own PostgreSQL transaction:
```sql
BEGIN;
-- Migration SQL executed here
INSERT INTO public._schema_migrations (name, applied_at) VALUES ($1, NOW());
COMMIT;
```
If any error occurs, the runner issues an immediate `ROLLBACK;`, reports the line and error message, and exits with code 1. No partial table or column mutations remain.

### Advisory Concurrency Locking
The runner acquires a PostgreSQL advisory lock (`pg_advisory_lock(7429184712)`) before inspecting the ledger and releases it in a `finally` block upon completion. This ensures no two CI runners or developer terminals can migrate the same database concurrently.

---

## 5. Authoring a New Migration

1. Create a new sequential `.sql` file in [`migrations/`](file:///c:/Users/main/codinways/builderclan/calendar-bc/migrations), for example:
   ```bash
   migrations/009_add_event_attendee_limit.sql
   ```
2. Write idempotent SQL where possible:
   ```sql
   -- Migration: 009_add_event_attendee_limit.sql
   ALTER TABLE events ADD COLUMN IF NOT EXISTS max_attendees INT DEFAULT 100;
   CREATE INDEX IF NOT EXISTS idx_events_max_attendees ON events (max_attendees);
   ```
3. Test the migration locally:
   ```bash
   pnpm db:migrate:status
   pnpm db:migrate
   ```
4. Run validation checks:
   ```bash
   pnpm validate
   ```
5. Commit and open a PR. Once reviewed and merged, GitHub Actions safely deploys the change to production.
