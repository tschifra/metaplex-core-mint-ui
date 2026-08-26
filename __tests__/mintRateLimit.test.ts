import {
  consumeMintRateLimit,
  getMintRateLimits,
  resetMintRateLimitForTests,
} from "../utils/server/mintRateLimitCore";

describe("mint authorization rate limits", () => {
  const original = { ...process.env };

  beforeEach(() => {
    resetMintRateLimitForTests();
    process.env.MINT_IP_RATE_LIMIT_PER_MINUTE = "2";
    process.env.MINT_PAYER_RATE_LIMIT_PER_MINUTE = "10";
  });

  afterAll(() => {
    process.env = original;
  });

  it("blocks payer-key rotation from one IP", () => {
    expect(consumeMintRateLimit("203.0.113.1", "payer-a", 1_000).allowed).toBe(true);
    expect(consumeMintRateLimit("203.0.113.1", "payer-b", 1_001).allowed).toBe(true);
    expect(consumeMintRateLimit("203.0.113.1", "payer-c", 1_002)).toMatchObject({
      allowed: false,
      scope: "ip",
    });
  });

  it("also limits one payer across different IPs", () => {
    process.env.MINT_IP_RATE_LIMIT_PER_MINUTE = "100";
    process.env.MINT_PAYER_RATE_LIMIT_PER_MINUTE = "2";
    expect(consumeMintRateLimit("203.0.113.1", "payer-a", 1_000).allowed).toBe(true);
    expect(consumeMintRateLimit("203.0.113.2", "payer-a", 1_001).allowed).toBe(true);
    expect(consumeMintRateLimit("203.0.113.3", "payer-a", 1_002)).toMatchObject({
      allowed: false,
      scope: "payer",
    });
  });

  it("fails closed on invalid explicit limits", () => {
    process.env.MINT_IP_RATE_LIMIT_PER_MINUTE = "0";
    expect(() => getMintRateLimits()).toThrow(/between 1 and 10000/);
  });
});
