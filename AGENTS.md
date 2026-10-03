<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project Rules • SaveSlot (Campus Events & Scheduling)

## Core

* **Understand Before Changing**: Understand the existing codebase, routes, and component tree before making edits.
* **Smallest Effective Change**: Make the smallest change that solves the problem. Do not modify unrelated code.
* **Reuse Patterns**: Reuse existing components, utilities, database helpers, and UI patterns. Avoid unnecessary abstractions and over-engineering.
* **Human-Looking Craft**: Write clean, readable, maintainable code. Preserve existing comments, docstrings, and types.
* **No AI Clichés**: Avoid generic SaaS templates, neon pulse pills, rainbow gradient stripes, sparkles, and fake metric widgets. Maintain a quiet, high-craft Linear / Apple aesthetic.

## Tech Stack & Conventions

* **Package Manager**: Strictly use **pnpm** (`pnpm run dev`, `pnpm build`, `pnpm add`). Respect `pnpm-lock.yaml`.
* **Framework**: Next.js 16 (App Router with Turbopack) & React 19.
  * Respect Server Components vs. Client Components (`"use client"`).
  * API routes live under `src/app/api/.../route.ts`.
* **Styling**: Tailwind CSS v4 (`@tailwindcss/postcss`) with custom utility classes.
* **Icons & Helpers**: Use `lucide-react` for icons and `date-fns` for date/time formatting.
* **Database**: Supabase / PostgreSQL (`@supabase/ssr`, `@supabase/supabase-js`).
  * Never run destructive migrations without permission.
  * Enforce default limits/pagination; avoid unbounded queries and N+1 queries.

## Mobile & UI/UX Standards

* **Mobile-First & Edge-to-Edge**: On mobile viewports (e.g. 360px Galaxy A55):
  * Lists and queues must be edge-to-edge full width with clean hairline dividers (`divide-y`).
  * Never cram wide desktop data tables into narrow screens — render mobile-optimized list rows.
  * Prevent awkward multi-line text wrapping on buttons (`whitespace-nowrap`, responsive stacking).
* **Tactile & Responsive**:
  * Provide active touch feedback (`active:bg-slate-100/70`, `active:scale-[0.98]`).
  * Provide instant visual confirmation and handle loading/empty states cleanly.

## Performance & State

* **Search & Filters**: Debounce or memoize search queries and filter pipelines.
* **Avoid Wasteful Re-renders**: Use `useMemo` / `useCallback` for derived event lists and expensive calculations.
* **Build Verification**: Verify production builds with `pnpm build` before declaring tasks complete.

## Refactoring & Legacy Code

* **Prune Dead Code Proactively**: Remove unused imports, obsolete helpers, and replaced logic.
* **Respect Preserved Markers**: NEVER delete code or comments marked `# DO NOT REMOVE`, `# KEEP`, or `# BACKWARD COMPATIBILITY`.
* **Verify Before Deletion**: Search workspace (`grep_search`) before deleting any helper or export to ensure nothing else imports it.

## Git & Workflow

* **Atomic Commits Only**: Never bundle unrelated concerns. Keep fixes, features, and refactors separate.
* **Mandatory Pre-Commit Plan**: Before committing, always present a numbered plan showing:
  * Commit message (`type(scope): message`)
  * Target files
  * Purpose
  * **Wait for explicit user approval before staging or committing.**
* **Never Discard User Changes**: Keep user modifications (such as `next.config.ts`) intact.
* **Permissions**:
  * **Always ask before committing.**
  * **Always ask before pushing.**
  * Never force-push without explicit permission.

## Completion Checklist

Before declaring a task done:

1. Verify functionality and build (`pnpm build`).
2. Verify visual appearance across viewports (mobile 360px & desktop 1280px).
3. Review `git diff` and `git status`.
4. Report changes clearly and ask before committing or pushing.
