import { z } from "zod";

const postgresUrl = z
  .string()
  .min(1)
  .refine(
    (value) => value.startsWith("postgres://") || value.startsWith("postgresql://"),
    "DATABASE_URL must use the postgres:// or postgresql:// scheme.",
  );

const serverEnvSchema = z.object({
  DATABASE_URL: postgresUrl,
});

export const serverEnv = serverEnvSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
});
