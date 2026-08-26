type MintSimulationResult = {
  err: unknown;
  logs?: string[] | null;
  accounts?: Array<unknown | null> | null;
};

export function mintSimulationCreatedAsset(
  result: MintSimulationResult
): boolean {
  if (result.err !== null) return false;
  if (result.logs?.some((log) => log.includes("Candy Guard Botting is taxed"))) {
    return false;
  }

  return result.accounts?.length === 1 && result.accounts[0] !== null;
}
