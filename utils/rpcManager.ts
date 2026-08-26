// RPC Manager - Failover and retry logic for Solana RPC calls
// Provides automatic failover to backup RPCs and exponential backoff retry
import { getActiveRpc } from "./configManager";

interface RPCEndpoint {
  url: string;
  weight: number; // Priority weight (higher = preferred)
  healthy: boolean;
  lastError?: number;
  errorCount: number;
}

class RPCManager {
  private endpoints: RPCEndpoint[] = [];
  private currentIndex: number = 0;
  constructor() {
    this.initializeEndpoints();
  }

  private initializeEndpoints() {
    this.endpoints.push({
      url: getActiveRpc(),
      weight: 100,
      healthy: true,
      errorCount: 0,
    });
  }

  // Get the best available RPC endpoint
  getBestEndpoint(): string {
    const healthyEndpoints = this.endpoints.filter(e => e.healthy);

    if (healthyEndpoints.length === 0) {
      // All unhealthy - reset and try primary
      this.endpoints.forEach(e => {
        e.healthy = true;
        e.errorCount = 0;
      });
      return this.endpoints[0]?.url || '';
    }

    return healthyEndpoints[0].url;
  }

  // Get current endpoint
  getCurrentEndpoint(): string {
    return this.endpoints[this.currentIndex]?.url || this.getBestEndpoint();
  }

  // Mark endpoint as failed
  markFailed(url: string) {
    const endpoint = this.endpoints.find(e => e.url === url);
    if (endpoint) {
      endpoint.errorCount++;
      endpoint.lastError = Date.now();

      // Mark unhealthy after 3 consecutive errors
      if (endpoint.errorCount >= 3) {
        endpoint.healthy = false;
      }
    }
  }

  // Mark endpoint as successful
  markSuccess(url: string) {
    const endpoint = this.endpoints.find(e => e.url === url);
    if (endpoint) {
      endpoint.errorCount = 0;
      endpoint.healthy = true;
    }
  }

  // Get next available endpoint (for failover)
  getNextEndpoint(): string {
    const currentUrl = this.getCurrentEndpoint();
    this.markFailed(currentUrl);

    const healthyEndpoints = this.endpoints.filter(e => e.healthy && e.url !== currentUrl);
    if (healthyEndpoints.length > 0) {
      return healthyEndpoints[0].url;
    }

    return this.getBestEndpoint();
  }

  // Get all endpoints for status display
  getEndpointStatus(): Array<{ url: string; healthy: boolean; errorCount: number }> {
    return this.endpoints.map(e => ({
      url: e.url.replace(/\/\/.*@/, '//***@'), // Hide API keys
      healthy: e.healthy,
      errorCount: e.errorCount,
    }));
  }
}

// Singleton instance
export const rpcManager = new RPCManager();

// Retry configuration
export interface RetryConfig {
  maxRetries: number;
  baseDelay: number; // ms
  maxDelay: number; // ms
  backoffMultiplier: number;
}

export const defaultRetryConfig: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
};

// Calculate delay with exponential backoff and jitter
export function calculateRetryDelay(attempt: number, config: RetryConfig = defaultRetryConfig): number {
  const delay = Math.min(
    config.baseDelay * Math.pow(config.backoffMultiplier, attempt),
    config.maxDelay
  );
  // Add jitter (±25%)
  const jitter = delay * 0.25 * (Math.random() * 2 - 1);
  return Math.round(delay + jitter);
}

// Retry wrapper for async functions
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = defaultRetryConfig,
  onRetry?: (attempt: number, error: Error, delay: number) => void
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      const result = await fn();
      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < config.maxRetries) {
        const delay = calculateRetryDelay(attempt, config);
        onRetry?.(attempt + 1, lastError, delay);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

// Transaction-specific retry with RPC failover
export async function withRPCFailover<T>(
  fn: (rpcUrl: string) => Promise<T>,
  config: RetryConfig = defaultRetryConfig
): Promise<T> {
  let lastError: Error | null = null;
  let currentRpc = rpcManager.getBestEndpoint();

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      const result = await fn(currentRpc);
      rpcManager.markSuccess(currentRpc);
      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      rpcManager.markFailed(currentRpc);

      // Check if error is RPC-related (should failover)
      const isRPCError = isRPCRelatedError(lastError);

      if (attempt < config.maxRetries) {
        if (isRPCError) {
          // Try next RPC immediately
          currentRpc = rpcManager.getNextEndpoint();
        } else {
          // Same RPC, but with delay
          const delay = calculateRetryDelay(attempt, config);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
  }

  throw lastError;
}

// Check if error is RPC-related
function isRPCRelatedError(error: Error): boolean {
  const rpcErrorPatterns = [
    'fetch failed',
    'network error',
    'timeout',
    'ECONNREFUSED',
    'ENOTFOUND',
    'socket hang up',
    '429', // Rate limited
    '502', // Bad gateway
    '503', // Service unavailable
    '504', // Gateway timeout
    'blockhash not found',
    'Node is behind',
    'Too many requests',
  ];

  const message = error.message.toLowerCase();
  return rpcErrorPatterns.some(pattern => message.includes(pattern.toLowerCase()));
}

// User-friendly error messages
export function getErrorMessage(error: Error): string {
  const message = error.message.toLowerCase();

  if (message.includes('insufficient funds') || message.includes('insufficient lamports')) {
    return 'Insufficient SOL balance. Please add more SOL to your wallet.';
  }
  if (message.includes('blockhash not found') || message.includes('block height exceeded')) {
    return 'Transaction expired. Please try again.';
  }
  if (message.includes('user rejected')) {
    return 'Transaction was cancelled.';
  }
  if (message.includes('timeout') || message.includes('timed out')) {
    return 'Transaction timed out. The network may be congested. Please try again.';
  }
  if (message.includes('429') || message.includes('too many requests') || message.includes('rate limit')) {
    return 'Too many requests. Please wait a moment and try again.';
  }
  if (message.includes('already been processed')) {
    return 'This transaction was already processed.';
  }
  if (message.includes('simulation failed')) {
    return 'Transaction simulation failed. You may not be eligible to mint.';
  }
  if (message.includes('not enough sol') || message.includes('0x1')) {
    return 'Not enough SOL for transaction fees. Please add more SOL.';
  }
  if (message.includes('candy machine is empty') || message.includes('no items available')) {
    return 'Sold out! No more NFTs available to mint.';
  }

  // Generic fallback
  return 'Something went wrong. Please try again.';
}

export default rpcManager;
