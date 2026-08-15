# Synthetic Data Policy

All seeded content is synthetic and exists only to exercise the candidate-demonstrator data model.

Rules:

- no real SNP, SAP, CrystalBridge or customer data;
- no real personal data;
- fictional organization names include `Synthetic`;
- demo email addresses use `example.test`;
- identifiers use `SYN` markers;
- source/target system names are generic fictional labels;
- fixture timestamps are deterministic and do not claim real migration activity.

The seed targets 54 source records across customer and material scenarios. Four completed runs contain 44 transformed records and 112 persisted validation results, including PASS evidence. The `TR-1045` run is intentionally left in `READY` state with ten source records and no transformed/validation rows for a later approved interactive workflow.

## Destructive reset guard

`prisma db seed` clears existing TransformOps demo rows before recreating the deterministic fixture set. The seed refuses to run unless:

```text
DEMO_SEED_RESET_ALLOWED=true
```

Set this only for an isolated demo database. It is intentionally `false` in `.env.example`; CI explicitly opts in for its disposable PostgreSQL service.
