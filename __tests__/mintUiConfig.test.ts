import {
  parseGuardSelectionMode,
  parseFeatureEnabled,
  parseMaxMintAmount,
  parseMintProgressDurationMs,
  parseMultimintEnabled,
} from "../utils/mintUiConfig";

describe("mint UI configuration", () => {
  it("does not treat the string false as enabled", () => {
    expect(parseMultimintEnabled("true")).toBe(true);
    expect(parseMultimintEnabled("false")).toBe(false);
    expect(parseMultimintEnabled(undefined)).toBe(false);
  });

  it("validates public feature flags instead of silently enabling typos", () => {
    expect(parseFeatureEnabled(" TRUE ", false, "EXAMPLE_FLAG")).toBe(true);
    expect(parseFeatureEnabled(undefined, true, "EXAMPLE_FLAG")).toBe(true);
    expect(() => parseFeatureEnabled("yes", false, "EXAMPLE_FLAG"))
      .toThrow("EXAMPLE_FLAG must be true or false");
  });

  it("accepts only safe multi-mint limits", () => {
    expect(parseMaxMintAmount("15")).toBe(15);
    expect(parseMaxMintAmount(undefined)).toBe(1);
    expect(() => parseMaxMintAmount("0")).toThrow("between 1 and 15");
    expect(() => parseMaxMintAmount("16")).toThrow("between 1 and 15");
    expect(() => parseMaxMintAmount("1.5")).toThrow("between 1 and 15");
  });

  it("supports explicit automatic or user-selected guard modes", () => {
    expect(parseGuardSelectionMode("best")).toBe("best");
    expect(parseGuardSelectionMode("all")).toBe("all");
    expect(parseGuardSelectionMode("")).toBe("all");
    expect(() => parseGuardSelectionMode("first")).toThrow("best or all");
  });

  it("bounds the minimum progress animation duration", () => {
    expect(parseMintProgressDurationMs(undefined)).toBe(3000);
    expect(parseMintProgressDurationMs("15000")).toBe(15000);
    expect(parseMintProgressDurationMs("0")).toBe(0);
    expect(() => parseMintProgressDurationMs("60001")).toThrow("between 0 and 60000");
  });
});
