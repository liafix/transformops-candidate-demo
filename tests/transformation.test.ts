import { describe, expect, it } from "vitest";
import {
  applyTransformationRule,
  transformPayload,
  type TransformationRuleDefinition,
} from "../src/lib/domain/transformation";

describe("Transformation Engine", () => {
  describe("applyTransformationRule", () => {
    it("handles TRIM rule", () => {
      const res = applyTransformationRule("TRIM", "  Acme Corp  ", {});
      expect(res.value).toBe("Acme Corp");
      expect(res.error).toBeUndefined();
    });

    it("handles LOWERCASE rule with and without trim", () => {
      const res1 = applyTransformationRule("LOWERCASE", "  USER@EXAMPLE.TEST  ", { trim: true });
      expect(res1.value).toBe("user@example.test");

      const res2 = applyTransformationRule("LOWERCASE", "USER@EXAMPLE.TEST", { trim: false });
      expect(res2.value).toBe("user@example.test");
    });

    it("handles COUNTRY_MAP rule for valid country", () => {
      const config = { Slovakia: "SK", Germany: "DE" };
      const res = applyTransformationRule("COUNTRY_MAP", "Slovakia", config);
      expect(res.value).toBe("SK");
      expect(res.error).toBeUndefined();
    });

    it("handles COUNTRY_MAP rule for unmapped country", () => {
      const config = { Slovakia: "SK" };
      const res = applyTransformationRule("COUNTRY_MAP", "Unknownland", config);
      expect(res.value).toBe("UNKNOWN");
      expect(res.error).toContain("Unmapped country value");
    });

    it("handles UNIT_MAP rule for valid unit", () => {
      const config = { PCS: "PC", KILOGRAM: "KG" };
      const res = applyTransformationRule("UNIT_MAP", "PCS", config);
      expect(res.value).toBe("PC");
      expect(res.error).toBeUndefined();
    });

    it("handles UNIT_MAP rule for unmapped unit", () => {
      const config = { PCS: "PC" };
      const res = applyTransformationRule("UNIT_MAP", "BOX", config);
      expect(res.value).toBeNull();
      expect(res.error).toContain("Unmapped unit value");
    });

    it("handles IDENTITY rule", () => {
      const val = { nested: true };
      const res = applyTransformationRule("IDENTITY", val, {});
      expect(res.value).toBe(val);
    });

    it("handles null and undefined values safely", () => {
      expect(applyTransformationRule("TRIM", null, {}).value).toBeNull();
      expect(applyTransformationRule("COUNTRY_MAP", undefined, {}).value).toBeNull();
    });
  });

  describe("transformPayload - Customer Transformation Rules", () => {
    const customerRules: TransformationRuleDefinition[] = [
      {
        id: "rule-1",
        code: "CUSTOMER_COUNTRY_NORMALIZATION",
        name: "Normalize country",
        objectType: "CUSTOMER",
        sourceField: "country",
        targetField: "countryCode",
        ruleType: "COUNTRY_MAP",
        configuration: { Slovakia: "SK", "Czech Republic": "CZ", Germany: "DE" },
        enabled: true,
      },
      {
        id: "rule-2",
        code: "CUSTOMER_EMAIL_NORMALIZATION",
        name: "Normalize email",
        objectType: "CUSTOMER",
        sourceField: "email",
        targetField: "email",
        ruleType: "LOWERCASE",
        configuration: { trim: true },
        enabled: true,
      },
      {
        id: "rule-3",
        code: "CUSTOMER_NAME_TRIM",
        name: "Trim customer name",
        objectType: "CUSTOMER",
        sourceField: "customerName",
        targetField: "customerName",
        ruleType: "TRIM",
        configuration: {},
        enabled: true,
      },
    ];

    it("transforms valid customer record deterministically", () => {
      const sourcePayload = {
        customerName: "  Northstar Components Synthetic  ",
        customerType: "BUSINESS",
        country: "Slovakia",
        taxId: "SK-SYN-000001",
        email: "  CUSTOMER-1@EXAMPLE.TEST ",
      };

      const result1 = transformPayload(sourcePayload, customerRules);
      const result2 = transformPayload(sourcePayload, customerRules);

      expect(result1).toEqual(result2); // Deterministic execution

      expect(result1.payload).toEqual({
        customerName: "Northstar Components Synthetic",
        customerType: "BUSINESS",
        country: "Slovakia",
        countryCode: "SK",
        taxId: "SK-SYN-000001",
        email: "customer-1@example.test",
      });
      expect(result1.transformErrors).toHaveLength(0);
    });

    it("captures transformation errors for unmapped values without throwing", () => {
      const sourcePayload = {
        customerName: "Unknown Corp",
        customerType: "BUSINESS",
        country: "Unknownland",
        taxId: "SK-0000",
        email: "info@unknown.test",
      };

      const result = transformPayload(sourcePayload, customerRules);

      expect(result.payload.countryCode).toBe("UNKNOWN");
      expect(result.transformErrors).toContain(
        "CUSTOMER_COUNTRY_NORMALIZATION: Unmapped country value 'Unknownland'.",
      );
    });

    it("skips disabled transformation rules", () => {
      const disabledRules = customerRules.map((r) =>
        r.code === "CUSTOMER_NAME_TRIM" ? { ...r, enabled: false } : r,
      );

      const sourcePayload = {
        customerName: "  Untrimmed Name  ",
        country: "Germany",
        email: "TEST@EXAMPLE.TEST",
      };

      const result = transformPayload(sourcePayload, disabledRules);
      expect(result.payload.customerName).toBe("  Untrimmed Name  ");
      expect(result.payload.countryCode).toBe("DE");
    });
  });

  describe("transformPayload - Material Transformation Rules", () => {
    const materialRules: TransformationRuleDefinition[] = [
      {
        id: "mrule-1",
        code: "MATERIAL_UNIT_NORMALIZATION",
        name: "Normalize unit",
        objectType: "MATERIAL",
        sourceField: "unit",
        targetField: "unit",
        ruleType: "UNIT_MAP",
        configuration: { PCS: "PC", KILOGRAM: "KG" },
        enabled: true,
      },
    ];

    it("transforms material units correctly", () => {
      const sourcePayload = {
        materialCode: "MAT-SYN-0001",
        description: "Synthetic material 1",
        unit: "KILOGRAM",
      };

      const result = transformPayload(sourcePayload, materialRules);

      expect(result.payload.unit).toBe("KG");
      expect(result.transformErrors).toHaveLength(0);
    });

    it("maps unmapped unit to null with recorded error", () => {
      const sourcePayload = {
        materialCode: "MAT-SYN-0002",
        description: "Synthetic material 2",
        unit: "BOX",
      };

      const result = transformPayload(sourcePayload, materialRules);

      expect(result.payload.unit).toBeNull();
      expect(result.transformErrors).toContain(
        "MATERIAL_UNIT_NORMALIZATION: Unmapped unit value 'BOX'.",
      );
    });
  });
});
