# TransformOps Agent Contract

## Project classification
TransformOps is an independent candidate demonstrator for a job application. It uses synthetic data only. It is not an SNP product, is not affiliated with SNP, and must not claim to model SNP, SAP, CrystalBridge, customer environments, internal architecture, migration methods, or proprietary processes.

## Current workflow gate
Only M0 + M1 foundation work is allowed in the current task. Do NOT start M2 domain functionality unless a later task explicitly authorizes it.

M0 + M1 scope:
- Next.js / TypeScript project foundation
- Prisma 7 / PostgreSQL wiring
- migrations and synthetic seed
- deterministic dependency lockfile
- CI verification
- database smoke checks
- lint, typecheck, tests, production build

Explicitly out of scope for this task:
- transformation engine
- validation engine
- run state machine implementation
- API feature surface
- operational dashboard UI
- authentication
- SAP/ABAP integration
- CrystalBridge emulation
- Vercel production deployment

## Runtime requirements
- Use Node 22.12+ (project pins Node 22.x).
- Commit `package-lock.json`.
- CI must use `npm ci`, never an `npm install` fallback.
- Never commit `.env`, database credentials, API keys, or other secrets.
- For runtime verification, prefer an ephemeral/local PostgreSQL instance (Docker is acceptable) or the repository CI PostgreSQL service. Do not require production database secrets just to prove the foundation.

## Acceptance gate
Do not describe the foundation as passing until all of these commands have actually succeeded in a clean environment:

1. `npm ci`
2. `npm run db:generate`
3. `npm run db:migrate:deploy`
4. `npm run db:seed`
5. `npm run db:check`
6. `npm run lint`
7. `npm run typecheck`
8. `npm test`
9. `npm run build`

Also verify GitHub Actions on the resulting PR/commit.

## Data invariants
Synthetic seed is expected to preserve the documented M0+M1 fixture shape:
- 5 transformation runs
- 54 source records
- 44 transformed records
- 112 validation results
- 26 audit events
- TR-1045 remains READY with source records only and no transformed/validation results

Do not weaken the run-scoped composite integrity constraints introduced by the foundation audit repairs.

## Change discipline
- Fix root causes, not symptoms.
- Keep changes minimal and reviewable.
- Do not redesign the approved database architecture without a demonstrated blocker.
- If generated Prisma client files are ignored, ensure clean install/build generates them automatically.
- Keep README implementation-status claims synchronized with actual evidence.
- A command that was not run is UNVERIFIED, not PASS.
- `vitest --passWithNoTests` is not evidence that domain tests exist; in M0+M1 there may be zero domain tests, so report that explicitly.

## PR handoff
Open a PR rather than pushing speculative fixes directly to main. The PR description must include:
- root causes found
- files changed
- exact commands executed
- exact pass/fail results
- GitHub Actions status
- remaining risks or unverified items
- explicit confirmation that M2 was not started
