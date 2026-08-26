import {
  CandyGuard,
  GuardSet,
} from "@metaplex-foundation/mpl-core-candy-machine";
import { none, publicKey, sol, some } from "@metaplex-foundation/umi";
import { buildDualPricingConfig } from "../utils/dualPricing";

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

describe("dual-pricing guard updates", () => {
  it("preserves unrelated defaults and groups", () => {
    const treasury = publicKey("11111111111111111111111111111112");
    const signer = publicKey("11111111111111111111111111111113");
    const collection = publicKey("11111111111111111111111111111114");
    const defaults = emptyGuards();
    defaults.botTax = some({ lamports: sol(0.01), lastInstruction: true });
    defaults.startDate = some({ date: BigInt(1234) });
    defaults.thirdPartySigner = some({ signerKey: signer });

    const holder = emptyGuards();
    holder.allowList = some({ merkleRoot: new Uint8Array(32) });
    const publicGuards = emptyGuards();
    publicGuards.addressGate = some({ address: treasury });
    const custom = emptyGuards();
    custom.endDate = some({ date: BigInt(5678) });

    const candyGuard = {
      guards: defaults,
      groups: [
        { label: "hold", guards: holder },
        { label: "pub", guards: publicGuards },
        { label: "custom", guards: custom },
      ],
    } as CandyGuard;

    const result = buildDualPricingConfig(
      candyGuard,
      0.3,
      0.2,
      collection,
      treasury,
      true
    );
    const updatedHolder = result.groups.find((group) => group.label === "hold")!;
    const updatedPublic = result.groups.find((group) => group.label === "pub")!;
    const updatedCustom = result.groups.find((group) => group.label === "custom")!;

    expect(result.guards.botTax).toEqual(defaults.botTax);
    expect(result.guards.startDate).toEqual(defaults.startDate);
    expect(result.guards.thirdPartySigner).toEqual(defaults.thirdPartySigner);
    expect(updatedHolder.guards.allowList).toEqual(holder.allowList);
    expect(updatedHolder.guards.thirdPartySigner).toEqual(defaults.thirdPartySigner);
    expect(updatedHolder.guards.assetGate.__option).toBe("Some");
    expect(updatedHolder.guards.tokenGate.__option).toBe("None");
    expect(updatedPublic.guards.addressGate).toEqual(publicGuards.addressGate);
    expect(updatedPublic.guards.assetGate.__option).toBe("None");
    expect(updatedCustom.guards.endDate).toEqual(custom.endDate);
  });
});
