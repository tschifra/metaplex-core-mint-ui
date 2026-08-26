// Custom hook for minting state machine
// Provides structured minting flow with stage tracking

import { useState, useCallback } from 'react';

export type MintingStage =
  | 'idle'
  | 'preparing'
  | 'signing'
  | 'sending'
  | 'confirming'
  | 'fetching'
  | 'success'
  | 'error';

interface StageConfig {
  emoji: string;
  text: string;
  color: string;
  description: string;
}

const STAGE_CONFIGS: Record<MintingStage, StageConfig> = {
  idle: {
    emoji: '⏳',
    text: 'Ready',
    color: 'gray',
    description: 'Ready to mint',
  },
  preparing: {
    emoji: '🔧',
    text: 'Preparing',
    color: 'blue',
    description: 'Building transaction...',
  },
  signing: {
    emoji: '✍️',
    text: 'Sign',
    color: 'purple',
    description: 'Please sign in your wallet',
  },
  sending: {
    emoji: '📡',
    text: 'Sending',
    color: 'indigo',
    description: 'Sending to Solana network...',
  },
  confirming: {
    emoji: '⏱️',
    text: 'Confirming',
    color: 'yellow',
    description: 'Confirming on-chain...',
  },
  fetching: {
    emoji: '🎨',
    text: 'Loading',
    color: 'cyan',
    description: 'Fetching your NFT metadata...',
  },
  success: {
    emoji: '🎉',
    text: 'Success!',
    color: 'green',
    description: 'Mint successful!',
  },
  error: {
    emoji: '❌',
    text: 'Failed',
    color: 'red',
    description: 'Something went wrong',
  },
};

interface UseMintingStateReturn {
  stage: MintingStage;
  config: StageConfig;
  isMinting: boolean;
  isSuccess: boolean;
  isError: boolean;
  setStage: (stage: MintingStage) => void;
  reset: () => void;
  // Convenience methods for common transitions
  startMinting: () => void;
  setSigning: () => void;
  setSending: () => void;
  setConfirming: () => void;
  setFetching: () => void;
  setSuccess: () => void;
  setError: () => void;
}

export const useMintingState = (): UseMintingStateReturn => {
  const [stage, setStageInternal] = useState<MintingStage>('idle');

  const setStage = useCallback((newStage: MintingStage) => {
    setStageInternal(newStage);
  }, []);

  const reset = useCallback(() => {
    setStageInternal('idle');
  }, []);

  // Convenience methods
  const startMinting = useCallback(() => setStageInternal('preparing'), []);
  const setSigning = useCallback(() => setStageInternal('signing'), []);
  const setSending = useCallback(() => setStageInternal('sending'), []);
  const setConfirming = useCallback(() => setStageInternal('confirming'), []);
  const setFetching = useCallback(() => setStageInternal('fetching'), []);
  const setSuccess = useCallback(() => setStageInternal('success'), []);
  const setError = useCallback(() => setStageInternal('error'), []);

  const isMinting = !['idle', 'success', 'error'].includes(stage);
  const isSuccess = stage === 'success';
  const isError = stage === 'error';

  return {
    stage,
    config: STAGE_CONFIGS[stage],
    isMinting,
    isSuccess,
    isError,
    setStage,
    reset,
    startMinting,
    setSigning,
    setSending,
    setConfirming,
    setFetching,
    setSuccess,
    setError,
  };
};

export default useMintingState;
