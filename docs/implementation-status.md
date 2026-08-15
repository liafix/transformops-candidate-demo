# Implementation Status

**Batch:** M0 + M1 foundation + foundation-audit source repairs  
**Status:** SOURCE REPAIRS APPLIED / LOCKFILE + RUNTIME GATES PENDING  
**Date:** 2026-08-15

## Implemented

- repository scaffold;
- Next.js/TypeScript/Tailwind configuration;
- PostgreSQL Prisma schema;
- initial migration plus run-integrity repair migration;
- deterministic synthetic seed definitions;
- persisted PASS/WARNING/FAIL evidence for completed fixtures;
- deterministic audit timestamps;
- destructive seed reset guard;
- environment contract;
- Prisma adapter/singleton boundary;
- local PostgreSQL Compose file;
- database smoke-check assertions;
- deterministic-`npm ci` CI contract;
- README/disclaimer/non-claims.

## Foundation audit repairs applied

- ESM package mode added for Prisma 7 (`"type": "module"`);
- Node engine range restricted to supported LTS lines and CI pinned to Node 22.12.0;
- TypeScript minimum raised to 5.4 and TS target moved to ES2023;
- cross-run record/result integrity enforced with composite foreign keys;
- completed seed runs now persist positive validation evidence;
- seeded audit/event timestamps are deterministic;
- destructive seed reset requires explicit opt-in;
- Prisma adapter allocation occurs only when a new client is constructed;
- CI no longer falls back to `npm install` when the lockfile is absent.

## Still pending

A real `package-lock.json` cannot be generated in the artifact environment because npm registry/DNS access is unavailable. CI intentionally fails the lockfile precheck until a networked environment runs:

```bash
npm run lockfile:generate
```

and commits the resulting `package-lock.json`.

Dependency installation and database/runtime commands are also unverified here because this environment has no usable npm registry access and no Docker/PostgreSQL runtime.

## Next gate

1. Generate and commit `package-lock.json` in a networked environment.
2. Run the foundation verification gate against PostgreSQL.
3. Perform foundation re-audit.
4. Only after a clean re-audit, approve M2 domain-engine implementation.
