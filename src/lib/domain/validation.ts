import type { ObjectType } from "./state-machine";

export type ValidationRuleType =
  | "REQUIRED"
  | "EXACT_LENGTH"
  | "REGEX"
  | "ENUM"
  | "RANGE"
  | "REFERENCE_EXISTS"
  | "UNIQUE";

export type ValidationSeverity = "WARNING" | "ERROR";

export type ValidationStatus = "PASS" | "WARNING" | "FAIL";

export type ReasonCode =
  | "REQUIRED_VALUE_MISSING"
  | "INVALID_COUNTRY_CODE"
  | "INVALID_DATE_FORMAT"
  | "INVALID_EMAIL"
  | "UNMAPPED_UNIT"
  | "INVALID_LENGTH"
  | "VALUE_OUT_OF_RANGE"
  | "DUPLICATE_TARGET_KEY"
  | "UNKNOWN_REFERENCE"
  | "TRANSFORMATION_ERROR";

export interface ValidationRuleDefinition {
  id: string;
  code: string;
  name: string;
  objectType: ObjectType;
  fieldName: string;
  ruleType: ValidationRuleType;
  severity: ValidationSeverity;
  configuration: Record<string, unknown>;
  enabled: boolean;
}

export interface RuleEvaluationResult {
  ruleId: string;
  ruleCode: string;
  status: ValidationStatus;
  reasonCode: ReasonCode | null;
  actualValue: string | null;
  expectedValue: string | null;
  message: string | null;
}

export interface ValidationContext {
  existingKeys?: Set<string>;
  validReferences?: Set<string>;
}

function matchesWhenCondition(
  payload: Record<string, unknown>,
  whenConfig: unknown,
): boolean {
  if (!whenConfig || typeof whenConfig !== "object") {
    return true;
  }

  const { field, equals } = whenConfig as { field?: string; equals?: unknown };
  if (!field) {
    return true;
  }

  return payload[field] === equals;
}

function formatValue(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  return String(value);
}

/**
 * Evaluates a single validation rule against a transformed payload.
 * Pure and deterministic.
 */
