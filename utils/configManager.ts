// The browser always talks to the same-origin proxy. RPC_URL is server-only.
export function getActiveRpc(): string {
  if (typeof window !== 'undefined') {
    return new URL('/api/rpc', window.location.origin).toString();
  }
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://127.0.0.1:3000';
  return new URL('/api/rpc', siteUrl).toString();
}
