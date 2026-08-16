# TransformOps

**Enterprise Data Transformation & Validation Console**

> **Independent Candidate Demonstrator**  
> TransformOps is an independent portfolio project by Dušan Cabala, created using publicly available information about the SNP Slovakia Trainee R&D role as general inspiration for the technical scope. It uses synthetic data only. It is not an SNP product, is not affiliated with SNP, and does not represent SNP, SAP, CrystalBridge, customer environments, internal architecture, migration methods or proprietary processes.

## Current implementation status — M0 + M1 Foundation & M2 Domain Engine

This repository contains the verified M0/M1 runtime foundation and **M2 Domain Engine**:

- Next.js + TypeScript + Tailwind application shell;
- PostgreSQL domain model in Prisma with composite foreign key integrity constraints;
- Run state machine (`DRAFT` -> `READY` -> `RUNNING` -> `VALIDATING` -> `COMPLETED`/`FAILED`) with terminal state enforcement and non-mutating retry run specifications;
- Pure, deterministic transformation rules engine (`COUNTRY_MAP`, `UNIT_MAP`, `TRIM`, `LOWERCASE`, `IDENTITY`) for customer and material domain rules without dynamic code execution;
- Pure, deterministic validation engine (`REQUIRED`, `EXACT_LENGTH`, `REGEX`, `ENUM`, `RANGE`, `REFERENCE_EXISTS`, `UNIQUE`) mapping reason codes (`REQUIRED_VALUE_MISSING`, `INVALID_COUNTRY_CODE`, `INVALID_EMAIL`, `UNMAPPED_UNIT`, `VALUE_OUT_OF_RANGE`, `DUPLICATE_TARGET_KEY`, `UNKNOWN_REFERENCE`, `TRANSFORMATION_ERROR`);
- 40 automated pure unit tests in Vitest covering state transitions, retry semantics, customer/material transformations, validation rules, reason codes, and edge inputs;
- Deterministic synthetic seed definitions and smoke checks (`npm run db:check`).

The following are **not started yet** and must not be claimed as functional:

- API surface and workflow execution service (M3);
- Operational dashboard UI and run explorer;
- Authentication;
- SAP/ABAP integration;
- CrystalBridge emulation;
- Vercel/Neon deployment.

## Runtime validation status

The complete verification gate has been executed and verified passing:

- `package-lock.json` is generated and committed;
- deterministic dependencies installed cleanly via `npm ci`;
- Prisma Client generated successfully;
- database migration chain applied cleanly (`20260814194200_init`, `20260815100500_foundation_audit_repairs`, `20260815123000_add_transformed_records_run_id_source_record_id_key`);
- synthetic seed executed and verified against exact fixture invariants;
- 40 automated unit tests passing cleanly in Vitest;
- database smoke-check (`npm run db:check`), ESLint, TypeScript typecheck, Vitest, and Next.js production build all pass cleanly.

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
