// Add project-specific allowlists before enabling an on-chain allowList guard.
// The map key must exactly match the Candy Guard group label (or "default"),
// and the addresses must be the same ordered input used for the Merkle root.
//
// Example:
// export const allowLists = new Map<string, string[]>([
//   ["WL", ["WALLET_PUBLIC_KEY"]],
// ]);
export const allowLists = new Map<string, string[]>();
