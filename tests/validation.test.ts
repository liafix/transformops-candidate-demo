import { describe, expect, it } from "vitest";
import {
  evaluateValidationRule,
  evaluateValidationRules,
  type ValidationRuleDefinition,
} from "../src/lib/domain/validation";

describe("Validation Engine", () => {
  describe("REQUIRED Rule", () => {
    const requiredRule: ValidationRuleDefinition = {
      id: "v1",
      code: "BUSINESS_TAX_ID_REQUIRED",
      name: "Business tax ID required",
      objectType: "CUSTOMER",
      fieldName: "taxId",
      ruleType: "REQUIRED",
      severity: "ERROR",
      configuration: { when: { field: "customerType", equals: "BUSINESS" } },
      enabled: true,
    };

    it("passes when taxId is present for BUSINESS customer", () => {
      const payload = { customerType: "BUSINESS", taxId: "SK-123456" };
      const res = evaluateValidationRule(requiredRule, payload);

      expect(res.status).toBe("PASS");
      expect(res.reasonCode).toBeNull();
    });

    it("fails with REQUIRED_VALUE_MISSING when taxId is missing for BUSINESS customer", () => {
      const payload = { customerType: "BUSINESS", taxId: null };
      const res = evaluateValidationRule(requiredRule, payload);

      expect(res.status).toBe("FAIL");
      expect(res.reasonCode).toBe("REQUIRED_VALUE_MISSING");
    });

    it("bypasses check and passes when customerType is PERSONAL", () => {
      const payload = { customerType: "PERSONAL", taxId: null };
      const res = evaluateValidationRule(requiredRule, payload);

      expect(res.status).toBe("PASS");
      expect(res.reasonCode).toBeNull();
    });
  });

  describe("EXACT_LENGTH Rule", () => {
    const iso2Rule: ValidationRuleDefinition = {
      id: "v2",
      code: "COUNTRY_CODE_ISO2",
      name: "ISO2 Country Code",
      objectType: "CUSTOMER",
      fieldName: "countryCode",
      ruleType: "EXACT_LENGTH",
      severity: "ERROR",
      configuration: { length: 2 },
      enabled: true,
    };

    it("passes when countryCode is exactly 2 characters", () => {
      const res = evaluateValidationRule(iso2Rule, { countryCode: "SK" });
      expect(res.status).toBe("PASS");
      expect(res.reasonCode).toBeNull();
    });

    it("fails with INVALID_COUNTRY_CODE when countryCode is 'UNKNOWN'", () => {
      const res = evaluateValidationRule(iso2Rule, { countryCode: "UNKNOWN" });
      expect(res.status).toBe("FAIL");
      expect(res.reasonCode).toBe("INVALID_COUNTRY_CODE");
    });
  });

  describe("REGEX Rule & Severity Warning", () => {
    const emailRule: ValidationRuleDefinition = {
      id: "v3",
      code: "EMAIL_FORMAT",
      name: "Customer email format",
      objectType: "CUSTOMER",
      fieldName: "email",
      ruleType: "REGEX",
      severity: "WARNING",
      configuration: { pattern: "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$" },
      enabled: true,
    };

    it("passes for valid email address", () => {
      const res = evaluateValidationRule(emailRule, { email: "customer-1@example.test" });
      expect(res.status).toBe("PASS");
      expect(res.reasonCode).toBeNull();
    });

    it("returns WARNING (not FAIL) with INVALID_EMAIL for malformed email", () => {
      const res = evaluateValidationRule(emailRule, { email: "invalid-email-1" });
      expect(res.status).toBe("WARNING");
      expect(res.reasonCode).toBe("INVALID_EMAIL");
    });
  });

  describe("ENUM Rule", () => {
    const unitRule: ValidationRuleDefinition = {
      id: "v4",
      code: "MATERIAL_UNIT_ALLOWED",
      name: "Allowed units",
      objectType: "MATERIAL",
      fieldName: "unit",
      ruleType: "ENUM",
      severity: "ERROR",
      configuration: { allowed: ["PC", "KG"] },
      enabled: true,
    };

    it("passes for allowed units", () => {
      expect(evaluateValidationRule(unitRule, { unit: "PC" }).status).toBe("PASS");
      expect(evaluateValidationRule(unitRule, { unit: "KG" }).status).toBe("PASS");
    });

    it("fails with UNMAPPED_UNIT for unmapped or null unit", () => {
      const res = evaluateValidationRule(unitRule, { unit: null });
      expect(res.status).toBe("FAIL");
      expect(res.reasonCode).toBe("UNMAPPED_UNIT");
    });
  });

  describe("RANGE Rule", () => {
    const rangeRule: ValidationRuleDefinition = {
      id: "v5",
      code: "QUANTITY_RANGE",
      name: "Quantity range",
      objectType: "MATERIAL",
      fieldName: "quantity",
      ruleType: "RANGE",
      severity: "ERROR",
      configuration: { min: 1, max: 100 },
      enabled: true,
    };

    it("passes for values within range", () => {
      expect(evaluateValidationRule(rangeRule, { quantity: 50 }).status).toBe("PASS");
    });

    it("fails with VALUE_OUT_OF_RANGE for values out of bounds or non-numeric", () => {
      const res1 = evaluateValidationRule(rangeRule, { quantity: 0 });
      expect(res1.status).toBe("FAIL");
      expect(res1.reasonCode).toBe("VALUE_OUT_OF_RANGE");

      const res2 = evaluateValidationRule(rangeRule, { quantity: "abc" });
      expect(res2.status).toBe("FAIL");
      expect(res2.reasonCode).toBe("VALUE_OUT_OF_RANGE");
    });
  });

  describe("REFERENCE_EXISTS and UNIQUE Rules", () => {
    const refRule: ValidationRuleDefinition = {
      id: "v6",
      code: "CUSTOMER_REF_EXISTS",
      name: "Customer reference check",
      objectType: "CUSTOMER",
      fieldName: "parentId",
      ruleType: "REFERENCE_EXISTS",
      severity: "ERROR",
      configuration: {},
      enabled: true,
    };

    const uniqueRule: ValidationRuleDefinition = {
      id: "v7",
      code: "CUSTOMER_KEY_UNIQUE",
      name: "Unique customer key",
      objectType: "CUSTOMER",
      fieldName: "externalId",
      ruleType: "UNIQUE",
      severity: "ERROR",
      configuration: {},
      enabled: true,
    };

    it("evaluates REFERENCE_EXISTS using context validReferences", () => {
      const context = { validReferences: new Set(["REF-001", "REF-002"]) };

      expect(evaluateValidationRule(refRule, { parentId: "REF-001" }, context).status).toBe("PASS");

      const res = evaluateValidationRule(refRule, { parentId: "REF-999" }, context);
      expect(res.status).toBe("FAIL");
      expect(res.reasonCode).toBe("UNKNOWN_REFERENCE");
    });

    it("evaluates UNIQUE using context existingKeys", () => {
      const context = { existingKeys: new Set(["CUS-1001"]) };

      expect(evaluateValidationRule(uniqueRule, { externalId: "CUS-1002" }, context).status).toBe("PASS");

      const res = evaluateValidationRule(uniqueRule, { externalId: "CUS-1001" }, context);
      expect(res.status).toBe("FAIL");
      expect(res.reasonCode).toBe("DUPLICATE_TARGET_KEY");
    });
  });

  describe("evaluateValidationRules - Batch Execution", () => {
    const rules: ValidationRuleDefinition[] = [
      {
        id: "v1",
        code: "COUNTRY_CODE_ISO2",
        name: "ISO2 Country Code",
        objectType: "CUSTOMER",
        fieldName: "countryCode",
        ruleType: "EXACT_LENGTH",
        severity: "ERROR",
        configuration: { length: 2 },
        enabled: true,
      },
      {
        id: "v2",
        code: "BUSINESS_TAX_ID_REQUIRED",
        name: "Tax ID required",
        objectType: "CUSTOMER",
        fieldName: "taxId",
        ruleType: "REQUIRED",
        severity: "ERROR",
        configuration: { when: { field: "customerType", equals: "BUSINESS" } },
        enabled: true,
      },
      {
        id: "v3",
        code: "EMAIL_FORMAT",
        name: "Email format",
        objectType: "CUSTOMER",
        fieldName: "email",
        ruleType: "REGEX",
        severity: "WARNING",
        configuration: { pattern: "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$" },
        enabled: true,
      },
    ];

    it("evaluates multiple rules deterministically and returns structured results", () => {
      const payload = {
        customerType: "BUSINESS",
        countryCode: "SK",
        taxId: "SK-SYN-000001",
        email: "customer-1@example.test",
      };

      const results = evaluateValidationRules(rules, payload);

      expect(results).toHaveLength(3);
      expect(results.every((r) => r.status === "PASS")).toBe(true);
    });

    it("correctly flags mixed WARNING and FAIL outcomes for invalid payloads", () => {
      const payload = {
        customerType: "BUSINESS",
        countryCode: "UNKNOWN", // FAIL: INVALID_COUNTRY_CODE
        taxId: null, // FAIL: REQUIRED_VALUE_MISSING
        email: "invalid-email", // WARNING: INVALID_EMAIL
      };

      const results = evaluateValidationRules(rules, payload);

      const countryRes = results.find((r) => r.ruleCode === "COUNTRY_CODE_ISO2");
      expect(countryRes?.status).toBe("FAIL");
      expect(countryRes?.reasonCode).toBe("INVALID_COUNTRY_CODE");

      const taxRes = results.find((r) => r.ruleCode === "BUSINESS_TAX_ID_REQUIRED");
      expect(taxRes?.status).toBe("FAIL");
      expect(taxRes?.reasonCode).toBe("REQUIRED_VALUE_MISSING");

      const emailRes = results.find((r) => r.ruleCode === "EMAIL_FORMAT");
      expect(emailRes?.status).toBe("WARNING");
      expect(emailRes?.reasonCode).toBe("INVALID_EMAIL");
    });
  });
});
