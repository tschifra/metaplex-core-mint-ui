import { none, publicKey, some } from "@metaplex-foundation/umi";
import { GuardSet } from "@metaplex-foundation/mpl-core-candy-machine";
import {
  coreAssetsForMint,
  eligibleCoreAssets,
  getCoreAssetRequirements,
  validateCoreAssetSelections,
} from "../utils/coreAssetSelection";
import { DasApiAssetAndAssetMintLimit } from "../utils/checkerHelper";
import { mintArgsBuilder } from "../utils/mintHelper";

const collection = publicKey("11111111111111111111111111111112");
const assetKeys = [
  publicKey("11111111111111111111111111111113"),
  publicKey("11111111111111111111111111111114"),
  publicKey("11111111111111111111111111111115"),
  publicKey("11111111111111111111111111111116"),
];

const emptyGuards = (): GuardSet => ({
  botTax: none(), solPayment: none(), tokenPayment: none(), startDate: none(),
  thirdPartySigner: none(), tokenGate: none(), gatekeeper: none(), endDate: none(),
  allowList: none(), mintLimit: none(), nftPayment: none(), redeemedAmount: none(),
  addressGate: none(), nftGate: none(), nftBurn: none(), tokenBurn: none(),
  freezeSolPayment: none(), freezeTokenPayment: none(), programGate: none(),
  allocation: none(), token2022Payment: none(), solFixedFee: none(),
  nftMintLimit: none(), edition: none(), assetPayment: none(), assetBurn: none(),
  assetMintLimit: none(), assetBurnMulti: none(), assetPaymentMulti: none(),
  assetGate: none(), vanityMint: none(),
});

const assets = assetKeys.map((key, index) => ({
  publicKey: key,
  name: `Asset ${index + 1}`,
  updateAuthority: { type: "Collection", address: collection },
})) as DasApiAssetAndAssetMintLimit[];

describe("Core asset guard selection", () => {
  it("requires the exact number of assets for every mint", () => {
    const guards = emptyGuards();
    guards.assetBurnMulti = some({ requiredCollection: collection, num: 2 });

    expect(getCoreAssetRequirements(guards)[0]?.assetsPerMint).toBe(2);
    expect(validateCoreAssetSelections(guards, assets, 2, {
      assetBurnMulti: assetKeys,
    })).toBeUndefined();
    expect(validateCoreAssetSelections(guards, assets, 2, {
      assetBurnMulti: assetKeys.slice(0, 3),
    })).toContain("Select 4");
  });

  it("rejects duplicates and wrong collections", () => {
    const guards = emptyGuards();
    guards.assetPayment = some({
      requiredCollection: collection,
      destination: assetKeys[3],
    });
    expect(validateCoreAssetSelections(guards, assets, 2, {
      assetPayment: [assetKeys[0], assetKeys[0]],
    })).toContain("only be used once");
    expect(validateCoreAssetSelections(guards, assets, 1, {
      assetPayment: [publicKey("11111111111111111111111111111117")],
    })).toContain("not owned");
  });

  it("partitions selected assets deterministically per mint", () => {
    expect(coreAssetsForMint(
      { assetBurnMulti: assetKeys },
      "assetBurnMulti",
      1,
      2
    )).toEqual(assetKeys.slice(2, 4));
    expect(eligibleCoreAssets(assets, collection)).toHaveLength(4);
  });

  it("puts the explicitly selected assets into the matching mint instructions", () => {
    const guards = emptyGuards();
    guards.assetBurnMulti = some({ requiredCollection: collection, num: 2 });
    const mintArgs = mintArgsBuilder(
      { label: "core", guards } as unknown as Parameters<typeof mintArgsBuilder>[0],
      [],
      assets,
      2,
      { assetBurnMulti: assetKeys }
    );

    const firstArgs = mintArgs[0]?.assetBurnMulti as unknown as {
      __option: "Some";
      value: { assets: typeof assetKeys };
    };
    const secondArgs = mintArgs[1]?.assetBurnMulti as unknown as {
      __option: "Some";
      value: { assets: typeof assetKeys };
    };
    expect(firstArgs.__option).toBe("Some");
    expect(firstArgs.value.assets).toEqual(assetKeys.slice(0, 2));
    expect(secondArgs.value.assets).toEqual(assetKeys.slice(2, 4));
  });
});
