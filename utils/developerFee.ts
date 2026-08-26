export const DEVELOPER_FEE_RECIPIENT =
  "3C4pgjwo1bbHoLnL6JB8nA4tKPNi7aXbYuK8XgDxH2xK";

export const DEVELOPER_FEE_LAMPORTS = 6_500_000;
export const DEVELOPER_FEE_SOL = DEVELOPER_FEE_LAMPORTS / 1_000_000_000;

export function isDeveloperFeeEnabled(): boolean {
  return process.env.NEXT_PUBLIC_DEVELOPER_FEE_ENABLED?.toLowerCase() === "true";
}

export function getDeveloperFeeLamports(): bigint {
  return isDeveloperFeeEnabled() ? BigInt(DEVELOPER_FEE_LAMPORTS) : BigInt(0);
}

export function getDeveloperFeeSol(): number {
  return isDeveloperFeeEnabled() ? DEVELOPER_FEE_SOL : 0;
}
