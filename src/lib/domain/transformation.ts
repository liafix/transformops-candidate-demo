import type { ObjectType } from "./state-machine";

export type TransformationRuleType =
  | "COUNTRY_MAP"
  | "UNIT_MAP"
  | "TRIM"
  | "LOWERCASE"
  | "IDENTITY";

export interface TransformationRuleDefinition {
  id: string;
  code: string;
  name: string;
  objectType: ObjectType;
  sourceField: string;
  targetField: string;
  ruleType: TransformationRuleType;
  configuration: Record<string, unknown>;
  enabled: boolean;
}

export interface TransformFieldResult {
  value: unknown;
  error?: string;
}

/**
 * Applies a pure transformation rule to a single field value.
 * Pure and deterministic; uses no eval or dynamic execution.
 */
export function applyTransformationRule(
  ruleType: TransformationRuleType,
  fieldValue: unknown,
  config: Record<string, unknown>,
): TransformFieldResult {
  if (fieldValue === null || fieldValue === undefined) {
    return { value: null };
  }

  const strValue = String(fieldValue);

  switch (ruleType) {
    case "TRIM": {
      return { value: strValue.trim() };
    }

    case "LOWERCASE": {
      let result = strValue.toLowerCase();
      if (config.trim === true) {
        result = result.trim();
      }
      return { value: result };
    }

    case "COUNTRY_MAP": {
      const mapped = config[strValue];
      if (typeof mapped === "string") {
        return { value: mapped };
      }
      return { value: "UNKNOWN", error: `Unmapped country value '${strValue}'.` };
    }

    case "UNIT_MAP": {
      const mapped = config[strValue];
      if (typeof mapped === "string") {
        return { value: mapped };
      }
      return { value: null, error: `Unmapped unit value '${strValue}'.` };
    }

    case "IDENTITY": {
      return { value: fieldValue };
    }

    default: {
      return { value: fieldValue, error: `Unknown rule type: ${String(ruleType)}` };
    }
  }
}

export interface TransformPayloadResult {
  payload: Record<string, unknown>;
  transformErrors: string[];
}

/**
 * Transforms a source record payload by applying enabled transformation rules.
 * Copies unmapped fields directly and maps target fields via configured rules.
 */
export function transformPayload(
  sourcePayload: Record<string, unknown>,
  rules: TransformationRuleDefinition[],
): TransformPayloadResult {
  const resultPayload: Record<string, unknown> = { ...sourcePayload };
  const transformErrors: string[] = [];

  const activeRules = rules.filter((r) => r.enabled);

  for (const rule of activeRules) {
    const rawValue = sourcePayload[rule.sourceField];
    const { value, error } = applyTransformationRule(
      rule.ruleType,
      rawValue,
      rule.configuration,
    );

    resultPayload[rule.targetField] = value;
    if (error) {
      transformErrors.push(`${rule.code}: ${error}`);
    }
  }

  return {
    payload: resultPayload,
    transformErrors,
  };
}
