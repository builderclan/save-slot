## Problem

<!-- 
Describe the problem this pull request addresses. 
Why is this change necessary? What is the current behavior, limitation, or bug?
Link related issues: e.g., Fixes #123, Closes #456 
-->

## Solution

<!-- 
Explain your solution and implementation approach.
- What key changes or additions were made?
- What architectural or design decisions were taken?
- Which areas/personas are affected? (Student Notice Board, Lead Workspace, Principal Desk, Admin Infrastructure, Conflict Engine, Auth/RLS, Database Migrations)
-->

## Type of Change

- [ ] `fix`: Bug fix (non-breaking change fixing an issue)
- [ ] `feat`: New feature (non-breaking change adding functionality)
- [ ] `refactor`: Code restructuring or performance optimization
- [ ] `docs`: Documentation update or specifications
- [ ] `security`: Vulnerability remediation or security hardening
- [ ] `chore`: Tooling, dependencies, or configuration updates

## Breaking Changes / Migration Notes

<!-- 
Does this introduce breaking API/schema modifications, new environment variables,
or post-deploy migration/seed requirements? If none, state "None".
-->

## Tests

<!-- 
Describe how you tested these changes.
- Which automated unit/integration/E2E tests were added or modified?
- What manual testing steps were executed across viewports (mobile 360px & desktop)?
-->

### Verification Checklist

- [ ] `pnpm validate` passed (or all individual checks below):
  - [ ] `pnpm typecheck` passed (0 TypeScript errors)
  - [ ] `pnpm lint` passed (0 ESLint errors or warnings)
  - [ ] `pnpm test` passed (all unit and integration test suites pass)
  - [ ] `pnpm build` verified (production Next.js 16 / Turbopack build succeeds)
  - [ ] Database migrations verified (`pnpm db:migrate:check` / `pnpm db:migrate:status` if applicable)
- [ ] Mobile responsive layout verified (tested on 360px viewport e.g. Galaxy A55)
- [ ] No secrets, credentials, or sensitive `.env` values committed

## Screenshots or Recordings (if UI changes)

<!-- Attach mobile (360px) and desktop screenshots or screen recordings showcasing the visual flow. -->
