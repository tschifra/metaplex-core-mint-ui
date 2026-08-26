import { allowLists } from "@/allowlist";
import {
  CandyGuard,
  CandyMachine,
  GuardGroup,
  DefaultGuardSet,
  DefaultGuardSetMintArgs,
  getMerkleRoot,
  route,
  getMerkleProof,
  safeFetchAllowListProofFromSeeds,
  mintV1,
} from "@metaplex-foundation/mpl-core-candy-machine";
import {
  TokenStandard,
} from "@metaplex-foundation/mpl-token-metadata";
import {
  some,
  Umi,
  transactionBuilder,
  publicKey,
  none,
  AddressLookupTableInput,
  Transaction,
  Signer,
  createNoopSigner,
  sol,
} from "@metaplex-foundation/umi";
import {
  DasApiAssetAndAssetMintLimit,
  DigitalAssetWithTokenAndNftMintLimit,
  GuardReturn,
} from "./checkerHelper";
import { Connection } from "@solana/web3.js";
import {
  setComputeUnitPrice,
  setComputeUnitLimit,
  transferSol,
} from "@metaplex-foundation/mpl-toolbox";
import { toWeb3JsTransaction } from "@metaplex-foundation/umi-web3js-adapters";
import {
  DEVELOPER_FEE_RECIPIENT,
  DEVELOPER_FEE_SOL,
} from "./developerFee";
import {
  CoreAssetSelections,
  coreAssetsForMint,
  coreAssetMatchesCollection,
  validateCoreAssetSelections,
} from "./coreAssetSelection";
import { getMintableGuardGroup } from "./guardResolution";
import { parsePriorityFeeMicroLamports } from "./mintUiConfig";

export interface GuardButtonList extends GuardReturn {
  header: string;
  mintText: string;
  buttonLabel: string;
  startTime: bigint;
  endTime: bigint;
  tooltip?: string;
  mintPrice: number;
}

export const chooseGuardToUse = (
  guard: GuardReturn,
  candyGuard: CandyGuard
) => {
  return getMintableGuardGroup(candyGuard, guard.label) ?? {
    label: guard.label,
    guards: undefined,
  };
};

