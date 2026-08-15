-- Foundation audit repair: enforce run-scoped record integrity without redundant descendant run FKs.

CREATE UNIQUE INDEX "source_records_run_id_id_key" ON "source_records"("run_id", "id");
CREATE UNIQUE INDEX "transformed_records_run_id_id_key" ON "transformed_records"("run_id", "id");

ALTER TABLE "transformed_records" DROP CONSTRAINT "transformed_records_run_id_fkey";
ALTER TABLE "transformed_records" DROP CONSTRAINT "transformed_records_source_record_id_fkey";
ALTER TABLE "transformed_records"
  ADD CONSTRAINT "transformed_records_run_id_source_record_id_fkey"
  FOREIGN KEY ("run_id", "source_record_id")
  REFERENCES "source_records"("run_id", "id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "validation_results" DROP CONSTRAINT "validation_results_run_id_fkey";
ALTER TABLE "validation_results" DROP CONSTRAINT "validation_results_transformed_record_id_fkey";
ALTER TABLE "validation_results"
  ADD CONSTRAINT "validation_results_run_id_transformed_record_id_fkey"
  FOREIGN KEY ("run_id", "transformed_record_id")
  REFERENCES "transformed_records"("run_id", "id")
  ON DELETE CASCADE ON UPDATE CASCADE;
