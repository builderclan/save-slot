# Drizzle ORM Migration Guide & Cleanup Tracker

## 1. Overview & Architectural Design

SaveSlot has adopted **Path A: Drizzle ORM for type-safe data access while preserving the custom PostgreSQL advisory-locked SQL runner (`scripts/migrate.js`) for database migrations**.

### Key Tenets

1. **Zero-Breaking Hybrid Setup**:
   [`src/lib/db.ts`](../src/lib/db.ts) exports both:
   - `db`: Type-safe Drizzle ORM client with full schema relations.
   - `query` / `withTransaction`: Direct `pg` connection pool query functions for legacy endpoints.
2. **Migrations Source of Truth**:
   - Schema DDL, PostgreSQL Row Level Security (RLS) policies, and stored procedures (`check_venue_conflict`) remain authored in [`migrations/*.sql`](../migrations).
   - Applied in development via `pnpm db:migrate`.
   - Applied in production via [`.github/workflows/db-migrate.yml`](../.github/workflows/db-migrate.yml) guarded by `pg_advisory_lock(7429184712)`.
   - Optional schema diffing: `pnpm db:generate` drafts new SQL migrations from [`src/db/schema/`](../src/db/schema) into `migrations/`.

---

## 2. Directory Structure

```
src/
├── db/
│   ├── adapters.ts              # Domain model adapters (camelCase <-> snake_case API contracts)
│   └── schema/
│       ├── campuses.ts          # Campuses table
│       ├── communities.ts       # Communities table
│       ├── community-members.ts # Community memberships table
│       ├── events.ts            # Events table
│       ├── index.ts             # Barrel export of all tables & relations
│       ├── relations.ts         # Relational query configurations (with: {})
│       ├── users.ts             # User profiles table (linked to auth.users)
│       └── venues.ts            # Venues table
└── lib/
    └── db.ts                    # Re-exports db, getDrizzleDb(), query, withTransaction
```

---

## 3. How to Migrate an Existing Endpoint (Standard Pattern)

Follow the pattern implemented in [`src/app/api/events/route.ts`](../src/app/api/events/route.ts):

### Step 1: Import Drizzle & Schema

```ts
import { db } from "@/lib/db";
import { events, communities, venues } from "@/db/schema";
import { eq, and, or, ilike, asc, desc, getTableColumns } from "drizzle-orm";
```

### Step 2: Choose the Right Drizzle API

#### Pattern A: Filtered Feeds & Multi-Table Search (Recommended)

Use Drizzle's Core Query Builder with direct SQL `innerJoin` / `leftJoin` to enable direct filtering and search across related tables without subqueries:

```ts
const rows = await db
  .select({
    ...getTableColumns(events),
    community: {
      id: communities.id,
      name: communities.name,
      slug: communities.slug,
      category: communities.category,
      logoUrl: communities.logoUrl,
    },
    venue: {
      id: venues.id,
      name: venues.name,
      building: venues.building,
      capacity: venues.capacity,
      address: venues.address,
      notes: venues.notes,
      isActive: venues.isActive,
    },
  })
  .from(events)
  .innerJoin(communities, eq(communities.id, events.communityId))
  .leftJoin(venues, eq(venues.id, events.venueId))
  .where(and(...conditions))
  .orderBy(asc(events.startTime))
  .limit(limit)
  .offset(offset);
```

#### Pattern B: Single-Resource Reads by ID

Use Drizzle's Relational API (`db.query.*`) when fetching a single parent record and its children where filtering on joined tables is not needed:

```ts
const event = await db.query.events.findFirst({
  where: eq(events.id, eventId),
  with: {
    community: true,
    venue: true,
  },
});
```

### Step 3: Adapt Output for Frontend Compatibility

Use [`src/db/adapters.ts`](../src/db/adapters.ts) to serialize `row` back to the exact snake_case JSON shape expected by existing UI components:

```ts
import { formatCampusEvent } from "@/db/adapters";

const formatted = rows.map(formatCampusEvent);
return NextResponse.json({ events: formatted });
```

### Step 4: Update Route Unit Test

Mock `db.select()` or `db.query` cleanly in Vitest without touching `query`:

```ts
vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn(),
  },
}));
```

---

## 4. Route Migration & Cleanup Tracker

### Phase 1: Core Read Endpoints

- [x] `GET /api/events` *(Reference Implementation)*
- [x] `GET /api/venues`
- [x] `GET /api/communities`
- [x] `GET /api/auth/me`

### Phase 2: Organizer / Lead Workspace Endpoints

- [x] `GET /api/lead/events`
- [x] `POST /api/lead/events`
- [x] `PUT /api/lead/events/[id]`
- [x] `DELETE /api/lead/events/[id]`

### Phase 3: Administration & Governance Endpoints

- [x] `DELETE /api/admin/events/[id]`
- [x] `POST /api/admin/events/[id]/status`
- [x] `GET /api/admin/venues`, `POST /api/admin/venues` & `PATCH /api/admin/venues`
- [x] `PATCH /api/admin/venues/[id]`, `DELETE /api/admin/venues/[id]`
- [ ] `GET /api/admin/communities` & `POST /api/admin/communities`
- [ ] `GET /api/admin/communities/[id]`, `PATCH /api/admin/communities/[id]`
- [ ] `GET /api/admin/users` & `POST /api/admin/users`
- [ ] `GET /api/admin/users/[id]`, `PATCH /api/admin/users/[id]`, `DELETE /api/admin/users/[id]`

### Phase 4: Core Domain Engines

- [ ] `src/lib/conflicts/engine.ts` (SafeSlot conflict check engine)
- [ ] `src/lib/campus.ts`
- [ ] `src/lib/auth.ts`

### Phase 5: Final Cleanup

- [ ] Verify 100% of endpoints have moved off legacy `query()` helper.
- [ ] Prune legacy raw SQL helper if no longer required.
- [ ] Run full test suite: `pnpm validate`.
