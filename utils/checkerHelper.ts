import {
  Allocation,
  AssetMintLimit,
  CandyMachine,
  GuardSet,
  MintLimit,
  NftMintLimit,
  fetchAssetMintCounter,
  fetchNftMintCounter,
  findAssetMintCounterPda,
  findNftMintCounterPda,
  safeFetchAllocationTrackerFromSeeds,
  safeFetchMintCounterFromSeeds,
} from "@metaplex-foundation/mpl-core-candy-machine";
import {
  fetchToken,
  findAssociatedTokenPda,
} from "@metaplex-foundation/mpl-toolbox";
import {
  Pda,
  PublicKey,
  SolAmount,
  Some,
  Umi,
  isSome,
  publicKey,
} from "@metaplex-foundation/umi";
import { parseMaxMintAmount } from "./mintUiConfig";
import { DigitalAssetWithToken } from "@metaplex-foundation/mpl-token-metadata";
import { createToaster } from "@chakra-ui/react";

const toaster = createToaster({ placement: "top" });
import { DasExtra } from "@metaplex-foundation/mpl-core-das/dist/src/types";
import { AssetV1 } from "@metaplex-foundation/mpl-core";
import { coreAssetMatchesCollection } from "./coreAssetSelection";

export interface GuardReturn {
  label: string;
  allowed: boolean;
  minting?: boolean;
  loadingText?: string;
  reason?: string;
  maxAmount: number;
  mintAmount?: number;
}
export type DigitalAssetWithTokenAndNftMintLimit = DigitalAssetWithToken & {
  nftMintLimit?: number;
  nftMintLimitPda?: Pda;
};

export type DasApiAssetAndAssetMintLimit = AssetV1 & DasExtra & {
  assetMintLimit?: number;
  assetMintLimitPda?: Pda;
}

export const addressGateChecker = (wallet: PublicKey, address: PublicKey) => {
  if (wallet != address) {
    return false;
  }
  return true;
};

export const allocationChecker = async (
  umi: Umi,
  candyMachine: CandyMachine,
  guard: {
    label: string;
    guards: GuardSet;
  }
) => {
  const allocation = guard.guards.allocation as Some<Allocation>;

  try {
    const mintCounter = await safeFetchAllocationTrackerFromSeeds(umi, {
      id: allocation.value.id,
      candyMachine: candyMachine.publicKey,
      candyGuard: candyMachine.mintAuthority,
    });

    if (mintCounter) {
      return allocation.value.limit - mintCounter.count;
    } else {
      // no allocation mint Counter found - not created yet
      toaster.create({
        title: "Allocation Guard not Initialized!",
        description: "Minting will fail!",
        type: "error",
        duration: 900,
      });
      return allocation.value.limit;
    }
  } catch (error) {
    // Allocation check failed
    return 0;
  }
};

export const solBalanceChecker = (
  solBalance: SolAmount,
  solAmount: SolAmount
) => {
  if (solAmount > solBalance) {
    return false;
  }
  return true;
};

export const tokenBalanceChecker = async (
  umi: Umi,
  tokenAmount: bigint,
  tokenMint: PublicKey,
  tokenProgramId?: PublicKey
): Promise<bigint> => {
  try {
    const ata = findAssociatedTokenPda(umi, {
      mint: tokenMint,
      owner: umi.identity.publicKey,
      tokenProgramId,
    });

    const tokenAccount = await fetchToken(umi, ata);
    return tokenAccount.amount;
  } catch {
    // Token account doesn't exist or error fetching
    return BigInt(0);
  }
};

export const mintLimitChecker = async (
  umi: Umi,
  candyMachine: CandyMachine,
  guard: {
    label: string;
    guards: GuardSet;
  }
) => {
  const mintLimit = guard.guards.mintLimit as Some<MintLimit>;

  //not minted yet
  try {
    const mintCounter = await safeFetchMintCounterFromSeeds(umi, {
      id: mintLimit.value.id,
      user: umi.identity.publicKey,
      candyMachine: candyMachine.publicKey,
      candyGuard: candyMachine.mintAuthority,
    });

    if (mintCounter) {
      return mintLimit.value.limit - mintCounter.count;
    } else {
      // no mintlimit counter found. Possibly the first mint
      return mintLimit.value.limit;
    }
  } catch (error) {
    // Mint limit check failed
    return 0;
  }
};

