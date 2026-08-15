-- TransformOps initial schema baseline.
-- This SQL is checked in as the M1 migration baseline. It must be verified by
-- `prisma migrate deploy` against a real PostgreSQL instance before release claims.

CREATE TYPE "RunStatus" AS ENUM ('DRAFT', 'READY', 'RUNNING', 'VALIDATING', 'COMPLETED', 'FAILED');
CREATE TYPE "ObjectType" AS ENUM ('CUSTOMER', 'MATERIAL');
CREATE TYPE "TransformationRuleType" AS ENUM ('COUNTRY_MAP', 'UNIT_MAP', 'TRIM', 'LOWERCASE', 'IDENTITY');
CREATE TYPE "ValidationRuleType" AS ENUM ('REQUIRED', 'EXACT_LENGTH', 'REGEX', 'ENUM', 'RANGE', 'REFERENCE_EXISTS', 'UNIQUE');
CREATE TYPE "ValidationSeverity" AS ENUM ('WARNING', 'ERROR');
CREATE TYPE "ValidationStatus" AS ENUM ('PASS', 'WARNING', 'FAIL');
CREATE TYPE "ReasonCode" AS ENUM ('REQUIRED_VALUE_MISSING', 'INVALID_COUNTRY_CODE', 'INVALID_DATE_FORMAT', 'INVALID_EMAIL', 'UNMAPPED_UNIT', 'INVALID_LENGTH', 'VALUE_OUT_OF_RANGE', 'DUPLICATE_TARGET_KEY', 'UNKNOWN_REFERENCE', 'TRANSFORMATION_ERROR');
CREATE TYPE "AuditEventType" AS ENUM ('RUN_CREATED', 'TRANSFORMATION_STARTED', 'TRANSFORMATION_COMPLETED', 'VALIDATION_STARTED', 'RULE_FAILED', 'VALIDATION_COMPLETED', 'VALIDATION_FAILED');
CREATE TYPE "EntityType" AS ENUM ('RUN', 'RECORD', 'RULE');

CREATE TABLE "transformation_runs" (
  "id" TEXT NOT NULL,
  "run_number" TEXT NOT NULL,
  "source_system" TEXT NOT NULL,
  "target_system" TEXT NOT NULL,
  "object_type" "ObjectType" NOT NULL,
  "status" "RunStatus" NOT NULL,
  "total_records" INTEGER NOT NULL DEFAULT 0,
  "passed_records" INTEGER NOT NULL DEFAULT 0,
  "warning_records" INTEGER NOT NULL DEFAULT 0,
  "failed_records" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "started_at" TIMESTAMP(3),
  "completed_at" TIMESTAMP(3),
  CONSTRAINT "transformation_runs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "source_records" (
  "id" TEXT NOT NULL,
  "run_id" TEXT NOT NULL,
  "external_id" TEXT NOT NULL,
  "object_type" "ObjectType" NOT NULL,
  "payload_json" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "source_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "transformed_records" (
  "id" TEXT NOT NULL,
  "run_id" TEXT NOT NULL,
  "source_record_id" TEXT NOT NULL,
  "external_id" TEXT NOT NULL,
  "payload_json" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "transformed_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "transformation_rules" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "object_type" "ObjectType" NOT NULL,
  "source_field" TEXT NOT NULL,
  "target_field" TEXT NOT NULL,
  "rule_type" "TransformationRuleType" NOT NULL,
  "configuration_json" JSONB NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "transformation_rules_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "validation_rules" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "object_type" "ObjectType" NOT NULL,
  "field_name" TEXT NOT NULL,
  "rule_type" "ValidationRuleType" NOT NULL,
  "severity" "ValidationSeverity" NOT NULL,
  "configuration_json" JSONB NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "validation_rules_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "validation_results" (
  "id" TEXT NOT NULL,
  "run_id" TEXT NOT NULL,
  "transformed_record_id" TEXT NOT NULL,
  "validation_rule_id" TEXT NOT NULL,
  "status" "ValidationStatus" NOT NULL,
  "reason_code" "ReasonCode",
  "actual_value" TEXT,
  "expected_value" TEXT,
  "message" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "validation_results_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "audit_events" (
  "id" TEXT NOT NULL,
  "run_id" TEXT NOT NULL,
  "event_type" "AuditEventType" NOT NULL,
  "entity_type" "EntityType" NOT NULL,
  "entity_id" TEXT,
  "payload_json" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "transformation_runs_run_number_key" ON "transformation_runs"("run_number");
CREATE INDEX "transformation_runs_status_idx" ON "transformation_runs"("status");
CREATE INDEX "transformation_runs_object_type_idx" ON "transformation_runs"("object_type");
CREATE UNIQUE INDEX "source_records_run_id_external_id_key" ON "source_records"("run_id", "external_id");
CREATE INDEX "source_records_run_id_idx" ON "source_records"("run_id");
CREATE UNIQUE INDEX "transformed_records_source_record_id_key" ON "transformed_records"("source_record_id");
CREATE UNIQUE INDEX "transformed_records_run_id_external_id_key" ON "transformed_records"("run_id", "external_id");
CREATE INDEX "transformed_records_run_id_idx" ON "transformed_records"("run_id");
CREATE UNIQUE INDEX "transformation_rules_code_version_key" ON "transformation_rules"("code", "version");
CREATE INDEX "transformation_rules_object_type_enabled_idx" ON "transformation_rules"("object_type", "enabled");
CREATE UNIQUE INDEX "validation_rules_code_version_key" ON "validation_rules"("code", "version");
CREATE INDEX "validation_rules_object_type_enabled_idx" ON "validation_rules"("object_type", "enabled");
CREATE UNIQUE INDEX "validation_results_transformed_record_id_validation_rule_id_key" ON "validation_results"("transformed_record_id", "validation_rule_id");
CREATE INDEX "validation_results_run_id_idx" ON "validation_results"("run_id");
CREATE INDEX "validation_results_status_idx" ON "validation_results"("status");
CREATE INDEX "validation_results_reason_code_idx" ON "validation_results"("reason_code");
CREATE INDEX "audit_events_run_id_created_at_idx" ON "audit_events"("run_id", "created_at");
CREATE INDEX "audit_events_event_type_idx" ON "audit_events"("event_type");

ALTER TABLE "source_records" ADD CONSTRAINT "source_records_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "transformation_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "transformed_records" ADD CONSTRAINT "transformed_records_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "transformation_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "transformed_records" ADD CONSTRAINT "transformed_records_source_record_id_fkey" FOREIGN KEY ("source_record_id") REFERENCES "source_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "validation_results" ADD CONSTRAINT "validation_results_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "transformation_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "validation_results" ADD CONSTRAINT "validation_results_transformed_record_id_fkey" FOREIGN KEY ("transformed_record_id") REFERENCES "transformed_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "validation_results" ADD CONSTRAINT "validation_results_validation_rule_id_fkey" FOREIGN KEY ("validation_rule_id") REFERENCES "validation_rules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "transformation_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
