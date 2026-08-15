import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to seed TransformOps.");
}

if (process.env.DEMO_SEED_RESET_ALLOWED !== "true") {
  throw new Error(
    "Refusing destructive demo seed reset. Set DEMO_SEED_RESET_ALLOWED=true only for an isolated TransformOps demo database.",
  );
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

const countries = [
  ["Slovakia", "SK"],
  ["Czech Republic", "CZ"],
  ["Germany", "DE"],
  ["Austria", "AT"],
] as const;

const syntheticCompanies = [
  "Northstar Components Synthetic",
  "Danube Systems Synthetic",
  "Alpine Parts Synthetic",
  "Vector Works Synthetic",
  "Cobalt Manufacturing Synthetic",
  "Nova Trade Synthetic",
  "Orion Assembly Synthetic",
  "Helix Supply Synthetic",
  "Atlas Industrial Synthetic",
  "Riverbend Machines Synthetic",
  "Summit Controls Synthetic",
  "Meridian Tools Synthetic",
];

function addMs(value: Date, milliseconds: number) {
  return new Date(value.getTime() + milliseconds);
}

function addSeconds(value: Date, seconds: number) {
  return addMs(value, seconds * 1000);
}

function customerPayload(
  index: number,
  options?: { invalidCountry?: boolean; missingTaxId?: boolean; invalidEmail?: boolean },
) {
  const [country, countryCode] = countries[index % countries.length];
  const business = index % 3 !== 0;

  return {
    source: {
      customerName: syntheticCompanies[index % syntheticCompanies.length],
      customerType: business ? "BUSINESS" : "PERSONAL",
      country: options?.invalidCountry ? "Unknownland" : country,
      taxId:
        business && !options?.missingTaxId
          ? `SK-SYN-${String(index + 1).padStart(6, "0")}`
          : null,
      email: options?.invalidEmail
        ? `invalid-email-${index + 1}`
        : `customer-${index + 1}@example.test`,
    },
    target: {
      customerName: syntheticCompanies[index % syntheticCompanies.length].trim(),
      customerType: business ? "BUSINESS" : "PERSONAL",
      countryCode: options?.invalidCountry ? "UNKNOWN" : countryCode,
      taxId:
        business && !options?.missingTaxId
          ? `SK-SYN-${String(index + 1).padStart(6, "0")}`
          : null,
      email: options?.invalidEmail
        ? `invalid-email-${index + 1}`
        : `customer-${index + 1}@example.test`,
    },
  };
}

function materialPayload(index: number, options?: { unmappedUnit?: boolean; missingCode?: boolean }) {
  const sourceUnit = options?.unmappedUnit ? "BOX" : index % 2 === 0 ? "PCS" : "KILOGRAM";
  const targetUnit = options?.unmappedUnit ? null : index % 2 === 0 ? "PC" : "KG";

  return {
    source: {
      materialCode: options?.missingCode ? null : `MAT-SYN-${String(index + 1).padStart(4, "0")}`,
      description: `Synthetic material ${index + 1}`,
      unit: sourceUnit,
    },
    target: {
      materialCode: options?.missingCode ? null : `MAT-SYN-${String(index + 1).padStart(4, "0")}`,
      description: `Synthetic material ${index + 1}`,
      unit: targetUnit,
    },
  };
}

async function reset() {
  await prisma.validationResult.deleteMany();
  await prisma.auditEvent.deleteMany();
  await prisma.transformedRecord.deleteMany();
  await prisma.sourceRecord.deleteMany();
  await prisma.validationRule.deleteMany();
  await prisma.transformationRule.deleteMany();
  await prisma.transformationRun.deleteMany();
}

async function createRules() {
  const createdAt = new Date("2026-08-14T08:00:00.000Z");

  await prisma.transformationRule.createMany({
    data: [
      {
        code: "CUSTOMER_COUNTRY_NORMALIZATION",
        name: "Normalize customer country to ISO-2",
        objectType: "CUSTOMER",
        sourceField: "country",
        targetField: "countryCode",
        ruleType: "COUNTRY_MAP",
        configuration: { Slovakia: "SK", "Czech Republic": "CZ", Germany: "DE", Austria: "AT" },
        createdAt,
      },
      {
        code: "CUSTOMER_EMAIL_NORMALIZATION",
        name: "Normalize customer email",
        objectType: "CUSTOMER",
        sourceField: "email",
        targetField: "email",
        ruleType: "LOWERCASE",
        configuration: { trim: true },
        createdAt,
      },
      {
        code: "MATERIAL_UNIT_NORMALIZATION",
        name: "Normalize material unit",
        objectType: "MATERIAL",
        sourceField: "unit",
        targetField: "unit",
        ruleType: "UNIT_MAP",
        configuration: { PCS: "PC", PIECE: "PC", KG: "KG", KILOGRAM: "KG" },
        createdAt,
      },
    ],
  });

  await prisma.validationRule.createMany({
    data: [
      {
        code: "COUNTRY_CODE_ISO2",
        name: "Country code must use ISO-2 length",
        objectType: "CUSTOMER",
        fieldName: "countryCode",
        ruleType: "EXACT_LENGTH",
        severity: "ERROR",
        configuration: { length: 2 },
        createdAt,
      },
      {
        code: "BUSINESS_TAX_ID_REQUIRED",
        name: "Business customer tax ID is required",
        objectType: "CUSTOMER",
        fieldName: "taxId",
        ruleType: "REQUIRED",
        severity: "ERROR",
        configuration: { when: { field: "customerType", equals: "BUSINESS" } },
        createdAt,
      },
      {
        code: "EMAIL_FORMAT",
        name: "Customer email format",
        objectType: "CUSTOMER",
        fieldName: "email",
        ruleType: "REGEX",
        severity: "WARNING",
        configuration: { pattern: "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$" },
        createdAt,
      },
      {
        code: "MATERIAL_CODE_REQUIRED",
        name: "Material code is required",
        objectType: "MATERIAL",
        fieldName: "materialCode",
        ruleType: "REQUIRED",
        severity: "ERROR",
        configuration: {},
        createdAt,
      },
      {
        code: "MATERIAL_UNIT_ALLOWED",
        name: "Material unit must map to target enum",
        objectType: "MATERIAL",
        fieldName: "unit",
        ruleType: "ENUM",
        severity: "ERROR",
        configuration: { allowed: ["PC", "KG"] },
        createdAt,
      },
    ],
  });
}

async function customerRuleMap() {
  const rules = await prisma.validationRule.findMany({
    where: {
      code: { in: ["COUNTRY_CODE_ISO2", "BUSINESS_TAX_ID_REQUIRED", "EMAIL_FORMAT"] },
      version: 1,
    },
  });
  return new Map(rules.map((rule) => [rule.code, rule]));
}

async function materialRuleMap() {
  const rules = await prisma.validationRule.findMany({
    where: {
      code: { in: ["MATERIAL_CODE_REQUIRED", "MATERIAL_UNIT_ALLOWED"] },
      version: 1,
    },
  });
  return new Map(rules.map((rule) => [rule.code, rule]));
}

function requireRule<T>(rules: Map<string, T>, code: string): T {
  const rule = rules.get(code);
  if (!rule) throw new Error(`Seed validation rule ${code} was not created.`);
  return rule;
}

async function seedCustomerRun(config: {
  runNumber: string;
  recordCount: number;
  status: "READY" | "COMPLETED";
  createdAt: Date;
  warningIndexes?: number[];
  invalidCountryIndexes?: number[];
  missingTaxIndexes?: number[];
}) {
  const startedAt = config.status === "COMPLETED" ? addSeconds(config.createdAt, 120) : null;
  const validationStartedAt = startedAt ? addSeconds(startedAt, 50) : null;
  const completedAt = startedAt ? addSeconds(startedAt, 90) : null;

  const run = await prisma.transformationRun.create({
    data: {
      runNumber: config.runNumber,
      sourceSystem: "LEGACY_ERP_EU",
      targetSystem: "TARGET_ERP_CLOUD",
      objectType: "CUSTOMER",
      status: config.status,
      totalRecords: config.recordCount,
      createdAt: config.createdAt,
      startedAt,
      completedAt,
    },
  });

  await prisma.auditEvent.create({
    data: {
      runId: run.id,
      eventType: "RUN_CREATED",
      entityType: "RUN",
      entityId: run.id,
      payload: { synthetic: true, runNumber: config.runNumber },
      createdAt: config.createdAt,
    },
  });

  const warningSet = new Set(config.warningIndexes ?? []);
  const invalidCountrySet = new Set(config.invalidCountryIndexes ?? []);
  const missingTaxSet = new Set(config.missingTaxIndexes ?? []);
  const rules = config.status === "COMPLETED" ? await customerRuleMap() : null;

  let warningRecords = 0;
  let failedRecords = 0;

  for (let index = 0; index < config.recordCount; index += 1) {
    const payload = customerPayload(index, {
      invalidCountry: invalidCountrySet.has(index),
      missingTaxId: missingTaxSet.has(index),
      invalidEmail: warningSet.has(index),
    });

    const sourceCreatedAt = startedAt ? addMs(startedAt, 1_000 + index * 20) : addMs(config.createdAt, 1_000 + index * 20);
    const source = await prisma.sourceRecord.create({
      data: {
        runId: run.id,
        externalId: `CUS-${config.runNumber}-${String(index + 1).padStart(3, "0")}`,
        objectType: "CUSTOMER",
        payload: payload.source,
        createdAt: sourceCreatedAt,
      },
    });

    if (config.status === "READY" || !rules || !validationStartedAt) continue;

    const transformed = await prisma.transformedRecord.create({
      data: {
        runId: run.id,
        sourceRecordId: source.id,
        externalId: source.externalId,
        payload: payload.target,
        createdAt: addMs(startedAt!, 25_000 + index * 20),
      },
    });

    const failed = invalidCountrySet.has(index) || missingTaxSet.has(index);
    const warned = !failed && warningSet.has(index);
    if (failed) failedRecords += 1;
    else if (warned) warningRecords += 1;

    let resultOrdinal = 0;
    const nextResultTime = () => addMs(validationStartedAt, index * 100 + resultOrdinal++ * 10);

    const countryRule = requireRule(rules, "COUNTRY_CODE_ISO2");
    if (invalidCountrySet.has(index)) {
      const createdAt = nextResultTime();
      await prisma.validationResult.create({
        data: {
          runId: run.id,
          transformedRecordId: transformed.id,
          validationRuleId: countryRule.id,
          status: "FAIL",
          reasonCode: "INVALID_COUNTRY_CODE",
          actualValue: String(payload.target.countryCode),
          expectedValue: "2-character country code",
          message: "Synthetic failure: target country code is not a two-character code.",
          createdAt,
        },
      });
      await prisma.auditEvent.create({
        data: {
          runId: run.id,
          eventType: "RULE_FAILED",
          entityType: "RECORD",
          entityId: transformed.id,
          payload: { synthetic: true, ruleCode: "COUNTRY_CODE_ISO2", reasonCode: "INVALID_COUNTRY_CODE" },
          createdAt: addMs(createdAt, 1),
        },
      });
    } else {
      await prisma.validationResult.create({
        data: {
          runId: run.id,
          transformedRecordId: transformed.id,
          validationRuleId: countryRule.id,
          status: "PASS",
          actualValue: String(payload.target.countryCode),
          expectedValue: "2-character country code",
          message: "Synthetic pass: country code satisfies the demo length rule.",
          createdAt: nextResultTime(),
        },
      });
    }

    if (payload.target.customerType === "BUSINESS") {
      const taxRule = requireRule(rules, "BUSINESS_TAX_ID_REQUIRED");
      if (missingTaxSet.has(index)) {
        const createdAt = nextResultTime();
        await prisma.validationResult.create({
          data: {
            runId: run.id,
            transformedRecordId: transformed.id,
            validationRuleId: taxRule.id,
            status: "FAIL",
            reasonCode: "REQUIRED_VALUE_MISSING",
            actualValue: null,
            expectedValue: "Non-null taxId for BUSINESS customer",
            message: "Synthetic failure: required business tax ID is missing.",
            createdAt,
          },
        });
        await prisma.auditEvent.create({
          data: {
            runId: run.id,
            eventType: "RULE_FAILED",
            entityType: "RECORD",
            entityId: transformed.id,
            payload: { synthetic: true, ruleCode: "BUSINESS_TAX_ID_REQUIRED", reasonCode: "REQUIRED_VALUE_MISSING" },
            createdAt: addMs(createdAt, 1),
          },
        });
      } else {
        await prisma.validationResult.create({
          data: {
            runId: run.id,
            transformedRecordId: transformed.id,
            validationRuleId: taxRule.id,
            status: "PASS",
            actualValue: String(payload.target.taxId),
            expectedValue: "Non-null taxId for BUSINESS customer",
            message: "Synthetic pass: business tax ID is present.",
            createdAt: nextResultTime(),
          },
        });
      }
    }

    const emailRule = requireRule(rules, "EMAIL_FORMAT");
    if (warningSet.has(index)) {
      await prisma.validationResult.create({
        data: {
          runId: run.id,
          transformedRecordId: transformed.id,
          validationRuleId: emailRule.id,
          status: "WARNING",
          reasonCode: "INVALID_EMAIL",
          actualValue: String(payload.target.email),
          expectedValue: "Valid email format",
          message: "Synthetic warning: email format does not satisfy the demo rule.",
          createdAt: nextResultTime(),
        },
      });
    } else {
      await prisma.validationResult.create({
        data: {
          runId: run.id,
          transformedRecordId: transformed.id,
          validationRuleId: emailRule.id,
          status: "PASS",
          actualValue: String(payload.target.email),
          expectedValue: "Valid email format",
          message: "Synthetic pass: email format satisfies the demo rule.",
          createdAt: nextResultTime(),
        },
      });
    }
  }

  if (config.status === "COMPLETED" && startedAt && validationStartedAt && completedAt) {
    const passedRecords = config.recordCount - warningRecords - failedRecords;
    await prisma.transformationRun.update({
      where: { id: run.id },
      data: { passedRecords, warningRecords, failedRecords },
    });

    await prisma.auditEvent.createMany({
      data: [
        {
          runId: run.id,
          eventType: "TRANSFORMATION_STARTED",
          entityType: "RUN",
          entityId: run.id,
          payload: { synthetic: true },
          createdAt: startedAt,
        },
        {
          runId: run.id,
          eventType: "TRANSFORMATION_COMPLETED",
          entityType: "RUN",
          entityId: run.id,
          payload: { synthetic: true, records: config.recordCount },
          createdAt: addSeconds(startedAt, 45),
        },
        {
          runId: run.id,
          eventType: "VALIDATION_STARTED",
          entityType: "RUN",
          entityId: run.id,
          payload: { synthetic: true },
          createdAt: validationStartedAt,
        },
        {
          runId: run.id,
          eventType: "VALIDATION_COMPLETED",
          entityType: "RUN",
          entityId: run.id,
          payload: { synthetic: true, passedRecords, warningRecords, failedRecords },
          createdAt: completedAt,
        },
      ],
    });
  }
}

async function seedMaterialRun() {
  const createdAt = new Date("2026-08-14T13:00:00.000Z");
  const startedAt = addSeconds(createdAt, 120);
  const validationStartedAt = addSeconds(startedAt, 50);
  const completedAt = addSeconds(startedAt, 90);

  const run = await prisma.transformationRun.create({
    data: {
      runNumber: "TR-1044",
      sourceSystem: "CORE_ERP_V2",
      targetSystem: "TARGET_ERP_CLOUD",
      objectType: "MATERIAL",
      status: "COMPLETED",
      totalRecords: 8,
      passedRecords: 6,
      warningRecords: 0,
      failedRecords: 2,
      createdAt,
      startedAt,
      completedAt,
    },
  });

  const rules = await materialRuleMap();
  const materialCodeRule = requireRule(rules, "MATERIAL_CODE_REQUIRED");
  const materialUnitRule = requireRule(rules, "MATERIAL_UNIT_ALLOWED");

  await prisma.auditEvent.create({
    data: {
      runId: run.id,
      eventType: "RUN_CREATED",
      entityType: "RUN",
      entityId: run.id,
      payload: { synthetic: true, runNumber: run.runNumber },
      createdAt,
    },
  });

  for (let index = 0; index < 8; index += 1) {
    const missingCode = index === 5;
    const unmappedUnit = index === 7;
    const payload = materialPayload(index, { missingCode, unmappedUnit });

    const source = await prisma.sourceRecord.create({
      data: {
        runId: run.id,
        externalId: `MAT-${run.runNumber}-${String(index + 1).padStart(3, "0")}`,
        objectType: "MATERIAL",
        payload: payload.source,
        createdAt: addMs(startedAt, 1_000 + index * 20),
      },
    });

    const transformed = await prisma.transformedRecord.create({
      data: {
        runId: run.id,
        sourceRecordId: source.id,
        externalId: source.externalId,
        payload: payload.target,
        createdAt: addMs(startedAt, 25_000 + index * 20),
      },
    });

    const codeResultAt = addMs(validationStartedAt, index * 100);
    if (missingCode) {
      await prisma.validationResult.create({
        data: {
          runId: run.id,
          transformedRecordId: transformed.id,
          validationRuleId: materialCodeRule.id,
          status: "FAIL",
          reasonCode: "REQUIRED_VALUE_MISSING",
          actualValue: null,
          expectedValue: "Non-null materialCode",
          message: "Synthetic failure: material code is missing.",
          createdAt: codeResultAt,
        },
      });
      await prisma.auditEvent.create({
        data: {
          runId: run.id,
          eventType: "RULE_FAILED",
          entityType: "RECORD",
          entityId: transformed.id,
          payload: { synthetic: true, ruleCode: "MATERIAL_CODE_REQUIRED", reasonCode: "REQUIRED_VALUE_MISSING" },
          createdAt: addMs(codeResultAt, 1),
        },
      });
    } else {
      await prisma.validationResult.create({
        data: {
          runId: run.id,
          transformedRecordId: transformed.id,
          validationRuleId: materialCodeRule.id,
          status: "PASS",
          actualValue: String(payload.target.materialCode),
          expectedValue: "Non-null materialCode",
          message: "Synthetic pass: material code is present.",
          createdAt: codeResultAt,
        },
      });
    }

    const unitResultAt = addMs(validationStartedAt, index * 100 + 10);
    if (unmappedUnit) {
      await prisma.validationResult.create({
        data: {
          runId: run.id,
          transformedRecordId: transformed.id,
          validationRuleId: materialUnitRule.id,
          status: "FAIL",
          reasonCode: "UNMAPPED_UNIT",
          actualValue: String(payload.source.unit),
          expectedValue: "PC or KG",
          message: "Synthetic failure: source unit has no configured target mapping.",
          createdAt: unitResultAt,
        },
      });
      await prisma.auditEvent.create({
        data: {
          runId: run.id,
          eventType: "RULE_FAILED",
          entityType: "RECORD",
          entityId: transformed.id,
          payload: { synthetic: true, ruleCode: "MATERIAL_UNIT_ALLOWED", reasonCode: "UNMAPPED_UNIT" },
          createdAt: addMs(unitResultAt, 1),
        },
      });
    } else {
      await prisma.validationResult.create({
        data: {
          runId: run.id,
          transformedRecordId: transformed.id,
          validationRuleId: materialUnitRule.id,
          status: "PASS",
          actualValue: String(payload.target.unit),
          expectedValue: "PC or KG",
          message: "Synthetic pass: material unit is mapped to an allowed target value.",
          createdAt: unitResultAt,
        },
      });
    }
  }

  await prisma.auditEvent.createMany({
    data: [
      {
        runId: run.id,
        eventType: "TRANSFORMATION_STARTED",
        entityType: "RUN",
        entityId: run.id,
        payload: { synthetic: true },
        createdAt: startedAt,
      },
      {
        runId: run.id,
        eventType: "TRANSFORMATION_COMPLETED",
        entityType: "RUN",
        entityId: run.id,
        payload: { synthetic: true, records: 8 },
        createdAt: addSeconds(startedAt, 45),
      },
      {
        runId: run.id,
        eventType: "VALIDATION_STARTED",
        entityType: "RUN",
        entityId: run.id,
        payload: { synthetic: true },
        createdAt: validationStartedAt,
      },
      {
        runId: run.id,
        eventType: "VALIDATION_COMPLETED",
        entityType: "RUN",
        entityId: run.id,
        payload: { synthetic: true, passedRecords: 6, warningRecords: 0, failedRecords: 2 },
        createdAt: completedAt,
      },
    ],
  });
}

async function verifySeedShape() {
  const [runs, sourceRecords, transformedRecords, validationResults, auditEvents] = await Promise.all([
    prisma.transformationRun.count(),
    prisma.sourceRecord.count(),
    prisma.transformedRecord.count(),
    prisma.validationResult.count(),
    prisma.auditEvent.count(),
  ]);

  const expected = {
    runs: 5,
    sourceRecords: 54,
    transformedRecords: 44,
    validationResults: 112,
    auditEvents: 26,
  };
  const actual = { runs, sourceRecords, transformedRecords, validationResults, auditEvents };

  for (const [key, expectedValue] of Object.entries(expected)) {
    if (actual[key as keyof typeof actual] !== expectedValue) {
      throw new Error(
        `Seed verification failed for ${key}: expected ${expectedValue}, received ${actual[key as keyof typeof actual]}.`,
      );
    }
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
    throw new Error("TR-1045 must remain READY with exactly 10 source records and no transformed/validation evidence before M2/M3 runtime execution exists.");
  }

  console.log({ ...actual, syntheticDataOnly: true, deterministicEvidence: true });
}

async function main() {
  await reset();
  await createRules();

  await seedCustomerRun({
    runNumber: "TR-1041",
    recordCount: 12,
    status: "COMPLETED",
    createdAt: new Date("2026-08-14T09:00:00.000Z"),
  });
  await seedCustomerRun({
    runNumber: "TR-1042",
    recordCount: 12,
    status: "COMPLETED",
    createdAt: new Date("2026-08-14T10:00:00.000Z"),
    warningIndexes: [2, 9],
  });
  await seedCustomerRun({
    runNumber: "TR-1043",
    recordCount: 12,
    status: "COMPLETED",
    createdAt: new Date("2026-08-14T11:00:00.000Z"),
    warningIndexes: [1],
    invalidCountryIndexes: [4],
    missingTaxIndexes: [7, 10],
  });
  await seedMaterialRun();
  await seedCustomerRun({
    runNumber: "TR-1045",
    recordCount: 10,
    status: "READY",
    createdAt: new Date("2026-08-14T14:00:00.000Z"),
  });

  await verifySeedShape();
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
