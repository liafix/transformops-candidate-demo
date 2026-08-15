# Foundation re-audit blocker repair

## Scope

This repair addresses only the source-level blocker found during the M0+M1 foundation re-audit. M2 domain-engine work has not started.

## Fixed regression

`prisma/seed.ts` previously attempted to include `transformedRecords` and `validationResults` through `TransformationRun`. Those reverse relation fields are intentionally absent from the repaired Prisma schema after run-scoped composite relations were introduced.

The seed verification now:

1. selects only `id` and `status` from `TR-1045`;
2. counts source, transformed, and validation records directly by `runId`;
3. asserts that `TR-1045` is `READY`, has exactly 10 source records, and has no transformed or validation evidence.

This matches the existing database smoke-check strategy in `scripts/test-database.ts` and preserves the run-scoped integrity model.

## Remaining external gate

`package-lock.json` is still not present because the artifact environment cannot reach the npm registry. Runtime verification therefore remains unclaimed. A networked environment must generate and commit the lockfile before running the full foundation runtime gate.
