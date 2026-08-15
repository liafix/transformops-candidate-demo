# Runtime database setup

TransformOps uses PostgreSQL with two optional connection roles:

- `DATABASE_URL`: application/runtime connection. With a serverless provider, prefer the pooled endpoint.
- `DIRECT_URL`: Prisma CLI connection for migrations. Prefer the provider's direct/non-pooler endpoint.

## Required local runtime

Use Node.js 22 LTS (22.12 or newer). The repository has `.nvmrc` and a preinstall guard so unsupported local runtimes fail early rather than producing misleading dependency warnings.

## Local `.env`

Create `.env` from `.env.example` and paste the real database connection strings. Do not commit `.env`.

For an isolated demo database that may be reset and seeded, set:

```env
DEMO_SEED_RESET_ALLOWED="true"
```

Do not enable this flag against any shared or production database containing data you need to keep.

## Verification sequence

After environment variables are configured:

```bash
npm install
npm run verify:foundation
```

`verify:foundation` runs Prisma generation, deployed migrations, deterministic synthetic seed, DB smoke checks, lint, TypeScript checking, tests, and the production build in sequence.

## Deployment generation safety

The project runs `prisma generate` in both `postinstall` and `build`. The generated Prisma Client is intentionally not committed, so clean CI/Vercel environments must generate it during installation/build.

## Status rules

Do not claim migrations, seed, tests, or production build as passing until the commands have actually completed successfully in a networked environment with PostgreSQL available.
