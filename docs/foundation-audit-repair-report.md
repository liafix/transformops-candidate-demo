# Foundation Audit Repair Report

**Date:** 2026-08-15  
**Scope:** M0 + M1 only. M2 domain-engine implementation remains intentionally untouched.

## Applied repairs

| Audit item | Repair |
|---|---|
| B1 — Prisma 7 ESM config | Added `"type": "module"`. |
| B2 — runtime contract | Restricted Node engines to Prisma-supported LTS lines, pinned CI to Node 22.12.0, raised TypeScript minimum to 5.4, moved TS target to ES2023. |
| B3 — nondeterministic CI fallback | Removed `npm install` fallback. CI now requires `package-lock.json` and runs `npm ci` only. Lockfile generation itself remains blocked by this artifact environment's unavailable npm registry/DNS. |
| H1 — cross-run integrity | Added composite run-scoped unique keys and composite foreign keys from transformed → source and validation result → transformed record; removed redundant descendant run FKs. |
| H2 — missing PASS evidence | Completed fixtures now persist PASS/WARNING/FAIL rule evidence. Expected seeded validation-result count is 112. |
| H3 — inconsistent audit time | Seeded run, record, validation and audit timestamps are explicit and deterministic. |
| M1 — destructive seed | Seed reset requires `DEMO_SEED_RESET_ALLOWED=true`; `.env.example` defaults to false and CI opts in explicitly. |
| M2 — Prisma singleton | Adapter creation now occurs only when a new Prisma client is instantiated. |
| M3 — TS target | Updated from ES2017 to ES2023. |

## Static checks completed in artifact environment

- JSON parsing: PASS (`package.json`, `tsconfig.json`, `FOUNDATION_STATUS.json`)
- YAML parsing: PASS (`compose.yaml`, `.github/workflows/ci.yml`)
- TypeScript/TSX parser syntax scan: PASS (no parse diagnostics in source files)
- Expected fixture math: 5 runs / 54 source / 44 transformed / 112 validation results / 26 audit events
- M2 code: not added
- Real secrets: not intentionally added

## Remaining external gate

`package-lock.json` could not be generated because the artifact environment cannot resolve the npm registry. A networked environment must run:

```bash
npm run lockfile:generate
npm ci
```

Then PostgreSQL migration/seed/static/build verification must run before the foundation can receive a clean runtime re-audit verdict.
