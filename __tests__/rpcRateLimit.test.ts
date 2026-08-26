import {
  consumeLocalRateLimit,
  parseRpcRateLimit,
  resetLocalRpcRateLimitForTests,
} from "../utils/server/rpcRateLimitCore";

describe("RPC rate limiting", () => {
  const originalLimit = process.env.RPC_RATE_LIMIT_PER_MINUTE;

  afterEach(() => {
    if (originalLimit === undefined) delete process.env.RPC_RATE_LIMIT_PER_MINUTE;
    else process.env.RPC_RATE_LIMIT_PER_MINUTE = originalLimit;
    resetLocalRpcRateLimitForTests();
  });

  it("uses a safe default for invalid limits", () => {
    expect(parseRpcRateLimit("not-a-number")).toBe(180);
    expect(parseRpcRateLimit("9")).toBe(180);
    expect(parseRpcRateLimit("10001")).toBe(180);
    expect(parseRpcRateLimit("300")).toBe(300);
  });

  it("charges weighted request costs in the local fallback", () => {
    process.env.RPC_RATE_LIMIT_PER_MINUTE = "10";
    const first = consumeLocalRateLimit("client-a", 7, 1_000);
    const second = consumeLocalRateLimit("client-a", 4, 1_000);

    expect(first.allowed).toBe(true);
    expect(first.remaining).toBe(3);
    expect(second.allowed).toBe(false);
  });
});
