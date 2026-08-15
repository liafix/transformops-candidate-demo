import "dotenv/config";
import { defineConfig } from "prisma/config";

// Prisma loads this config even for `prisma generate`, which does not need a
// live database connection. Prefer the direct URL for CLI operations, fall
// back to the runtime URL, and finally to a non-secret local placeholder so
// client generation/builds do not fail before environment variables exist.
// Commands that actually access PostgreSQL (migrate/seed/studio) still require
// a real reachable URL.
const cliDatabaseUrl =
  process.env.DIRECT_URL ??
  process.env.DATABASE_URL ??
  "postgresql://transformops:transformops@127.0.0.1:5432/transformops?schema=public";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: cliDatabaseUrl,
  },
});
