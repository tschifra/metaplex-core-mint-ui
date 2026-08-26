export type GuardSelectionMode = "best" | "all";

export function parseFeatureEnabled(
  value: string | undefined,
  fallback = false,
  variableName = "feature flag"
): boolean {
  if (value === undefined || value.trim() === "") return fallback;
  const normalized = value.trim().toLowerCase();
  if (normalized === "true") return true;
  if (normalized === "false") return false;
  throw new Error(`${variableName} must be true or false`);
}

export function parseMultimintEnabled(
  value = process.env.NEXT_PUBLIC_MULTIMINT
): boolean {
  return parseFeatureEnabled(value, false, "NEXT_PUBLIC_MULTIMINT");
}

export function parseMaxMintAmount(
  value = process.env.NEXT_PUBLIC_MAXMINTAMOUNT
): number {
  if (!value?.trim()) return 1;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > 15) {
    throw new Error("NEXT_PUBLIC_MAXMINTAMOUNT must be an integer between 1 and 15");
  }
  return parsed;
}

export function parseGuardSelectionMode(
  value = process.env.NEXT_PUBLIC_GUARD_SELECTION_MODE
): GuardSelectionMode {
  const normalized = value?.trim().toLowerCase() || "all";
  if (normalized !== "best" && normalized !== "all") {
    throw new Error("NEXT_PUBLIC_GUARD_SELECTION_MODE must be best or all");
  }
  return normalized;
}

export function parseMintProgressDurationMs(
  value = process.env.NEXT_PUBLIC_MINT_PROGRESS_MIN_MS
): number {
  if (!value?.trim()) return 3000;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0 || parsed > 60_000) {
    throw new Error(
      "NEXT_PUBLIC_MINT_PROGRESS_MIN_MS must be an integer between 0 and 60000"
    );
  }
  return parsed;
}

export function parsePriorityFeeMicroLamports(
  value = process.env.NEXT_PUBLIC_MICROLAMPORTS
): number {
  if (!value?.trim()) return 1001;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0 || parsed > 10_000_000) {
    throw new Error(
      "NEXT_PUBLIC_MICROLAMPORTS must be an integer between 0 and 10000000"
    );
  }
  return parsed;
}

export function parseFallbackMintPrice(
  value = process.env.NEXT_PUBLIC_MINT_PRICE
): number | undefined {
  if (!value?.trim()) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error("NEXT_PUBLIC_MINT_PRICE must be a non-negative number");
  }
  return parsed;
}