export const mintArgsBuilder = (
  guardToUse: GuardGroup<DefaultGuardSet>,
  ownedTokens: DigitalAssetWithTokenAndNftMintLimit[],
  ownedCoreAssets: DasApiAssetAndAssetMintLimit[],
  amount: number,
  coreAssetSelections: CoreAssetSelections = {}
) => {
  const guards = guardToUse.guards;
  const selectionError = validateCoreAssetSelections(
    guards,
    ownedCoreAssets,
    amount,
    coreAssetSelections
  );
  if (selectionError) {
    throw new Error(selectionError);
  }
  const mintArgsArray: Partial<DefaultGuardSetMintArgs>[] = [];
  const consumedLegacyAssets = new Set<string>();
  for (let i = 0; i < amount; i++) {
    const ruleset = undefined;

    const mintArgs: Partial<DefaultGuardSetMintArgs> = {};
    if (guards.allocation.__option === "Some") {
      mintArgs.allocation = some({ id: guards.allocation.value.id });
    }

    if (guards.allowList.__option === "Some") {
      const allowlist = allowLists.get(guardToUse.label);
      if (allowlist) {
        mintArgs.allowList = some({ merkleRoot: getMerkleRoot(allowlist) });
      }
    }

    if (guards.assetBurn.__option === "Some") {
      const requiredCollection = guards.assetBurn.value.requiredCollection;
      const [asset] = coreAssetsForMint(
        coreAssetSelections,
        "assetBurn",
        i,
        1
      );
      mintArgs.assetBurn = some({ asset, requiredCollection });
    }

    if (guards.assetBurnMulti.__option === "Some") {
      const requiredCollection = guards.assetBurnMulti.value.requiredCollection;
      const assets = coreAssetsForMint(
        coreAssetSelections,
        "assetBurnMulti",
        i,
        Number(guards.assetBurnMulti.value.num)
      );
      mintArgs.assetBurnMulti = some({ assets, requiredCollection });
    }

    if (guards.assetPayment.__option === "Some") {
      const requiredCollection = guards.assetPayment.value.requiredCollection;
      const [asset] = coreAssetsForMint(
        coreAssetSelections,
        "assetPayment",
        i,
        1
      );
      mintArgs.assetPayment = some({
        asset,
        requiredCollection,
        destination: guards.assetPayment.value.destination
      });
    }

    if (guards.assetPaymentMulti.__option === "Some") {
      const requiredCollection = guards.assetPaymentMulti.value.requiredCollection;
      const assets = coreAssetsForMint(
        coreAssetSelections,
        "assetPaymentMulti",
        i,
        Number(guards.assetPaymentMulti.value.num)
      );
      mintArgs.assetPaymentMulti = some({
        assets,
        requiredCollection,
        destination: guards.assetPaymentMulti.value.destination
      });
    }

    if (guards.assetMintLimit.__option === "Some") {
      const requiredCollection = guards.assetMintLimit.value.requiredCollection;
      const asset = ownedCoreAssets.find(
        (candidate) =>
          coreAssetMatchesCollection(candidate, requiredCollection) &&
          (candidate.assetMintLimit ?? 0) > 0
      );
      if (asset && asset.assetMintLimit) {
        asset.assetMintLimit -= 1;

        mintArgs.assetMintLimit = some({
          id: guards.assetMintLimit.value.id,
          asset: asset.publicKey,
        });
      }
    }

    if (guards.freezeSolPayment.__option === "Some") {
      mintArgs.freezeSolPayment = some({
        destination: guards.freezeSolPayment.value.destination,
      });
    }

    if (guards.freezeTokenPayment.__option === "Some") {
      mintArgs.freezeTokenPayment = some({
        destinationAta: guards.freezeTokenPayment.value.destinationAta,
        mint: guards.freezeTokenPayment.value.mint,
        nftRuleSet: ruleset,
      });
    }

    if (guards.gatekeeper.__option === "Some") {
      mintArgs.gatekeeper = some({
        expireOnUse: guards.gatekeeper.value.expireOnUse,
        gatekeeperNetwork: guards.gatekeeper.value.gatekeeperNetwork,
      });
    }

    if (guards.mintLimit.__option === "Some") {
      mintArgs.mintLimit = some({ id: guards.mintLimit.value.id });
    }

    if (guards.nftBurn.__option === "Some") {
      const requiredCollection = guards.nftBurn.value.requiredCollection;
      const nft = ownedTokens.find(
        (el) =>
          el.metadata.collection.__option === "Some" &&
          el.metadata.collection.value.key === requiredCollection &&
          !consumedLegacyAssets.has(el.publicKey.toString())
      );
      if (nft) {
        consumedLegacyAssets.add(nft.publicKey.toString());
        let tokenStandard = TokenStandard.NonFungible;
        let ruleSet = undefined;
        if (nft.metadata.tokenStandard.__option === "Some") {
          if (
            nft.metadata.tokenStandard.value ===
            TokenStandard.ProgrammableNonFungible
          ) {
            tokenStandard = TokenStandard.ProgrammableNonFungible;
            if (
              nft.metadata.programmableConfig.__option === "Some" &&
              nft.metadata.programmableConfig.value.ruleSet.__option === "Some"
            ) {
              ruleSet = nft.metadata.programmableConfig.value.ruleSet.value;
            }
          }
        }
        mintArgs.nftBurn = some({
          mint: nft.publicKey,
          requiredCollection,
          tokenStandard,
          ruleSet,
        });
      }
    }

    if (guards.nftGate.__option === "Some") {
      const requiredCollection = guards.nftGate.value.requiredCollection;

      // First check legacy NFTs (Token Metadata)
      const legacyNft = ownedTokens.find(
        (el) =>
          el.metadata.collection.__option === "Some" &&
          el.metadata.collection.value.key === requiredCollection
      );

      if (legacyNft) {
        let tokenStandard = TokenStandard.NonFungible;
        let ruleSet = undefined;
        if (legacyNft.metadata.tokenStandard.__option === "Some") {
          if (
            legacyNft.metadata.tokenStandard.value ===
            TokenStandard.ProgrammableNonFungible
          ) {
            tokenStandard = TokenStandard.ProgrammableNonFungible;
            if (
              legacyNft.metadata.programmableConfig.__option === "Some" &&
              legacyNft.metadata.programmableConfig.value.ruleSet.__option === "Some"
            ) {
              ruleSet = legacyNft.metadata.programmableConfig.value.ruleSet.value;
            }
          }
        }
        mintArgs.nftGate = some({
          mint: legacyNft.publicKey,
          requiredCollection,
          tokenStandard,
          ruleSet,
        });
      }
    }

    if (guards.nftMintLimit.__option === "Some") {
      const requiredCollection = guards.nftMintLimit.value.requiredCollection;
      const nft = ownedTokens.find(
        (el) =>
          el.metadata.collection.__option === "Some" &&
          el.metadata.collection.value.key === requiredCollection &&
          el.nftMintLimit! > 0
      );
      if (nft && nft.nftMintLimit) {
        nft.nftMintLimit = nft.nftMintLimit - 1;

        let tokenStandard = TokenStandard.NonFungible;
        let ruleSet = undefined;
        if (nft.metadata.tokenStandard.__option === "Some") {
          if (
            nft.metadata.tokenStandard.value ===
            TokenStandard.ProgrammableNonFungible
          ) {
            tokenStandard = TokenStandard.ProgrammableNonFungible;
            if (
              nft.metadata.programmableConfig.__option === "Some" &&
              nft.metadata.programmableConfig.value.ruleSet.__option === "Some"
            ) {
              ruleSet = nft.metadata.programmableConfig.value.ruleSet.value;
            }
          }
        }

        mintArgs.nftMintLimit = some({
          id: guards.nftMintLimit.value.id,
          mint: nft.publicKey,
          requiredCollection,
          tokenStandard,
          ruleSet,
        });
      }
    }

    if (guards.nftPayment.__option === "Some") {
      const requiredCollection = guards.nftPayment.value.requiredCollection;
      const nft = ownedTokens.find(
        (el) =>
          el.metadata.collection.__option === "Some" &&
          el.metadata.collection.value.key === requiredCollection &&
          !consumedLegacyAssets.has(el.publicKey.toString())
      );
      if (nft) {
        consumedLegacyAssets.add(nft.publicKey.toString());
        let tokenStandard = TokenStandard.NonFungible;
        let ruleSet = undefined;
        if (nft.metadata.tokenStandard.__option === "Some") {
          if (
            nft.metadata.tokenStandard.value ===
            TokenStandard.ProgrammableNonFungible
          ) {
            tokenStandard = TokenStandard.ProgrammableNonFungible;
            if (
              nft.metadata.programmableConfig.__option === "Some" &&
              nft.metadata.programmableConfig.value.ruleSet.__option === "Some"
            ) {
              ruleSet = nft.metadata.programmableConfig.value.ruleSet.value;
            }
          }
        }
        mintArgs.nftPayment = some({
          destination: guards.nftPayment.value.destination,
          mint: nft.publicKey,
          requiredCollection,
          tokenStandard,
          ruleSet,
        });
      }
    }

    if (guards.solFixedFee.__option === "Some") {
      mintArgs.solFixedFee = some({
        destination: guards.solFixedFee.value.destination,
      });
    }

    if (guards.solPayment.__option === "Some") {
      const destination = guards.solPayment.value.destination;
      mintArgs.solPayment = some({
        destination,
      });
    }

    if (guards.thirdPartySigner.__option === "Some") {
      mintArgs.thirdPartySigner = some({
        signer: createNoopSigner(guards.thirdPartySigner.value.signerKey),
      });
    }

    if (guards.token2022Payment.__option === "Some") {
      mintArgs.token2022Payment = some({
        destinationAta: guards.token2022Payment.value.destinationAta,
        mint: guards.token2022Payment.value.mint,
      });
    }

    if (guards.tokenBurn.__option === "Some") {
      mintArgs.tokenBurn = some({ mint: guards.tokenBurn.value.mint });
    }

    if (guards.tokenGate.__option === "Some") {
      mintArgs.tokenGate = some({ mint: guards.tokenGate.value.mint });
    }

    // AssetGate - for Metaplex Core NFT collections
    if (guards.assetGate.__option === "Some") {
      const requiredCollection = guards.assetGate.value.requiredCollection;
      const coreAsset = ownedCoreAssets.find((asset) =>
        coreAssetMatchesCollection(asset, requiredCollection)
      );
      if (coreAsset) {
        mintArgs.assetGate = some({
          asset: coreAsset.publicKey,
          requiredCollection,
        });
      }
    }

    if (guards.tokenPayment.__option === "Some") {
      mintArgs.tokenPayment = some({
        destinationAta: guards.tokenPayment.value.destinationAta,
        mint: guards.tokenPayment.value.mint,
      });
    }
    mintArgsArray.push(mintArgs);
  }
  return mintArgsArray;
};

