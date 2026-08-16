-- CreateIndex
CREATE UNIQUE INDEX "transformed_records_run_id_source_record_id_key" ON "transformed_records"("run_id", "source_record_id");
