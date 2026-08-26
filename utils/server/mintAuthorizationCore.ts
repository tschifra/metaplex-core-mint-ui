const MAX_NONCES = 10_000;
const usedNonces = new Map<string, number>();
let lastNonceCleanup = 0;

export function getMintAuthorizationMaxAge(
  raw = process.env.MINT_AUTHORIZATION_MAX_AGE_MS
): number {
  const parsed = Number(raw || "30000");
  if (!Number.isSafeInteger(parsed) || parsed < 5_000 || parsed > 120_000) {
    throw new Error("MINT_AUTHORIZATION_MAX_AGE_MS must be between 5000 and 120000");
  }
  return parsed;
}

function cleanupNonces(now: number) {
  if (now - lastNonceCleanup < 60_000) return;
  lastNonceCleanup = now;
  for (const [key, expiresAt] of usedNonces) {
    if (expiresAt <= now) usedNonces.delete(key);
  }
}

export function consumeMintSubmissionKey(
  submissionKey: string,
  expiresAt: number,
  now = Date.now()
): boolean {
  cleanupNonces(now);
  const existing = usedNonces.get(submissionKey);
  if (existing && existing > now) return false;
  if (!existing && usedNonces.size >= MAX_NONCES) return false;
  usedNonces.set(submissionKey, expiresAt);
  return true;
}

export function resetMintSubmissionKeysForTests() {
  usedNonces.clear();
  lastNonceCleanup = 0;
}
