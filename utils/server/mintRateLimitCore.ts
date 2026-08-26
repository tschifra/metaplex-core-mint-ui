type MintRateLimitScope = "ip" | "payer";

export type MintRateLimitResult = {
  allowed: boolean;
  scope?: MintRateLimitScope;
  retryAfter: number;
};

type FixedWindow = { count: number; resetAt: number };

const WINDOW_MS = 60_000;
const MAX_BUCKETS_PER_SCOPE = 10_000;
const ipWindows = new Map<string, FixedWindow>();
const payerWindows = new Map<string, FixedWindow>();
let lastCleanup = 0;

function parseLimit(value: string | undefined, fallback: number): number {
  if (value === undefined || value.trim() === "") return fallback;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > 10_000) {
    throw new Error("Mint rate limits must be integers between 1 and 10000");
  }
  return parsed;
}

export function getMintRateLimits() {
  const legacy = parseLimit(process.env.MINT_RATE_LIMIT_PER_MINUTE, 30);
  return {
    ip: parseLimit(process.env.MINT_IP_RATE_LIMIT_PER_MINUTE, Math.max(legacy, 60)),
    payer: parseLimit(process.env.MINT_PAYER_RATE_LIMIT_PER_MINUTE, legacy),
  };
}

function cleanup(now: number) {
  if (now - lastCleanup < WINDOW_MS) return;
  lastCleanup = now;
  for (const windows of [ipWindows, payerWindows]) {
    for (const [key, window] of windows) {
      if (window.resetAt <= now) windows.delete(key);
    }
  }
}

function consume(
  windows: Map<string, FixedWindow>,
  key: string,
  limit: number,
  now: number
): { allowed: boolean; retryAfter: number } {
  const current = windows.get(key);
  if (!current || current.resetAt <= now) {
    if (!current && windows.size >= MAX_BUCKETS_PER_SCOPE) {
      return { allowed: false, retryAfter: 60 };
    }
    windows.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, retryAfter: 0 };
  }

  current.count += 1;
  return {
    allowed: current.count <= limit,
    retryAfter: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
  };
}

export function consumeMintRateLimit(
  ip: string,
  payer: string,
  now = Date.now()
): MintRateLimitResult {
  cleanup(now);
  const limits = getMintRateLimits();

  // Consume the IP bucket first so rotating payer keys cannot bypass it.
  const ipResult = consume(ipWindows, ip, limits.ip, now);
  if (!ipResult.allowed) return { allowed: false, scope: "ip", retryAfter: ipResult.retryAfter };

  const payerResult = consume(payerWindows, payer, limits.payer, now);
  if (!payerResult.allowed) {
    return { allowed: false, scope: "payer", retryAfter: payerResult.retryAfter };
  }
  return { allowed: true, retryAfter: 0 };
}

export function resetMintRateLimitForTests() {
  ipWindows.clear();
  payerWindows.clear();
  lastCleanup = 0;
}
