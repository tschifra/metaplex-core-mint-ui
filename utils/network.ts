/**
 * Network configuration utilities
 * Handles switching between devnet and mainnet-beta
 */

type Network = 'devnet' | 'mainnet-beta';

/**
 * Get the current network from environment variables
 * Defaults to devnet if not set
 */
function getNetwork(): Network {
  const env = process.env.NEXT_PUBLIC_ENVIRONMENT as Network;
  return env === 'mainnet-beta' ? 'mainnet-beta' : 'devnet';
}

/**
 * Get the Core Explorer URL for an asset
 */
export function getCoreExplorerUrl(address: string): string {
  const network = getNetwork();
  const env = network === 'devnet' ? '?env=devnet' : '';
  return `https://core.metaplex.com/explorer/${address}${env}`;
}
