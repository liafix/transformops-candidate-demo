export type RunStatus = "DRAFT" | "READY" | "RUNNING" | "VALIDATING" | "COMPLETED" | "FAILED";

export type ObjectType = "CUSTOMER" | "MATERIAL";

export const TERMINAL_RUN_STATES: readonly RunStatus[] = ["COMPLETED", "FAILED"] as const;

export const ALLOWED_TRANSITIONS: Record<RunStatus, readonly RunStatus[]> = {
  DRAFT: ["READY"],
  READY: ["RUNNING"],
  RUNNING: ["VALIDATING", "FAILED"],
  VALIDATING: ["COMPLETED", "FAILED"],
  COMPLETED: [],
  FAILED: [],
};

/**
 * Returns true if the status is a terminal state (COMPLETED or FAILED).
 */
export function isTerminalState(status: RunStatus): boolean {
  return TERMINAL_RUN_STATES.includes(status);
}

/**
 * Checks if a status transition from `currentStatus` to `targetStatus` is valid.
 */
export function canTransition(currentStatus: RunStatus, targetStatus: RunStatus): boolean {
  const allowed = ALLOWED_TRANSITIONS[currentStatus];
  return allowed ? allowed.includes(targetStatus) : false;
}

/**
 * Transitions from `currentStatus` to `targetStatus`.
 * Throws an error if the transition is invalid or if the run is in a terminal state.
 */
export function transitionRunState(currentStatus: RunStatus, targetStatus: RunStatus): RunStatus {
  if (isTerminalState(currentStatus)) {
    throw new Error(
      `Cannot transition run in terminal status '${currentStatus}'. Re-execution requires creating a new run.`,
    );
  }

  if (!canTransition(currentStatus, targetStatus)) {
    throw new Error(`Invalid run status transition from '${currentStatus}' to '${targetStatus}'.`);
  }

  return targetStatus;
}

export interface OriginalRunInfo {
  status: RunStatus;
  runNumber: string;
  sourceSystem: string;
  targetSystem: string;
  objectType: ObjectType;
}

export interface RetryRunSpec {
  runNumber: string;
  sourceSystem: string;
  targetSystem: string;
  objectType: ObjectType;
  status: "READY";
  originalRunNumber: string;
}

/**
 * Generates a specification for a new retry run based on a terminal run.
 * Does NOT mutate the original terminal run.
 */
export function createRetryRunSpec(
  originalRun: OriginalRunInfo,
  newRunNumber: string,
): RetryRunSpec {
  if (!isTerminalState(originalRun.status)) {
    throw new Error(
      `Cannot retry run '${originalRun.runNumber}': only terminal runs (COMPLETED or FAILED) can be retried. Current status is '${originalRun.status}'.`,
    );
  }

  if (!newRunNumber || newRunNumber === originalRun.runNumber) {
    throw new Error("Retry run must be created with a distinct new run number.");
  }

  return {
    runNumber: newRunNumber,
    sourceSystem: originalRun.sourceSystem,
    targetSystem: originalRun.targetSystem,
    objectType: originalRun.objectType,
    status: "READY",
    originalRunNumber: originalRun.runNumber,
  };
}
