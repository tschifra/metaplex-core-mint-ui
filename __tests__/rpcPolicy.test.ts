import { validateRpcRequestPolicy } from "../utils/server/rpcPolicy";

const request = (method: string, params: unknown) => ({
  jsonrpc: "2.0" as const,
  id: 1,
  method,
  params,
});

describe("RPC proxy parameter policy", () => {
  it("bounds serialized transactions", () => {
    expect(validateRpcRequestPolicy(request("sendTransaction", ["AQID", {}]))).toBe(true);
    expect(validateRpcRequestPolicy(request("sendTransaction", ["x".repeat(4097)]))).toBe(false);
  });

  it("bounds account fanout and history queries", () => {
    expect(validateRpcRequestPolicy(request("getMultipleAccounts", [Array(100).fill("key")]))).toBe(true);
    expect(validateRpcRequestPolicy(request("getMultipleAccounts", [Array(101).fill("key")]))).toBe(false);
    expect(validateRpcRequestPolicy(request("getSignaturesForAddress", ["key", { limit: 101 }]))).toBe(false);
  });

  it("bounds DAS pagination", () => {
    expect(validateRpcRequestPolicy(request("searchAssets", { limit: 10, page: 1 }))).toBe(true);
    expect(validateRpcRequestPolicy(request("searchAssets", { limit: 1001, page: 1 }))).toBe(false);
  });

  it("bounds simulation account return data", () => {
    expect(validateRpcRequestPolicy(request("simulateTransaction", ["AQID", {
      accounts: { addresses: Array(21).fill("key") },
    }]))).toBe(false);
  });
});
