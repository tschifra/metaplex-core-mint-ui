import type { NextApiRequest, NextApiResponse } from "next";
import { consumeLocalRateLimit } from "../../utils/server/rpcRateLimitCore";
import { JsonRpcRequest, validateRpcRequestPolicy } from "../../utils/server/rpcPolicy";

const MAX_BATCH_SIZE = 5;
const MAX_UPSTREAM_BYTES = 8 * 1024 * 1024;

const ALLOWED_METHODS = new Set([
  // Solana reads used by Umi, web3.js and wallet adapters.
  "getAccountInfo",
  "getBalance",
  "getBlockHeight",
  "getBlockTime",
  "getEpochInfo",
  "getFeeForMessage",
  "getGenesisHash",
  "getLatestBlockhash",
  "getMinimumBalanceForRentExemption",
  "getMultipleAccounts",
  "getProgramAccounts",
  "getRecentPrioritizationFees",
  "getSignatureStatuses",
  "getSignaturesForAddress",
  "getSlot",
  "getTokenAccountBalance",
  "getTokenAccountsByOwner",
  "getTransaction",
  "getVersion",
  "isBlockhashValid",
  // Signed transaction submission and preflight.
  "sendTransaction",
  "simulateTransaction",
  // DAS methods used by the gallery and ownership checks.
  "getAsset",
  "getAssetsByOwner",
  "searchAssets",
]);

const METHOD_COST: Record<string, number> = {
  sendTransaction: 15,
  simulateTransaction: 10,
  getProgramAccounts: 25,
  getTransaction: 5,
  getAssetsByOwner: 10,
  searchAssets: 10,
};

function jsonError(res: NextApiResponse, status: number, message: string) {
  return res.status(status).json({
    jsonrpc: "2.0",
    id: null,
    error: { code: -32000, message },
  });
}

function enforceSameOrigin(req: NextApiRequest) {
  const origin = req.headers.origin;
  const host = req.headers.host;
  const requireOrigin = process.env.RPC_REQUIRE_ORIGIN === "true" ||
    (process.env.RPC_REQUIRE_ORIGIN !== "false" && process.env.NODE_ENV === "production");
  if (!origin || !host) return !requireOrigin;
  try {
    const configured = (process.env.RPC_ALLOWED_ORIGINS || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
      .map((value) => new URL(value).origin);
    const parsed = new URL(origin);
    return parsed.host === host || configured.includes(parsed.origin);
  } catch {
    return false;
  }
}

function getClientId(req: NextApiRequest) {
  return String(req.headers["x-vercel-forwarded-for"] || req.headers["x-forwarded-for"] ||
    req.socket.remoteAddress || "unknown")
    .split(",")[0]
    .trim();
}

function isRpcRequest(value: unknown): value is JsonRpcRequest {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const request = value as Partial<JsonRpcRequest>;
  return request.jsonrpc === "2.0" &&
    typeof request.method === "string" &&
    (request.params === undefined || Array.isArray(request.params) ||
      (typeof request.params === "object" && request.params !== null));
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return jsonError(res, 405, "Method not allowed");
  }
  if (!String(req.headers["content-type"] || "").toLowerCase().startsWith("application/json")) {
    return jsonError(res, 415, "Content-Type must be application/json");
  }
  if (!enforceSameOrigin(req)) return jsonError(res, 403, "Origin not allowed");

  const requests = Array.isArray(req.body) ? req.body : [req.body];
  if (requests.length === 0 || requests.length > MAX_BATCH_SIZE || !requests.every(isRpcRequest)) {
    return jsonError(res, 400, "Invalid JSON-RPC request");
  }
  if (requests.some((request) => !ALLOWED_METHODS.has(request.method))) {
    return jsonError(res, 403, "RPC method is not allowed");
  }
  if (requests.some((request) => !validateRpcRequestPolicy(request))) {
    return jsonError(res, 400, "RPC parameters exceed the proxy policy");
  }

  const cost = requests.reduce((total, request) => total + (METHOD_COST[request.method] || 1), 0);
  const rate = consumeLocalRateLimit(getClientId(req), cost);
  res.setHeader("X-RateLimit-Limit", String(rate.limit));
  res.setHeader("X-RateLimit-Remaining", String(rate.remaining));
  res.setHeader("X-RateLimit-Scope", rate.scope);
  if (!rate.allowed) {
    res.setHeader("Retry-After", String(rate.retryAfter));
    return jsonError(res, 429, "RPC rate limit exceeded");
  }

  const rpcUrl = process.env.RPC_URL;
  if (!rpcUrl) return jsonError(res, 503, "RPC proxy is not configured");
  try {
    const parsed = new URL(rpcUrl);
    if (parsed.protocol !== "https:" && !(process.env.NODE_ENV !== "production" && parsed.protocol === "http:")) {
      return jsonError(res, 503, "RPC proxy configuration is invalid");
    }
  } catch {
    return jsonError(res, 503, "RPC proxy configuration is invalid");
  }

  const timeoutMs = Math.min(30_000, Math.max(3_000, Number(process.env.RPC_TIMEOUT_MS || "15000")));
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const upstream = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Array.isArray(req.body) ? requests : requests[0]),
      signal: controller.signal,
      cache: "no-store",
    });
    const length = Number(upstream.headers.get("content-length") || "0");
    if (length > MAX_UPSTREAM_BYTES) return jsonError(res, 502, "RPC response is too large");
    const bytes = new Uint8Array(await upstream.arrayBuffer());
    if (bytes.byteLength > MAX_UPSTREAM_BYTES) return jsonError(res, 502, "RPC response is too large");

    res.setHeader("Content-Type", "application/json");
    return res.status(upstream.ok ? 200 : upstream.status).send(Buffer.from(bytes));
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "AbortError";
    return jsonError(res, timedOut ? 504 : 502, timedOut ? "RPC request timed out" : "RPC upstream failed");
  } finally {
    clearTimeout(timeout);
  }
}

export const config = {
  api: {
    bodyParser: { sizeLimit: "256kb" },
    responseLimit: "8mb",
  },
};
