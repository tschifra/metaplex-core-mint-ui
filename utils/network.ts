/**
 * Network configuration utilities
 * Handles switching between devnet and mainnet-beta
 */

export type Network = 'devnet' | 'mainnet-beta';

/**
 * Get the current network from environment variables
 * Defaults to devnet if not set
 */
export function getNetwork(): Network {
  const env = process.env.NEXT_PUBLIC_ENVIRONMENT as Network;
  return env === 'mainnet-beta' ? 'mainnet-beta' : 'devnet';
}

/**
 * Get the network parameter for URLs
 * devnet returns 'devnet', mainnet returns 'mainnet' (without -beta)
 */
export function getNetworkParam(): string {
  const network = getNetwork();
  return network === 'mainnet-beta' ? 'mainnet' : 'devnet';
}

/**
 * Get the Core Explorer URL for an asset
 */
export function getCoreExplorerUrl(address: string): string {
  const network = getNetwork();
  const env = network === 'devnet' ? '?env=devnet' : '';
  return `https://core.metaplex.com/explorer/${address}${env}`;
}

/**
 * Get the Solana Explorer URL for a transaction or address
 */
export function getSolanaExplorerUrl(signature: string, type: 'tx' | 'address' = 'tx'): string {
  const network = getNetwork();
  const cluster = network === 'devnet' ? '?cluster=devnet' : '';
  return `https://explorer.solana.com/${type}/${signature}${cluster}`;
}

/**
 * Check if we're on mainnet
 */
export function isMainnet(): boolean {
  return getNetwork() === 'mainnet-beta';
}

/**
 * Check if we're on devnet
 */
export function isDevnet(): boolean {
  return getNetwork() === 'devnet';
}

/**
 * Get network display name
 */
export function getNetworkDisplayName(): string {
  return isMainnet() ? 'Mainnet' : 'Devnet';
}
