# Architecture — M0 + M1 Foundation

TransformOps is planned as a Next.js full-stack modular monolith with PostgreSQL as the source of persisted truth.

The current batch deliberately implements only the foundation layers:

```text
Next.js application shell
        |
        +-- Prisma client adapter boundary
        |
PostgreSQL relational model
        |
        +-- deterministic synthetic seed baseline
        +-- initial migration + foundation integrity repair migration
```

Future approved phases will add pure transformation/validation functions, orchestration services, route handlers and the enterprise operations UI. Keeping these layers separate prevents database code, domain rules and React components from collapsing into one implementation unit.

## Run-scoped integrity chain

Descendant record ownership is enforced transitively instead of trusting duplicate scalar IDs in application code:

```text
TransformationRun
    ↓ run_id FK
SourceRecord (run_id, id)
    ↓ composite FK
TransformedRecord (run_id, source_record_id)
    ↓ composite FK
ValidationResult (run_id, transformed_record_id)
```

This prevents a transformed record or validation result from being attached to a record owned by another run.

## Runtime database policy

- application runtime: `DATABASE_URL`;
- Prisma CLI/migrations: `DIRECT_URL`;
- local Docker: both values may point to the same PostgreSQL instance;
- serverless deployment later may use pooled runtime + direct migration connections.

## Current non-claims

This batch is not a functional transformation engine and has not been runtime-validated in the artifact-generation environment.
