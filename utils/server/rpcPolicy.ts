export type JsonRpcRequest = {
  jsonrpc: "2.0";
  id?: string | number | null;
  method: string;
  params?: unknown;
};

function firstParamsObject(params: unknown): Record<string, unknown> | undefined {
  const value = Array.isArray(params) ? params[0] : params;
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

function validOptionalInteger(value: unknown, min: number, max: number): boolean {
  return value === undefined || (Number.isSafeInteger(value) && Number(value) >= min && Number(value) <= max);
}

export function validateRpcRequestPolicy(request: JsonRpcRequest): boolean {
  const params = request.params;

  if (request.method === "sendTransaction" || request.method === "simulateTransaction") {
    if (!Array.isArray(params) || typeof params[0] !== "string" || params[0].length > 4096) return false;
    const config = params[1];
    if (config !== undefined && (!config || typeof config !== "object" || Array.isArray(config))) return false;
    if (request.method === "simulateTransaction") {
      const accounts = (config as { accounts?: { addresses?: unknown } } | undefined)?.accounts;
      if (accounts?.addresses && (!Array.isArray(accounts.addresses) || accounts.addresses.length > 20)) return false;
    }
  }

  if (request.method === "getMultipleAccounts") {
    if (!Array.isArray(params) || !Array.isArray(params[0]) || params[0].length > 100) return false;
  }

  if (request.method === "getProgramAccounts") {
    if (!Array.isArray(params) || typeof params[0] !== "string") return false;
    const config = params[1] as { filters?: unknown; dataSlice?: { length?: unknown } } | undefined;
    if (config?.filters && (!Array.isArray(config.filters) || config.filters.length > 8)) return false;
    if (config?.dataSlice && !validOptionalInteger(config.dataSlice.length, 0, 65_536)) return false;
  }

  if (request.method === "getSignaturesForAddress") {
    if (!Array.isArray(params) || typeof params[0] !== "string") return false;
    const config = params[1] as { limit?: unknown } | undefined;
    if (!validOptionalInteger(config?.limit, 1, 100)) return false;
  }

  if (request.method === "getTransaction") {
    if (!Array.isArray(params) || typeof params[0] !== "string" || params[0].length > 128) return false;
  }

  if (["getAsset", "getAssetsByOwner", "searchAssets"].includes(request.method)) {
    const input = firstParamsObject(params);
    if (!input) return false;
    if (!validOptionalInteger(input.limit, 1, 1_000) ||
        !validOptionalInteger(input.page, 1, 10_000)) return false;
  }

  return true;
}