// build route instruction for allowlist guard
export const routeBuilder = async (
  umi: Umi,
  guardToUse: GuardGroup<DefaultGuardSet>,
  candyMachine: CandyMachine
) => {
  let tx2 = transactionBuilder();

  if (guardToUse.guards.allowList.__option === "Some") {
    const allowlist = allowLists.get(guardToUse.label);
    if (!allowlist) {
      return undefined;
    }
    const allowListProof = await safeFetchAllowListProofFromSeeds(umi, {
      candyGuard: candyMachine.mintAuthority,
      candyMachine: candyMachine.publicKey,
      merkleRoot: getMerkleRoot(allowlist),
      user: publicKey(umi.identity),
    });
    if (allowListProof === null) {
      tx2 = tx2.add(
        route(umi, {
          guard: "allowList",
          candyMachine: candyMachine.publicKey,
          candyGuard: candyMachine.mintAuthority,
          group:
            guardToUse.label === "default" ? none() : some(guardToUse.label),
          routeArgs: {
            path: "proof",
            merkleRoot: getMerkleRoot(allowlist),
            merkleProof: getMerkleProof(allowlist, umi.identity.publicKey),
          },
        })
      );
    }
    return allowListProof === null ? tx2 : undefined;
  }
  return undefined;
};

export const buildTxs = async (
  umi: Umi,
  candyMachine: CandyMachine,
  candyGuard: CandyGuard,
  nftMints: Signer[],
  guardToUse:
    | GuardGroup<DefaultGuardSet>
    | {
        label: string;
        guards: undefined;
      },
  mintArgsArray: Partial<DefaultGuardSetMintArgs>[] | undefined,
  luts: AddressLookupTableInput[],
  latestBlockhash: string,
  buyBeer: boolean
) => {
  const transactions: { transaction: Transaction; signers: Signer[] }[] = [];

  for (let i = 0; i < nftMints.length; i++) {
    // Build fresh transactions with the server-approved maximum. The backend
    // simulates the exact fully signed transaction before broadcasting it, so a
    // separate unsigned client simulation only adds latency and RPC load.
    const microLamports = parsePriorityFeeMicroLamports();
    let builder = transactionBuilder()
      .prepend(setComputeUnitPrice(umi, { microLamports }))
      .prepend(setComputeUnitLimit(umi, { units: 1400000 }))
      .setBlockhash(latestBlockhash);

    // Do not add a Memo instruction here. Candy Guard's
    // botTax.lastInstruction=true validates a fixed program allowlist that does
    // not include the Memo program and would tax the buyer instead of minting.
    // Add the optional project-support transfer once per mint transaction.
    if (buyBeer) {
      builder = builder.add(
        transferSol(umi, {
          destination: publicKey(DEVELOPER_FEE_RECIPIENT),
          amount: sol(DEVELOPER_FEE_SOL),
        })
      );
    }

    // Note: SOL payment is handled automatically by the candy machine's solPayment guard
    // The guard's destination must be correctly configured on-chain via the admin UI

    let mintArgs = undefined;
    if (mintArgsArray) {
      mintArgs = mintArgsArray[i];
    }

    // Add the mint instruction
    builder = builder.add(
      mintV1(umi, {
        candyMachine: candyMachine.publicKey,
        collection: candyMachine.collectionMint,
        asset: nftMints[i],
        group: guardToUse.label === "default" ? none() : some(guardToUse.label),
        candyGuard: candyGuard.publicKey,
        mintArgs,
      })
    );

    // Set lookup tables and keep the server-approved upper compute limit for
    // guard compatibility. The server independently caps the requested limit
    // and micro-lamport price before it signs.
    builder = builder.setAddressLookupTables(luts);
    const builtTx = builder.build(umi);

    transactions.push({
      transaction: builtTx,
      signers: builder.getSigners(umi),
    });
  }

  return transactions;
};

// simulate CU based on Sammys gist https://gist.github.com/stegaBOB/7c0cdc916db4524dd9c285f9e4309475
export const getRequiredCU = async (umi: Umi, transaction: Transaction) => {
  const defaultCU = 800_000;
  try {
    const web3tx = toWeb3JsTransaction(transaction);
    const connection = new Connection(umi.rpc.getEndpoint(), "finalized");
    const simulatedTx = await connection.simulateTransaction(web3tx, {
      replaceRecentBlockhash: true,
      sigVerify: false,
    });
    if (simulatedTx.value.err) {
      return defaultCU;
    }
    if (!simulatedTx.value.unitsConsumed) {
      return defaultCU;
    }
    return simulatedTx.value.unitsConsumed + 20_000;
  } catch (e) {
    return defaultCU;
  }
};
