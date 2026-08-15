# TransformOps

**Enterprise Data Transformation & Validation Console**

> **Independent Candidate Demonstrator**  
> TransformOps is an independent portfolio project by Dušan Cabala, created using publicly available information about the SNP Slovakia Trainee R&D role as general inspiration for the technical scope. It uses synthetic data only. It is not an SNP product, is not affiliated with SNP, and does not represent SNP, SAP, CrystalBridge, customer environments, internal architecture, migration methods or proprietary processes.

## Current implementation status — M0 + M1 foundation

This repository currently contains the **foundation codebase only**, including foundation-audit source repairs:

- Next.js + TypeScript + Tailwind application shell;
- PostgreSQL domain model in Prisma;
- checked-in initial migration plus a run-integrity repair migration;
- deterministic synthetic seed definitions for five transformation runs and 54 source records;
- 44 seeded transformed records and 112 persisted PASS/WARNING/FAIL validation results across completed fixtures;
- deterministic synthetic audit timestamps;
- destructive seed-reset guard;
- Prisma/PostgreSQL runtime client wiring;
- local PostgreSQL Docker Compose definition;
- database smoke-check assertions;
- CI contract that requires a committed lockfile and uses `npm ci` only;
- candidate-demo `noindex` metadata and visible disclaimer.

The following are **not implemented yet** and must not be claimed as functional:

- runtime transformation rule engine;
- validation execution service;
- run state-machine enforcement;
- API surface beyond future planned work;
- operational dashboard, run explorer and audit UI;
- automated domain/API test suite;
- Vercel/Neon deployment.

## Runtime validation status

The M0 + M1 runtime foundation gate has been fully executed and verified:

- `package-lock.json` is generated and committed;
- deterministic dependencies installed cleanly via `npm ci`;
- Prisma Client generated successfully;
- database migration chain applied cleanly (`20260814194200_init`, `20260815100500_foundation_audit_repairs`);
- synthetic seed executed and verified against exact fixture invariants;
- database smoke-check (`npm run db:check`), ESLint, TypeScript typecheck, Vitest (`--passWithNoTests`), and Next.js production build all pass cleanly.

## Requirements

Use a Prisma-supported Node LTS line matching `package.json` (Node 22.12+ is the CI baseline), npm, and Docker with Compose or another PostgreSQL 17 instance.

## Local setup

```bash
cp .env.example .env
```

Edit `.env` and set the destructive demo-seed guard only for an isolated TransformOps database:

```text
DEMO_SEED_RESET_ALLOWED=true
```

Then run:

```bash
docker compose up -d
npm run lockfile:generate   # first networked setup only; commit package-lock.json
npm ci
npm run db:generate
npm run db:migrate:deploy
npm run db:seed
npm run db:check
npm run dev
```

## Foundation verification gate

```bash
npm ci
npm run db:generate
npm run db:migrate:deploy
npm run db:seed
npm run db:check
npm run lint
npm run typecheck
npm test
npm run build
```

`npm test` currently allows an empty suite because M2 domain tests have not been implemented yet. That does **not** count as test coverage.

## Data model

Core relational entities:

- `TransformationRun`
- `SourceRecord`
- `TransformedRecord`
- `TransformationRule`
- `ValidationRule`
- `ValidationResult`
- `AuditEvent`

Run-scoped composite foreign keys prevent transformed records and validation results from referencing records belonging to another run. See [`docs/data-model.md`](docs/data-model.md).

## Synthetic data

The seed defines five demo runs:

- `TR-1041` — completed customer baseline;
- `TR-1042` — completed customer run with warnings;
- `TR-1043` — completed customer run with mixed synthetic failures;
- `TR-1044` — completed material normalization run;
- `TR-1045` — ready customer run reserved for the later interactive workflow.

All organizations, identifiers, email addresses and record values are synthetic. Domains use the reserved `.test` namespace where applicable.

## Planned next phase

The next approved implementation batch remains **M2 — Domain Engine**, but it is blocked until the foundation re-audit passes:

1. transformation rule functions;
2. validation rule functions;
3. reason-code contract;
4. run state machine;
5. unit tests for those pure modules.

No M2 implementation is included in this foundation repair batch.

## License / usage

Portfolio candidate demonstrator. Not intended for production data migration or safety-critical use.
