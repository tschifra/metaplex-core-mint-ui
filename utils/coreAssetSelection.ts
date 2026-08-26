import {
  AssetBurn,
  AssetBurnMulti,
  AssetPayment,
  AssetPaymentMulti,
  GuardSet,
} from "@metaplex-foundation/mpl-core-candy-machine";
import { PublicKey, Some, isSome } from "@metaplex-foundation/umi";
import type { DasApiAssetAndAssetMintLimit } from "./checkerHelper";

export type DestructiveCoreGuard =
  | "assetBurn"
  | "assetBurnMulti"
  | "assetPayment"
  | "assetPaymentMulti";

export type CoreAssetSelections = Partial<
  Record<DestructiveCoreGuard, PublicKey[]>
>;

export type CoreAssetRequirement = {
  guard: DestructiveCoreGuard;
  action: "burn" | "transfer";
  requiredCollection: PublicKey;
  assetsPerMint: number;
};

const coreAssetCollection = (
  asset: DasApiAssetAndAssetMintLimit
): string => {
  const updateAuthority = asset.updateAuthority;
  if (
    updateAuthority &&
    typeof updateAuthority === "object" &&
    "address" in updateAuthority
  ) {
    return String(updateAuthority.address);
  }
  return String(updateAuthority ?? "");
};

export const coreAssetMatchesCollection = (
  asset: DasApiAssetAndAssetMintLimit,
  collection: PublicKey
): boolean => coreAssetCollection(asset) === collection.toString();

export const eligibleCoreAssets = (
  assets: DasApiAssetAndAssetMintLimit[],
  collection: PublicKey
): DasApiAssetAndAssetMintLimit[] =>
  assets.filter((asset) => coreAssetMatchesCollection(asset, collection));

export const getCoreAssetRequirements = (
  guards: GuardSet
): CoreAssetRequirement[] => {
  const requirements: CoreAssetRequirement[] = [];

  if (isSome(guards.assetBurn)) {
    const guard = guards.assetBurn as Some<AssetBurn>;
    requirements.push({
      guard: "assetBurn",
      action: "burn",
      requiredCollection: guard.value.requiredCollection,
      assetsPerMint: 1,
    });
  }
  if (isSome(guards.assetBurnMulti)) {
    const guard = guards.assetBurnMulti as Some<AssetBurnMulti>;
    requirements.push({
      guard: "assetBurnMulti",
      action: "burn",
      requiredCollection: guard.value.requiredCollection,
      assetsPerMint: Number(guard.value.num),
    });
  }
  if (isSome(guards.assetPayment)) {
    const guard = guards.assetPayment as Some<AssetPayment>;
    requirements.push({
      guard: "assetPayment",
      action: "transfer",
      requiredCollection: guard.value.requiredCollection,
      assetsPerMint: 1,
    });
  }
  if (isSome(guards.assetPaymentMulti)) {
    const guard = guards.assetPaymentMulti as Some<AssetPaymentMulti>;
    requirements.push({
      guard: "assetPaymentMulti",
      action: "transfer",
      requiredCollection: guard.value.requiredCollection,
      assetsPerMint: Number(guard.value.num),
    });
  }

  return requirements;
};

export const validateCoreAssetSelections = (
  guards: GuardSet,
  ownedAssets: DasApiAssetAndAssetMintLimit[],
  mintAmount: number,
  selections: CoreAssetSelections
): string | undefined => {
  const selectedAcrossGuards = new Set<string>();

  for (const requirement of getCoreAssetRequirements(guards)) {
    const selected = selections[requirement.guard] ?? [];
    const expected = requirement.assetsPerMint * mintAmount;
    if (selected.length !== expected) {
      return `Select ${expected} Core asset${expected === 1 ? "" : "s"} to ${requirement.action}.`;
    }

    for (const publicKey of selected) {
      const key = publicKey.toString();
      if (selectedAcrossGuards.has(key)) {
        return "Each Core asset can only be used once.";
      }
      const ownedAsset = ownedAssets.find(
        (asset) => asset.publicKey.toString() === key
      );
      if (
        !ownedAsset ||
        !coreAssetMatchesCollection(
          ownedAsset,
          requirement.requiredCollection
        )
      ) {
        return "A selected Core asset is not owned by this wallet or belongs to the wrong collection.";
      }
      selectedAcrossGuards.add(key);
    }
  }

  return undefined;
};

export const coreAssetsForMint = (
  selections: CoreAssetSelections,
  guard: DestructiveCoreGuard,
  mintIndex: number,
  assetsPerMint: number
): PublicKey[] => {
  const start = mintIndex * assetsPerMint;
  return (selections[guard] ?? []).slice(start, start + assetsPerMint);
};
