// Custom hook for NFT counter logic
// Extracts counter calculations from main component

import { useMemo } from 'react';
import { CandyMachine } from '@metaplex-foundation/mpl-core-candy-machine';

interface NFTCounterState {
  available: number;
  total: number;
  minted: number;
  progress: number;
  isSoldOut: boolean;
  isLowStock: boolean; // Less than 10% remaining
}

export const useNFTCounter = (candyMachine: CandyMachine | undefined): NFTCounterState => {
  return useMemo(() => {
    if (!candyMachine) {
      return {
        available: 0,
        total: 0,
        minted: 0,
        progress: 0,
        isSoldOut: true,
        isLowStock: false,
      };
    }

    const total = Number(candyMachine.data.itemsAvailable);
    const minted = Number(candyMachine.itemsRedeemed);
    const available = total - minted;
    const progress = total > 0 ? (minted / total) * 100 : 0;
    const isSoldOut = available === 0;
    const isLowStock = !isSoldOut && available <= Math.ceil(total * 0.1);

    return {
      available,
      total,
      minted,
      progress,
      isSoldOut,
      isLowStock,
    };
  }, [candyMachine]);
};

export default useNFTCounter;