export const nftMintLimitChecker = async (
  umi: Umi,
  candyMachine: CandyMachine,
  guard: {
    label: string;
    guards: GuardSet;
  },
  ownedNfts: DigitalAssetWithTokenAndNftMintLimit[]
) => {
  const nftMintLimit = guard.guards.nftMintLimit as Some<NftMintLimit>;

  const collectionAssets = ownedNfts.filter(
    (el) =>
      el.metadata.collection.__option === "Some" &&
      el.metadata.collection.value.key ===
        nftMintLimit.value.requiredCollection &&
      el.metadata.collection.value.verified === true
  );
  try {
    const counterPromises = collectionAssets.map((asset) => {
      const pda = findNftMintCounterPda(umi, {
        id: nftMintLimit.value.id,
        mint: asset.publicKey,
        candyGuard: candyMachine.mintAuthority,
        candyMachine: candyMachine.publicKey,
      });

      return fetchNftMintCounter(umi, pda)
        .then((counterValue) => ({
          ...asset,
          nftMintLimit: Math.max(0, nftMintLimit.value.limit - counterValue.count),
          nftMintLimitPda: pda,
        }))
        .catch(() => ({
          ...asset,
          nftMintLimit: nftMintLimit.value.limit,
        }));
    });

    let filteredResults: DigitalAssetWithTokenAndNftMintLimit[] = [];
    await Promise.all(counterPromises)
      .then((results) => {
        filteredResults = results.filter(
          (item) =>
            item.nftMintLimit !== undefined &&
            item.nftMintLimit > 0
        );
      })
      .catch(() => {
        // Error fetching counters
      });

      const resultObject = {
        nftMintLimitAssets: filteredResults,
        ownedNfts: ownedNfts.map((asset) => {
          const matchingAsset = filteredResults.find((result) => result.publicKey === asset.publicKey);
          if (matchingAsset) {
            return {
              ...asset,
              nftMintLimit: matchingAsset.nftMintLimit,
              nftMintLimitPda: matchingAsset.nftMintLimitPda,
            };
          } else {
            // If no matching asset found in filteredResults, retain original asset data
            return {
              ...asset,
              nftMintLimit: 0, // or any default value you prefer
              nftMintLimitPda: undefined, // or any default value you prefer
            };
          }
        }),
      };
    return resultObject;
  } catch (error) {
    // Mint limit check failed
    return {
      nftMintLimitAssets: [],
      ownedNfts,
    };
  }
};

export const assetMintLimitChecker = async (
  umi: Umi,
  candyMachine: CandyMachine,
  guard: {
    label: string;
    guards: GuardSet;
  },
  ownedCoreAssets: DasApiAssetAndAssetMintLimit[]
) => {
  const assetMintLimit = guard.guards.assetMintLimit as Some<AssetMintLimit>;

  const collectionAssets = ownedCoreAssets.filter((asset) =>
    coreAssetMatchesCollection(asset, assetMintLimit.value.requiredCollection)
  );
  try {
    const counterPromises = collectionAssets.map((asset) => {
      const pda = findAssetMintCounterPda(umi, {
        id: assetMintLimit.value.id,
        asset: asset.publicKey,
        candyGuard: candyMachine.mintAuthority,
        candyMachine: candyMachine.publicKey,
      });

      return fetchAssetMintCounter(umi, pda)
        .then((counterValue) => ({
          ...asset,
          assetMintLimit: Math.max(0, assetMintLimit.value.limit - counterValue.count),
          assetMintLimitPda: pda,
        }))
        .catch(() => ({
          ...asset,
          assetMintLimit: assetMintLimit.value.limit,
        }));
    });

    let filteredResults: DasApiAssetAndAssetMintLimit[] = [];
    await Promise.all(counterPromises)
      .then((results) => {
        filteredResults = results.filter(
          (item) =>
            item.assetMintLimit !== undefined &&
            item.assetMintLimit > 0
        );
      })
      .catch(() => {
        // Error fetching counters
      });

      const resultObject = {
        assetMintLimitAssets: filteredResults,
        ownedCoreAssets: ownedCoreAssets.map((asset) => {
          const matchingAsset = filteredResults.find((result) => result.publicKey === asset.publicKey);
          if (matchingAsset) {
            return {
              ...asset,
              assetMintLimit: matchingAsset.assetMintLimit,
              assetMintLimitPda: matchingAsset.assetMintLimitPda,
            };
          } else {
            // If no matching asset found in filteredResults, retain original asset data
            return {
              ...asset,
              assetMintLimit: 0, // or any default value you prefer
              assetMintLimitPda: undefined, // or any default value you prefer
            };
          }
        }),
      };
    return resultObject;
  } catch (error) {
    // Asset limit check failed
    return {
      assetMintLimitAssets: [],
      ownedCoreAssets,
    };
  }
};

