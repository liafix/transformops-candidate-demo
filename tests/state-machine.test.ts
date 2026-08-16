import { describe, expect, it } from "vitest";
import {
  canTransition,
  createRetryRunSpec,
  isTerminalState,
  transitionRunState,
  type OriginalRunInfo,
  type RunStatus,
} from "../src/lib/domain/state-machine";

describe("Run State Machine", () => {
  describe("isTerminalState", () => {
    it("identifies COMPLETED and FAILED as terminal states", () => {
      expect(isTerminalState("COMPLETED")).toBe(true);
      expect(isTerminalState("FAILED")).toBe(true);
    });

    it("identifies non-terminal states correctly", () => {
      const nonTerminal: RunStatus[] = ["DRAFT", "READY", "RUNNING", "VALIDATING"];
      for (const status of nonTerminal) {
        expect(isTerminalState(status)).toBe(false);
      }
    });
  });

  describe("transitionRunState - valid transitions", () => {
    it("allows standard forward progression: DRAFT -> READY -> RUNNING -> VALIDATING -> COMPLETED", () => {
      let state: RunStatus = "DRAFT";
      state = transitionRunState(state, "READY");
      expect(state).toBe("READY");

      state = transitionRunState(state, "RUNNING");
      expect(state).toBe("RUNNING");

      state = transitionRunState(state, "VALIDATING");
      expect(state).toBe("VALIDATING");

      state = transitionRunState(state, "COMPLETED");
      expect(state).toBe("COMPLETED");
    });

    it("allows failure transitions from RUNNING or VALIDATING to FAILED", () => {
      expect(transitionRunState("RUNNING", "FAILED")).toBe("FAILED");
      expect(transitionRunState("VALIDATING", "FAILED")).toBe("FAILED");
    });
  });

  describe("transitionRunState - invalid transitions", () => {
    it("rejects illegal skip transitions", () => {
      expect(() => transitionRunState("DRAFT", "COMPLETED")).toThrowError(
        /Invalid run status transition from 'DRAFT' to 'COMPLETED'/,
      );
      expect(() => transitionRunState("READY", "VALIDATING")).toThrowError(
        /Invalid run status transition from 'READY' to 'VALIDATING'/,
      );
      expect(() => transitionRunState("DRAFT", "RUNNING")).toThrowError();
    });

    it("rejects backward transitions", () => {
      expect(() => transitionRunState("VALIDATING", "RUNNING")).toThrowError();
      expect(() => transitionRunState("RUNNING", "READY")).toThrowError();
      expect(() => transitionRunState("READY", "DRAFT")).toThrowError();
    });

    it("rejects transitions from terminal states COMPLETED and FAILED", () => {
      expect(() => transitionRunState("COMPLETED", "READY")).toThrowError(
        /Cannot transition run in terminal status 'COMPLETED'/,
      );
      expect(() => transitionRunState("FAILED", "RUNNING")).toThrowError(
        /Cannot transition run in terminal status 'FAILED'/,
      );
    });
  });

  describe("canTransition", () => {
    it("returns boolean reflecting transition validity", () => {
      expect(canTransition("DRAFT", "READY")).toBe(true);
      expect(canTransition("RUNNING", "FAILED")).toBe(true);
      expect(canTransition("COMPLETED", "READY")).toBe(false);
      expect(canTransition("FAILED", "RUNNING")).toBe(false);
    });
  });

  describe("createRetryRunSpec", () => {
    const originalCompletedRun: OriginalRunInfo = {
      status: "COMPLETED",
      runNumber: "TR-1041",
      sourceSystem: "LEGACY_ERP",
      targetSystem: "CLOUD_ERP",
      objectType: "CUSTOMER",
    };

    const originalFailedRun: OriginalRunInfo = {
      status: "FAILED",
      runNumber: "TR-1043",
      sourceSystem: "LEGACY_ERP",
      targetSystem: "CLOUD_ERP",
      objectType: "CUSTOMER",
    };

    it("creates a new run spec in READY status from a COMPLETED run without mutating original run", () => {
      const retrySpec = createRetryRunSpec(originalCompletedRun, "TR-1041-RETRY-1");

      expect(retrySpec).toEqual({
        runNumber: "TR-1041-RETRY-1",
        sourceSystem: "LEGACY_ERP",
        targetSystem: "CLOUD_ERP",
        objectType: "CUSTOMER",
        status: "READY",
        originalRunNumber: "TR-1041",
      });

      expect(originalCompletedRun.status).toBe("COMPLETED");
    });

    it("creates a new run spec in READY status from a FAILED run", () => {
      const retrySpec = createRetryRunSpec(originalFailedRun, "TR-1043-RETRY-1");
      expect(retrySpec.status).toBe("READY");
      expect(retrySpec.originalRunNumber).toBe("TR-1043");
    });

    it("throws error when trying to retry a non-terminal run", () => {
      const activeRun: OriginalRunInfo = {
        status: "RUNNING",
        runNumber: "TR-1045",
        sourceSystem: "LEGACY_ERP",
        targetSystem: "CLOUD_ERP",
        objectType: "CUSTOMER",
      };

      expect(() => createRetryRunSpec(activeRun, "TR-1045-RETRY")).toThrowError(
        /only terminal runs \(COMPLETED or FAILED\) can be retried/,
      );
    });

    it("throws error when new run number is blank or identical to original run number", () => {
      expect(() => createRetryRunSpec(originalCompletedRun, "TR-1041")).toThrowError(
        /distinct new run number/,
      );
      expect(() => createRetryRunSpec(originalCompletedRun, "")).toThrowError(
        /distinct new run number/,
      );
    });
  });
});
