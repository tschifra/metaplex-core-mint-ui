const MAX_NONCES = 10_000;
const usedNonces = new Map<string, number>();
let lastNonceCleanup = 0;

export type MintAuthorization = {
  memo: string;
  nonceKey: string;
  issuedAt: number;
};

export function getMintAuthorizationMaxAge(
  raw = process.env.MINT_AUTHORIZATION_MAX_AGE_MS
): number {
  const parsed = Number(raw || "30000");
  if (!Number.isSafeInteger(parsed) || parsed < 5_000 || parsed > 120_000) {
    throw new Error("MINT_AUTHORIZATION_MAX_AGE_MS must be between 5000 and 120000");
  }
  return parsed;
}

export function parseMintAuthorizationMemo(
  data: Uint8Array,
  expectedPayer: string,
  now = Date.now(),
  maxAge = getMintAuthorizationMaxAge()
): MintAuthorization {
  let memo: string;
  try {
    memo = new TextDecoder("utf-8", { fatal: true }).decode(data);
  } catch {
    throw new Error("Mint authorization memo is not valid UTF-8");
  }

  const match = /^mintui:v1:([1-9A-HJ-NP-Za-km-z]{32,44}):(\d{13}):([0-9a-f]{32})$/.exec(memo);
  if (!match || match[1] !== expectedPayer) {
    throw new Error("Missing or invalid mint authorization memo");
  }

  const issuedAt = Number(match[2]);
  if (!Number.isSafeInteger(issuedAt) || issuedAt > now + 2_000 || now - issuedAt > maxAge) {
    throw new Error("Mint authorization expired; approve a fresh transaction");
  }

  return {
    memo,
    nonceKey: `${match[1]}:${match[3]}`,
    issuedAt,
  };
}

function cleanupNonces(now: number) {
  if (now - lastNonceCleanup < 60_000) return;
  lastNonceCleanup = now;
  for (const [key, expiresAt] of usedNonces) {
    if (expiresAt <= now) usedNonces.delete(key);
  }
}

export function consumeMintAuthorizationNonce(
  nonceKey: string,
  expiresAt: number,
  now = Date.now()
): boolean {
  cleanupNonces(now);
  const existing = usedNonces.get(nonceKey);
  if (existing && existing > now) return false;
  if (!existing && usedNonces.size >= MAX_NONCES) return false;
  usedNonces.set(nonceKey, expiresAt);
  return true;
}

export function resetMintAuthorizationNoncesForTests() {
  usedNonces.clear();
  lastNonceCleanup = 0;
}
