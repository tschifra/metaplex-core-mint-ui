import {
  consumeMintSubmissionKey,
  getMintAuthorizationMaxAge,
  resetMintSubmissionKeysForTests,
} from "../utils/server/mintAuthorizationCore";

describe("mint submission replay window", () => {
  beforeEach(resetMintSubmissionKeysForTests);

  it("consumes a signed transaction key only once during its lifetime", () => {
    expect(consumeMintSubmissionKey("payer:signature", 10_000, 1_000)).toBe(true);
    expect(consumeMintSubmissionKey("payer:signature", 10_000, 1_001)).toBe(false);
    expect(consumeMintSubmissionKey("payer:signature", 20_000, 10_001)).toBe(true);
  });

  it("caps the replay window to the blockhash lifetime", () => {
    expect(getMintAuthorizationMaxAge("120000")).toBe(120_000);
    expect(() => getMintAuthorizationMaxAge("10800000")).toThrow(/between 5000 and 120000/);
  });
});