export const ownedNftChecker = async (
  ownedNfts: DigitalAssetWithToken[],
  requiredCollection: PublicKey
) => {
  const count = ownedNfts.filter(
    (el) =>
      el.metadata.collection.__option === "Some" &&
      el.metadata.collection.value.key === requiredCollection &&
      el.metadata.collection.value.verified === true
  ).length;
  return count;
};

export const ownedCoreAssetChecker = async (
  ownedNfts: DasApiAssetAndAssetMintLimit[],
  requiredCollection: PublicKey
) => {
  const count = ownedNfts.filter((asset) =>
    coreAssetMatchesCollection(asset, requiredCollection)
  ).length;
  return count;
};

export const allowlistChecker = (
  allowLists: Map<string, string[]>,
  umi: Umi,
  guardlabel: string
) => {
  if (!allowLists.has(guardlabel)) {
    // Allowlist missing from allowlist.tsx
    return false;
  }
  if (
    !allowLists.get(guardlabel)?.includes(publicKey(umi.identity.publicKey))
  ) {
    return false;
  }
  return true;
};

export const getSolanaTime = async (umi: Umi) => {
  const slot = await umi.rpc.getSlot();

  let solanaTime = await umi.rpc.getBlockTime(slot);

  if (!solanaTime) solanaTime = BigInt(0);
  return solanaTime;
};

export const checkDateRequired = (
  guards: { label: string; guards: GuardSet }[]
) => {
  for (const guard of guards) {
    if (isSome(guard.guards.startDate) || isSome(guard.guards.endDate)) {
      return true;
    }
  }

  return false;
};

export const checkSolBalanceRequired = (
  guards: { label: string; guards: GuardSet }[]
) => {
  let solBalanceRequired: boolean = false;
  guards.forEach((guard) => {
    if (
      isSome(guard.guards.freezeSolPayment) ||
      isSome(guard.guards.solPayment) ||
      isSome(guard.guards.solFixedFee)
    ) {
      solBalanceRequired = true;
    }
  });

  return solBalanceRequired;
};

export const checkNftsRequired = (
  guards: { label: string; guards: GuardSet }[]
) => {
  let nftAccountsRequired = false;
  guards.forEach((guard) => {
    if (
      isSome(guard.guards.nftBurn) ||
      isSome(guard.guards.nftGate) ||
      isSome(guard.guards.nftPayment) ||
      isSome(guard.guards.nftMintLimit)
    ) {
      nftAccountsRequired = true;
    }
  });

  return nftAccountsRequired;
};

export const checkCoreAssetsRequired = (
  guards: { label: string; guards: GuardSet }[]
) => {
  let coreAssetBalanceRequired: boolean = false;
  guards.forEach((guard) => {
    if (
      isSome(guard.guards.assetBurn) ||
      isSome(guard.guards.assetBurnMulti) ||
      isSome(guard.guards.assetPayment) ||
      isSome(guard.guards.assetPaymentMulti) ||
      isSome(guard.guards.assetMintLimit) ||
      isSome(guard.guards.assetGate)
    ) {
      coreAssetBalanceRequired = true;
    }
  });

  return coreAssetBalanceRequired;
};

export const calculateMintable = (
  mintableAmount: number,
  newAmount: number
) => {
  const available = Number.isFinite(mintableAmount) ? Math.max(0, Math.floor(mintableAmount)) : 0;
  const constrained = Number.isFinite(newAmount) ? Math.max(0, Math.floor(newAmount)) : 0;
  return Math.min(available, constrained, parseMaxMintAmount());
};

export const remainingBeforeRedeemedLimit = (
  maximum: bigint,
  itemsRedeemed: bigint
): number => {
  if (itemsRedeemed >= maximum) return 0;
  return Number(maximum - itemsRedeemed);
};
