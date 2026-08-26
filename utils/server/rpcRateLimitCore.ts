export type RpcRateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfter: number;
  scope: "instance";
};

type RateBucket = { tokens: number; updatedAt: number };

const buckets = new Map<string, RateBucket>();
let lastBucketCleanup = 0;
const MAX_BUCKETS = 10_000;

export function parseRpcRateLimit(raw = process.env.RPC_RATE_LIMIT_PER_MINUTE): number {
  const configured = Number(raw || "180");
  return Number.isSafeInteger(configured) && configured >= 10 && configured <= 10_000
    ? configured
    : 180;
}

function cleanupBuckets(now: number) {
  if (now - lastBucketCleanup < 60_000) return;
  lastBucketCleanup = now;
  const staleBefore = now - 120_000;
  for (const [key, bucket] of buckets) {
    if (bucket.updatedAt < staleBefore) buckets.delete(key);
  }
}

export function consumeLocalRateLimit(
  clientId: string,
  cost: number,
  now = Date.now()
): RpcRateLimitResult {
  cleanupBuckets(now);
  const capacity = parseRpcRateLimit();
  const existing = buckets.get(clientId);
  if (!existing && buckets.size >= MAX_BUCKETS) {
    return {
      allowed: false,
      limit: capacity,
      remaining: 0,
      retryAfter: 60,
      scope: "instance",
    };
  }
  const previous = existing || { tokens: capacity, updatedAt: now };
  const refill = ((now - previous.updatedAt) / 60_000) * capacity;
  const tokens = Math.min(capacity, previous.tokens + refill);
  const allowed = tokens >= cost;
  const remaining = Math.max(0, tokens - (allowed ? cost : 0));
  buckets.set(clientId, { tokens: remaining, updatedAt: now });

  return {
    allowed,
    limit: capacity,
    remaining: Math.floor(remaining),
    retryAfter: Math.max(1, Math.ceil(((cost - tokens) / capacity) * 60)),
    scope: "instance",
  };
}

export function resetLocalRpcRateLimitForTests() {
  buckets.clear();
  lastBucketCleanup = 0;
}
