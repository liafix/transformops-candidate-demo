# Jules Task — Complete M0 + M1 Runtime Foundation

Work only on the M0 + M1 runtime foundation for TransformOps. Read `AGENTS.md` first and obey it as the task contract.

## Goal
Turn the current source-approved foundation into a runtime-verified foundation in a clean cloud environment, without starting M2.

## Required work
1. Use Node 22.12+.
2. Install dependencies and create/commit a deterministic `package-lock.json`.
3. Ensure Prisma Client generation works in a clean checkout without production database secrets.
4. Start an ephemeral/local PostgreSQL instance if needed for verification (Docker is acceptable).
5. Set non-secret local runtime variables for that ephemeral DB only.
6. Apply the existing Prisma migration chain.
7. Run the synthetic seed and verify the documented fixture invariants.
8. Run the database smoke check.
9. Run lint, typecheck, tests, and production build.
10. Fix every demonstrated M0/M1 root cause until the full gate passes.
11. Ensure `.github/workflows/ci.yml` passes with `npm ci` and its PostgreSQL service.
12. Open a PR with evidence.

## Known prior runtime symptoms
A previous Windows run used Node 20 and had no `DIRECT_URL`, so `prisma generate` failed, which cascaded into missing generated Prisma Client imports and TypeScript errors. Docker was not installed locally. The source package has already been repaired to use Node 22.x, generation-safe Prisma config, `postinstall: prisma generate`, and a build command that generates Prisma Client before Next.js build. Verify these fixes; do not assume them.

## Hard stop
Do not implement transformation rules, validation engine, state machine behavior, feature APIs, product dashboard functionality, authentication, SAP/ABAP, or deployment. Those belong to later workflow phases.

## Final report format
Return:
- commit/PR link
- lockfile status
- DB migration status
- seed counts
- db:check result
- lint result
- typecheck result
- test result (including how many tests actually ran)
- build result
- GitHub Actions result
- remaining risks
- explicit statement: `M2 NOT STARTED`
