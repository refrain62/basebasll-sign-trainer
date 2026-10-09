import { describe, expect, test } from "vitest";
import { isValidPublicOperatorName } from "../../scripts/operations-preflight.ts";

describe("operations preflight", () => {
  test("accepts the approved public operator name", () => {
    expect(isValidPublicOperatorName("SIGN TRAINER 運営者")).toBe(true);
  });

  test("rejects empty and change-me placeholder operator names", () => {
    expect(isValidPublicOperatorName("")).toBe(false);
    expect(isValidPublicOperatorName("change-me")).toBe(false);
    expect(isValidPublicOperatorName("change_me")).toBe(false);
    expect(isValidPublicOperatorName("change me")).toBe(false);
  });
});
