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