export function evaluateValidationRule(
  rule: ValidationRuleDefinition,
  payload: Record<string, unknown>,
  context: ValidationContext = {},
): RuleEvaluationResult {
  const actualRaw = payload[rule.fieldName];
  const actualStr = formatValue(actualRaw);
  const failureStatus: ValidationStatus = rule.severity === "ERROR" ? "FAIL" : "WARNING";

  switch (rule.ruleType) {
    case "REQUIRED": {
      const whenConfig = rule.configuration.when;
      if (!matchesWhenCondition(payload, whenConfig)) {
        return {
          ruleId: rule.id,
          ruleCode: rule.code,
          status: "PASS",
          reasonCode: null,
          actualValue: actualStr,
          expectedValue: `Conditional check bypassed for ${rule.fieldName}`,
          message: "Rule condition not met; rule passed by default.",
        };
      }

      const isPresent = actualRaw !== null && actualRaw !== undefined && actualStr?.trim() !== "";
      if (isPresent) {
        return {
          ruleId: rule.id,
          ruleCode: rule.code,
          status: "PASS",
          reasonCode: null,
          actualValue: actualStr,
          expectedValue: `Non-null/non-empty ${rule.fieldName}`,
          message: `${rule.fieldName} is present.`,
        };
      }

      return {
        ruleId: rule.id,
        ruleCode: rule.code,
        status: failureStatus,
        reasonCode: "REQUIRED_VALUE_MISSING",
        actualValue: null,
        expectedValue: `Non-null ${rule.fieldName}`,
        message: `Required field '${rule.fieldName}' is missing or empty.`,
      };
    }

    case "EXACT_LENGTH": {
      const expectedLength = Number(rule.configuration.length ?? 0);
      const isCorrectLength = actualStr !== null && actualStr.length === expectedLength;

      if (isCorrectLength) {
        return {
          ruleId: rule.id,
          ruleCode: rule.code,
          status: "PASS",
          reasonCode: null,
          actualValue: actualStr,
          expectedValue: `${expectedLength}-character length`,
          message: `${rule.fieldName} length requirement satisfied.`,
        };
      }

      const defaultReasonCode: ReasonCode =
        rule.fieldName === "countryCode" ? "INVALID_COUNTRY_CODE" : "INVALID_LENGTH";

      return {
        ruleId: rule.id,
        ruleCode: rule.code,
        status: failureStatus,
        reasonCode: defaultReasonCode,
        actualValue: actualStr,
        expectedValue: `${expectedLength}-character length`,
        message: `'${rule.fieldName}' must be exactly ${expectedLength} characters. Received length ${actualStr?.length ?? 0}.`,
      };
    }

    case "REGEX": {
      const patternStr = String(rule.configuration.pattern ?? "^.*$");
      let matches = false;
      try {
        const regex = new RegExp(patternStr);
        matches = actualStr !== null && regex.test(actualStr);
      } catch {
        matches = false;
      }

      if (matches) {
        return {
          ruleId: rule.id,
          ruleCode: rule.code,
          status: "PASS",
          reasonCode: null,
          actualValue: actualStr,
          expectedValue: `Matching pattern ${patternStr}`,
          message: `${rule.fieldName} matches expected pattern.`,
        };
      }

      const defaultReasonCode: ReasonCode =
        rule.fieldName === "email" ? "INVALID_EMAIL" : "INVALID_LENGTH";

      return {
        ruleId: rule.id,
        ruleCode: rule.code,
        status: failureStatus,
        reasonCode: defaultReasonCode,
        actualValue: actualStr,
        expectedValue: `Matching pattern ${patternStr}`,
        message: `'${rule.fieldName}' value '${actualStr}' does not match required format.`,
      };
    }

    case "ENUM": {
      const allowed = Array.isArray(rule.configuration.allowed)
        ? (rule.configuration.allowed as unknown[]).map(String)
        : [];

      const isAllowed = actualStr !== null && allowed.includes(actualStr);

      if (isAllowed) {
        return {
          ruleId: rule.id,
          ruleCode: rule.code,
          status: "PASS",
          reasonCode: null,
          actualValue: actualStr,
          expectedValue: allowed.join(" or "),
          message: `${rule.fieldName} matches allowed enum value.`,
        };
      }

      const defaultReasonCode: ReasonCode =
        rule.fieldName === "unit" ? "UNMAPPED_UNIT" : "VALUE_OUT_OF_RANGE";

      return {
        ruleId: rule.id,
        ruleCode: rule.code,
        status: failureStatus,
        reasonCode: defaultReasonCode,
        actualValue: actualStr,
        expectedValue: allowed.join(" or "),
        message: `'${rule.fieldName}' value '${actualStr}' is not an allowed enum value.`,
      };
    }

    case "RANGE": {
      const min = rule.configuration.min !== undefined ? Number(rule.configuration.min) : -Infinity;
      const max = rule.configuration.max !== undefined ? Number(rule.configuration.max) : Infinity;
      const numValue = Number(actualRaw);

      const isValidNum = !isNaN(numValue) && numValue >= min && numValue <= max;

      if (isValidNum) {
        return {
          ruleId: rule.id,
          ruleCode: rule.code,
          status: "PASS",
          reasonCode: null,
          actualValue: actualStr,
          expectedValue: `Number between ${min} and ${max}`,
          message: `${rule.fieldName} is within expected range.`,
        };
      }

      return {
        ruleId: rule.id,
        ruleCode: rule.code,
        status: failureStatus,
        reasonCode: "VALUE_OUT_OF_RANGE",
        actualValue: actualStr,
        expectedValue: `Number between ${min} and ${max}`,
        message: `'${rule.fieldName}' value '${actualStr}' is out of range [${min}, ${max}].`,
      };
    }

    case "REFERENCE_EXISTS": {
      const exists = actualStr !== null && (context.validReferences?.has(actualStr) ?? false);

      if (exists) {
        return {
          ruleId: rule.id,
          ruleCode: rule.code,
          status: "PASS",
          reasonCode: null,
          actualValue: actualStr,
          expectedValue: `Existing reference in target system`,
          message: `Reference '${actualStr}' verified.`,
        };
      }

      return {
        ruleId: rule.id,
        ruleCode: rule.code,
        status: failureStatus,
        reasonCode: "UNKNOWN_REFERENCE",
        actualValue: actualStr,
        expectedValue: `Existing reference in target system`,
        message: `Reference '${actualStr}' does not exist in target system.`,
      };
    }

    case "UNIQUE": {
      const isDuplicate = actualStr !== null && (context.existingKeys?.has(actualStr) ?? false);

      if (!isDuplicate) {
        return {
          ruleId: rule.id,
          ruleCode: rule.code,
          status: "PASS",
          reasonCode: null,
          actualValue: actualStr,
          expectedValue: `Unique ${rule.fieldName}`,
          message: `${rule.fieldName} is unique.`,
        };
      }

      return {
        ruleId: rule.id,
        ruleCode: rule.code,
        status: failureStatus,
        reasonCode: "DUPLICATE_TARGET_KEY",
        actualValue: actualStr,
        expectedValue: `Unique ${rule.fieldName}`,
        message: `Duplicate key '${actualStr}' detected for '${rule.fieldName}'.`,
      };
    }

    default: {
      return {
        ruleId: rule.id,
        ruleCode: rule.code,
        status: failureStatus,
        reasonCode: "TRANSFORMATION_ERROR",
        actualValue: actualStr,
        expectedValue: "Supported validation rule type",
        message: `Unsupported validation rule type: ${String(rule.ruleType)}`,
      };
    }
  }
}

/**
 * Evaluates all enabled validation rules for a transformed payload.
 * Pure and deterministic.
 */
export function evaluateValidationRules(
  rules: ValidationRuleDefinition[],
  payload: Record<string, unknown>,
  context: ValidationContext = {},
): RuleEvaluationResult[] {
  const activeRules = rules.filter((r) => r.enabled);
  return activeRules.map((rule) => evaluateValidationRule(rule, payload, context));
}
