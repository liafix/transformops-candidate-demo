import "dotenv/config";
import { prisma } from "../src/lib/db/prisma";

function assertEqual(label: string, actual: number, expected: number) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, received ${actual}.`);
  }
}

async function main() {
  try {
    const [runCount, sourceRecordCount, transformedRecordCount, validationResultCount, auditEventCount, ruleCount] =
      await Promise.all([
        prisma.transformationRun.count(),
        prisma.sourceRecord.count(),
        prisma.transformedRecord.count(),
        prisma.validationResult.count(),
        prisma.auditEvent.count(),
        prisma.validationRule.count(),
      ]);

    assertEqual("Transformation runs", runCount, 5);
    assertEqual("Source records", sourceRecordCount, 54);
    assertEqual("Transformed records", transformedRecordCount, 44);
    assertEqual("Validation results", validationResultCount, 112);
    assertEqual("Audit events", auditEventCount, 26);
    assertEqual("Validation rules", ruleCount, 5);

    const completedRuns = await prisma.transformationRun.findMany({
      where: { status: "COMPLETED" },
      select: { id: true, runNumber: true },
      orderBy: { runNumber: "asc" },
    });

    const completedRunsWithEvidence = await Promise.all(
      completedRuns.map(async (run) => ({
        runNumber: run.runNumber,
        validationResults: await prisma.validationResult.count({ where: { runId: run.id } }),
        auditEvents: await prisma.auditEvent.count({ where: { runId: run.id } }),
      })),
    );

    if (completedRuns.length !== 4 || completedRunsWithEvidence.some((run) => run.validationResults === 0)) {
      throw new Error("Every seeded COMPLETED run must include persisted validation evidence.");
    }

    const interactiveRun = await prisma.transformationRun.findUniqueOrThrow({
      where: { runNumber: "TR-1045" },
      select: { id: true, status: true },
    });
    const [interactiveSources, interactiveTransformed, interactiveResults] = await Promise.all([
      prisma.sourceRecord.count({ where: { runId: interactiveRun.id } }),
      prisma.transformedRecord.count({ where: { runId: interactiveRun.id } }),
      prisma.validationResult.count({ where: { runId: interactiveRun.id } }),
    ]);

    if (
      interactiveRun.status !== "READY" ||
      interactiveSources !== 10 ||
      interactiveTransformed !== 0 ||
      interactiveResults !== 0
    ) {
      throw new Error("TR-1045 foundation fixture is not in the expected READY/source-only state.");
    }

    console.log(
      JSON.stringify(
        {
          status: "ok",
          transformationRuns: runCount,
          sourceRecords: sourceRecordCount,
          transformedRecords: transformedRecordCount,
          validationResults: validationResultCount,
          auditEvents: auditEventCount,
          validationRules: ruleCount,
          completedRunsWithEvidence,
          interactiveRun: {
            runNumber: "TR-1045",
            status: interactiveRun.status,
            sourceRecords: interactiveSources,
            transformedRecords: interactiveTransformed,
            validationResults: interactiveResults,
          },
        },
        null,
        2,
      ),
    );
  } catch (error) {
    console.error("Database check failed.", error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

void main();
