# Data Model

## TransformationRun

Represents one transformation/validation execution lifecycle. Summary counters are persisted for efficient review dashboards.

## SourceRecord

Stores one synthetic source object as JSON plus relational run identity and external ID.

## TransformedRecord

Stores the target representation derived from exactly one source record. In addition to the one-to-one `sourceRecordId` constraint, a composite `(runId, sourceRecordId)` foreign key guarantees that a transformed record cannot point to a source record owned by another run.

## TransformationRule

Versioned metadata describing deterministic field transformations. Runtime execution is intentionally deferred to M2.

## ValidationRule

Versioned metadata describing deterministic checks and severity.

## ValidationResult

Persisted evidence for a validation rule applied to a transformed record. Seeded completed runs persist PASS/WARNING/FAIL evidence rather than storing exceptions only. A composite `(runId, transformedRecordId)` foreign key guarantees that validation evidence cannot be attached to a transformed record from a different run.

## AuditEvent

Append-oriented lifecycle evidence scoped to a run. Synthetic fixtures use explicit deterministic timestamps so seeded lifecycle ordering remains internally consistent regardless of when the seed command is executed.

## Relational constraints

The schema keeps run/rule/result/audit metadata relational while allowing flexible synthetic record payloads in PostgreSQL JSONB fields. Run-scoped composite foreign keys protect the most important cross-table integrity invariants before the M2 service layer exists.
