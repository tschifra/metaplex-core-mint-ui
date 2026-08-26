import { CandyGuard, CandyMachine } from "@metaplex-foundation/mpl-core-candy-machine";
import { DasApiAssetAndAssetMintLimit, GuardReturn } from "../utils/checkerHelper";
import {
  AddressLookupTableInput,
  KeypairSigner,
  PublicKey,
  Signer,
  SolAmount,
  Transaction,
  Umi,
  createBigInt,
  generateSigner,
  publicKey,
} from "@metaplex-foundation/umi";
import {
  DigitalAssetWithToken,
  JsonMetadata,
  fetchJsonMetadata,
} from "@metaplex-foundation/mpl-token-metadata";
import { getMintText } from "../settings";
import {
  Box,
  Heading,
  Text,
  VStack,
  HStack,
  Button,
} from "@chakra-ui/react";

// Modern UI Components
import { PremiumMintButton, CountdownTimer } from "./ui";
import { fetchAddressLookupTable } from "@metaplex-foundation/mpl-toolbox";

import { Dispatch, SetStateAction, useState } from "react";
import {
  chooseGuardToUse,
  routeBuilder,
  mintArgsBuilder,
  GuardButtonList,
  buildTxs,
} from "../utils/mintHelper";
import { useSolanaTime } from "@/utils/SolanaTimeContext";
import { verifyTx } from "@/utils/verifyTx";
import { base58 } from "@metaplex-foundation/umi/serializers";
import { AssetV1, fetchAssetV1 } from "@metaplex-foundation/mpl-core";
import { das } from "@metaplex-foundation/mpl-core-das";
import { getErrorMessage } from "../utils/rpcManager";
import { useWallet } from "@solana/wallet-adapter-react";
import { toWeb3JsTransaction, toWeb3JsKeypair } from "@metaplex-foundation/umi-web3js-adapters";
import { Connection, VersionedTransaction } from "@solana/web3.js";
import type { WalletContextState } from "@solana/wallet-adapter-react";
import { getActiveRpc } from "../utils/configManager";
import {
  getDeveloperFeeLamports,
  getDeveloperFeeSol,
  isDeveloperFeeEnabled,
} from "../utils/developerFee";
import {
  CoreAssetSelections,
  DestructiveCoreGuard,
  eligibleCoreAssets,
  getCoreAssetRequirements,
  validateCoreAssetSelections,
} from "../utils/coreAssetSelection";
import {
  parseGuardSelectionMode,
  parseMaxMintAmount,
  parseMintProgressDurationMs,
  parseMultimintEnabled,
} from "../utils/mintUiConfig";
import { getMintableGuardGroup } from "../utils/guardResolution";
import { toaster } from "../utils/toaster";

const solAmountToSol = (amount: SolAmount | bigint): number =>
  Number(typeof amount === "bigint" ? amount : amount.basisPoints) / 1e9;

const updateLoadingText = (
  loadingText: string | undefined,
  guardList: GuardReturn[],
  label: string,
  setGuardList: Dispatch<SetStateAction<GuardReturn[]>>
) => {
  const guardIndex = guardList.findIndex((g) => g.label === label);
  if (guardIndex === -1) {
    return;
  }
  const newGuardList = [...guardList];
  newGuardList[guardIndex].loadingText = loadingText;
  setGuardList(newGuardList);
};

const fetchNft = async (umi: Umi, nftAdress: PublicKey) => {
  let digitalAsset: AssetV1 | undefined;
  let jsonMetadata: JsonMetadata | undefined;

  try {
    // Step 1: Always fetch the on-chain Core Asset first — this gives us the Arweave URI.
    // On-chain data is available immediately after transaction confirmation.
    let assetRetries = 3;
    while (assetRetries > 0 && !digitalAsset) {
      try {
        digitalAsset = await fetchAssetV1(umi, nftAdress);
      } catch {
        assetRetries--;
        if (assetRetries > 0) {
          await new Promise(resolve => setTimeout(resolve, 600));
        }
      }
    }

    // Step 2: Fetch the full off-chain JSON directly from Arweave.
    // This is the SOURCE OF TRUTH — it always has animation_url, all attributes, etc.
    // Unlike DAS, Arweave data was uploaded BEFORE minting so it's always available.
    if (digitalAsset?.uri) {
      let uriRetries = 3;
      while (uriRetries > 0 && !jsonMetadata) {
        try {
          jsonMetadata = await fetchJsonMetadata(umi, digitalAsset.uri);
          break;
        } catch {
          uriRetries--;
          if (uriRetries > 0) {
            await new Promise(resolve => setTimeout(resolve, 600));
          }
        }
      }
    }

    // Step 3: If Arweave fetch failed, try DAS API as fallback.
    // DAS might have partial data but it's better than nothing.
    if (!jsonMetadata) {
      try {
        const dasAsset = await das.getAsset(umi, nftAdress);

        if (dasAsset.content?.metadata) {
          const metadata = dasAsset.content.metadata;
          const files = dasAsset.content.files;
          const links = dasAsset.content.links as unknown as {
            image?: string;
            animation_url?: string;
            external_url?: string;
          } | undefined;

          // Get animation_url from links first, then check files for video
          let animationUrl = links?.animation_url;
          if (!animationUrl && files) {
            const videoFile = files.find((f) =>
              f.mime === 'video/mp4' || f.uri?.match(/\.(mp4|webm|mov)(\?|$)/i)
            );
            if (videoFile?.uri) {
              animationUrl = videoFile.uri;
            }
          }

          jsonMetadata = {
            name: metadata.name || "",
            symbol: metadata.symbol || "",
            description: metadata.description || "",
            image: links?.image || files?.[0]?.uri || "",
            animation_url: animationUrl,
            external_url: links?.external_url,
            attributes: metadata.attributes?.map((attr) => ({
              trait_type: attr.trait_type,
              value: attr.value
            })) || [],
          };
        }
      } catch {
        // DAS also failed — we have no metadata
      }
    }

  } catch (e) {
    toaster.create({
      title: "NFT could not be fetched!",
      description: "The NFT was minted but metadata couldn't be loaded. Check your wallet.",
      type: "warning",
      duration: 5000,
    });
  }

  return { digitalAsset, jsonMetadata };
};

const mintClick = async (
  umi: Umi,
  guard: GuardReturn,
  candyMachine: CandyMachine,
  candyGuard: CandyGuard,
  ownedTokens: DigitalAssetWithToken[],
  mintAmount: number,
  setMintsCreated: Dispatch<
    SetStateAction<
      | { mint: PublicKey; offChainMetadata: JsonMetadata | undefined }[]
      | undefined
    >
  >,
  guardList: GuardReturn[],
  setGuardList: Dispatch<SetStateAction<GuardReturn[]>>,
  onOpen: () => void,
  setCheckEligibility: Dispatch<SetStateAction<boolean>>,
  ownedCoreAssets: DasApiAssetAndAssetMintLimit[],
  coreAssetSelections: CoreAssetSelections,
  setIsMinting: Dispatch<SetStateAction<boolean>>,
  setMintingStage?: Dispatch<SetStateAction<string>>,
  walletSendTransaction?: WalletContextState["sendTransaction"],
  walletSignTransaction?: WalletContextState["signTransaction"],
  walletSignAllTransactions?: WalletContextState["signAllTransactions"]
) => {
  const guardToUse = chooseGuardToUse(guard, candyGuard);
  if (!guardToUse.guards) {
    return;
  }

  const buyBeer = isDeveloperFeeEnabled();
  const minMintProgressDurationMs = parseMintProgressDurationMs();
  let mintProgressOpenedAt: number | undefined;

  const showMintProgress = () => {
    if (mintProgressOpenedAt !== undefined) return;
    mintProgressOpenedAt = Date.now();
    setMintsCreated(undefined);
    setIsMinting(true);
    onOpen();
  };

  try {
    // Set up guard state for minting button loading
    const guardIndex = guardList.findIndex((g) => g.label === guardToUse.label);
    if (guardIndex === -1) {
      return;
    }
    const newGuardList = [...guardList];
    newGuardList[guardIndex].minting = true;
    setGuardList(newGuardList);

    // Start independent read-only RPC work together to minimize click-to-sign time.
    // The balance result is still checked before any route or mint is submitted.
    const guards = guardToUse.guards;
    const developerFeeLamports = getDeveloperFeeLamports();
    let requiredLamportsPerMint = developerFeeLamports;
    if (guards.solPayment.__option === "Some") {
      requiredLamportsPerMint += guards.solPayment.value.lamports.basisPoints;
    }
    if (guards.solFixedFee.__option === "Some") {
      requiredLamportsPerMint += guards.solFixedFee.value.lamports.basisPoints;
    }
    if (guards.freezeSolPayment.__option === "Some") {
      requiredLamportsPerMint += guards.freezeSolPayment.value.lamports.basisPoints;
    }
    const requiredLamports = requiredLamportsPerMint * BigInt(mintAmount);
    const walletBalancePromise = requiredLamports > BigInt(0)
      ? umi.rpc.getBalance(umi.identity.publicKey)
      : Promise.resolve(undefined);

    const lut = process.env.NEXT_PUBLIC_LUT;
    const tablesPromise: Promise<AddressLookupTableInput[]> = lut
      ? fetchAddressLookupTable(umi, publicKey(lut)).then((table) => [table])
      : Promise.resolve([]);
    if (!lut) {
      toaster.create({
        title: "The developer should really set a lookup table!",
        type: "warning",
        duration: 900,
      });
    }

    const [walletBalance, tables] = await Promise.all([
      walletBalancePromise,
      tablesPromise,
    ]);

    if (walletBalance) {
      // Each mint is a separate transaction, so reserve a buffer per transaction.
      const requiredWithBuffer =
        requiredLamports + BigInt(10_000_000) * BigInt(mintAmount);
      if (walletBalance.basisPoints < requiredWithBuffer) {
        const requiredSol = Number(requiredWithBuffer) / 1e9;
        const currentSol = Number(walletBalance.basisPoints) / 1e9;
        toaster.create({
          title: "Insufficient SOL",
          description: `You need at least ${requiredSol.toFixed(3)} SOL but only have ${currentSol.toFixed(3)} SOL`,
          type: "error",
          duration: 5000,
        });
        // Reset minting state
        newGuardList[guardIndex].minting = false;
        setGuardList(newGuardList);
        return;
      }
    }

    let routeBuild = await routeBuilder(umi, guardToUse, candyMachine);
    if (routeBuild) {
      toaster.create({
        title: "Allowlist detected. Please sign to be approved to mint.",
        type: "info",
        duration: 900,
      });
      const latestBlockhash = (await umi.rpc.getLatestBlockhash({commitment: "confirmed"}));
      routeBuild = routeBuild.setBlockhash(latestBlockhash)
      await umi.rpc
      .sendTransaction(routeBuild.build(umi), { skipPreflight: false, maxRetries: 3, preflightCommitment: "confirmed", commitment: "confirmed" })
    }
    const nftsigners = [] as KeypairSigner[];

    for (let i = 0; i < mintAmount; i++) {
      const nftMint = generateSigner(umi);
      nftsigners.push(nftMint);
    }

    const mintArgsArray = mintArgsBuilder(
      guardToUse,
      ownedTokens,
      ownedCoreAssets,
      mintAmount,
      coreAssetSelections
    );
    const latestBlockhash = (await umi.rpc.getLatestBlockhash({commitment: "confirmed"}));
    const needsBackendSigner = guards.thirdPartySigner.__option === "Some";

    const mintTxs: { transaction: Transaction; signers: Signer[] }[] =
      await buildTxs(
        umi,
        candyMachine,
        candyGuard,
        nftsigners,
        guardToUse,
        mintArgsArray,
        tables,
        latestBlockhash.blockhash,
        buyBeer
      );
    if (!mintTxs.length) {
      return;
    }

    updateLoadingText(`Please sign`, guardList, guardToUse.label, setGuardList);

    // Use the wallet adapter's standard send path, but retain preflight so a bad
    // guard combination is rejected before it can trigger bot tax on-chain.
    const signatures: Uint8Array[] = [];
    let amountSent = 0;

    if (needsBackendSigner) {
      let walletSignedTransactions: VersionedTransaction[] | undefined;
      if (walletSignAllTransactions) {
        walletSignedTransactions = await walletSignAllTransactions(
          mintTxs.map((mintTx) =>
            toWeb3JsTransaction(mintTx.transaction) as VersionedTransaction
          )
        ) as VersionedTransaction[];
      }

      for (let index = 0; index < mintTxs.length; index++) {
        const mintTx = mintTxs[index];
        let web3jsTx = walletSignedTransactions?.[index] ??
          toWeb3JsTransaction(mintTx.transaction) as VersionedTransaction;
        const web3jsSigners = mintTx.signers
          .filter((signer): signer is KeypairSigner => "secretKey" in signer)
          .map((signer) => toWeb3JsKeypair(signer));

        // Let the wallet sign first. If a wallet rewrites the message, the
        // backend's strict instruction validation will reject it. Local asset
        // signatures are applied to the final wallet-returned message.
        if (walletSignedTransactions) {
          web3jsTx.sign(web3jsSigners);
        } else if (walletSignTransaction) {
          web3jsTx = await walletSignTransaction(web3jsTx) as VersionedTransaction;
          web3jsTx.sign(web3jsSigners);
        } else {
          let umiSigned = await umi.identity.signTransaction(mintTx.transaction);
          for (const signer of mintTx.signers) {
            if ("secretKey" in signer) {
              umiSigned = await signer.signTransaction(umiSigned);
            }
          }
          web3jsTx = toWeb3JsTransaction(umiSigned) as VersionedTransaction;
        }

        setMintingStage?.("🔐 Requesting mint authorization...");
        if (index === 0) {
          // Show progress while the server validates, signs and submits the
          // transaction instead of leaving the user on the mint button.
          showMintProgress();
        }
        const serialized = web3jsTx.serialize();
        let binary = "";
        for (let offset = 0; offset < serialized.length; offset += 8192) {
          binary += String.fromCharCode(...serialized.subarray(offset, offset + 8192));
        }

        const response = await fetch("/api/mint/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            transaction: window.btoa(binary),
            payer: umi.identity.publicKey.toString(),
          }),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || typeof result.signature !== "string") {
          throw new Error(result.error || "Mint authorization service rejected the transaction");
        }

        signatures.push(base58.serialize(result.signature));
        amountSent++;
        setMintingStage?.(`✅ Transaction ${amountSent}/${mintTxs.length} sent`);
      }
    } else if (walletSendTransaction) {
      const connection = new Connection(getActiveRpc(), "confirmed");

      for (let index = 0; index < mintTxs.length; index++) {
        const mintTx = mintTxs[index];
        // Convert UMI transaction to web3.js VersionedTransaction
        const web3jsTx = toWeb3JsTransaction(mintTx.transaction);

        // Convert UMI keypair signers to web3.js Keypair for pre-signing
        const web3jsSigners = mintTx.signers
          .filter((s): s is KeypairSigner => 'secretKey' in s)
          .map((s) => toWeb3JsKeypair(s));

        try {
          // wallet.sendTransaction will:
          // 1. Pre-sign with keypair signers (via options.signers)
          // 2. Use signAndSendTransaction for wallet-standard wallets
          //    (wallet signs + sends in one step, no Lighthouse injection)
          const sigString = await walletSendTransaction(web3jsTx, connection, {
            signers: web3jsSigners,
            skipPreflight: false,
            maxRetries: 3,
            preflightCommitment: "confirmed",
          });
          // Convert base58 string back to Uint8Array for verifyTx
          const sigBytes = base58.serialize(sigString);
          signatures.push(sigBytes);
          amountSent++;

          // Open dialog after first successful send
          if (index === 0) {
            showMintProgress();
          }
          setMintingStage?.(`✅ Transaction ${amountSent}/${mintTxs.length} sent`);
        } catch (error) {
          console.error(`[Mint] TX ${index + 1} failed:`, error);
          if (index === 0) throw error; // First tx must succeed
        }
      }
    } else {
      // Fallback: UMI signing (for wallets not using wallet adapter)
      const signedTransactions: Transaction[] = [];
      for (const mintTx of mintTxs) {
        let tx = await umi.identity.signTransaction(mintTx.transaction);
        for (const signer of mintTx.signers) {
          if ('secretKey' in signer) {
            tx = await signer.signTransaction(tx);
          }
        }
        signedTransactions.push(tx);
      }

      showMintProgress();
      setMintingStage?.("📡 Sending transaction to Solana...");

      const sendPromises = signedTransactions.map((tx) => {
        return umi.rpc
          .sendTransaction(tx, { skipPreflight: false, maxRetries: 3, preflightCommitment: "confirmed", commitment: "confirmed" })
          .then((signature) => {
            amountSent++;
            signatures.push(signature);
            setMintingStage?.(`✅ Transaction ${amountSent}/${signedTransactions.length} confirmed`);
            return { status: "fulfilled" as const, value: signature };
          })
          .catch((error) => {
            console.error("[Mint] sendTransaction failed:", error);
            return { status: "rejected" as const, reason: error };
          });
      });

      await Promise.allSettled(sendPromises);
      const firstResult = await sendPromises[0];
      if (firstResult.status !== "fulfilled") {
        console.error("[Mint] First tx rejected:", firstResult.reason);
        throw new Error("no tx was created");
      }
    }

    if (signatures.length === 0) {
      throw new Error("no tx was created");
    }
    updateLoadingText(
      `confirming transaction(s)`,
      guardList,
      guardToUse.label,
      setGuardList
    );

    setMintingStage?.("⏳ Confirming transactions on-chain...");
    toaster.create({
      title: `${signatures.length} Transaction(s) sent!`,
      type: "success",
      duration: 3000,
    });
    const successfulMints = await verifyTx(
      umi,
      signatures,
      nftsigners,
      "confirmed"
    );

    if (successfulMints.length > 0) {
      // Confirmation is the success boundary. DAS and off-chain JSON often lag
      // behind the chain, so reveal confirmed asset IDs immediately and hydrate
      // their metadata in the background.
      const confirmedMints = successfulMints.map((mint) => ({
        mint,
        offChainMetadata: undefined,
      }));
      setMintingStage?.("🎉 Mint successful!");
      setMintsCreated(confirmedMints);

      const metadataHydration = Promise.all(
        successfulMints.map(async (mint) => ({
          mint,
          nftData: await fetchNft(umi, mint),
        }))
      ).then((results) => {
        const hydratedMints = results.map(({ mint, nftData }) => ({
          mint,
          offChainMetadata: nftData.jsonMetadata,
        }));
        setMintsCreated((current) => {
          const currentIds = current?.map(({ mint }) => mint.toString()).join(",");
          const hydratedIds = hydratedMints.map(({ mint }) => mint.toString()).join(",");
          return currentIds === hydratedIds ? hydratedMints : current;
        });
      }).catch((error) => {
        // The on-chain mint remains successful and visible even if metadata is
        // temporarily unavailable. The Explorer button is still usable.
        console.warn("[Mint] Metadata is not available yet:", error);
      });

      // Keep the working animation visible long enough to feel intentional.
      // Confirmation and metadata time already spent in the modal counts
      // toward the 15-second minimum, so this never adds a fixed 15 seconds.
      const elapsed = mintProgressOpenedAt === undefined
        ? minMintProgressDurationMs
        : Date.now() - mintProgressOpenedAt;
      const remaining = Math.max(0, minMintProgressDurationMs - elapsed);
      if (remaining > 0) {
        await new Promise((resolve) => setTimeout(resolve, remaining));
      }
      setIsMinting(false);
      void metadataHydration;
    } else {
      // No mints created - likely bot tax or failed transaction
      // Reset minting state and clear mintsCreated to trigger modal close
      setIsMinting(false);
      setMintsCreated(undefined);
      // Toast already shown by verifyTx for bot tax/failure
    }
  } catch (e) {
    const error = e instanceof Error ? e : new Error(String(e));
    const userMessage = getErrorMessage(error);
    console.error("[Mint] Error:", error.message, error.stack);

    toaster.create({
      title: "Mint failed",
      description: userMessage,
      type: "error",
      duration: 5000,
    });
    // Reset minting state on error
    setIsMinting(false);
  } finally {
    // Don't reset here anymore - handled in try/catch blocks

    //find the guard by guardToUse.label and set minting to true
    const guardIndex = guardList.findIndex((g) => g.label === guardToUse.label);
    if (guardIndex !== -1) {
      const newGuardList = [...guardList];
      newGuardList[guardIndex].minting = false;
      setGuardList(newGuardList);
    }
    setCheckEligibility(true);
    updateLoadingText(undefined, guardList, guardToUse.label, setGuardList);
  }
};
type Props = {
  umi: Umi;
  guardList: GuardReturn[];
  candyMachine: CandyMachine | undefined;
  candyGuard: CandyGuard | undefined;
  ownedTokens: DigitalAssetWithToken[] | undefined;
  setGuardList: Dispatch<SetStateAction<GuardReturn[]>>;
  setMintsCreated: Dispatch<
    SetStateAction<
      | { mint: PublicKey; offChainMetadata: JsonMetadata | undefined }[]
      | undefined
    >
  >;
  onOpen: () => void;
  setCheckEligibility: Dispatch<SetStateAction<boolean>>;
  ownedCoreAssets: DasApiAssetAndAssetMintLimit[] | undefined;
  availableNFTs: number;
  setIsMinting: Dispatch<SetStateAction<boolean>>;
  setMintingStage?: Dispatch<SetStateAction<string>>;
  isConnected?: boolean;
  walletBalance?: number | null;
  mintServiceStatus?: "not-required" | "checking" | "ready" | "unavailable";
};

type CoreSelectionValues = Partial<
  Record<DestructiveCoreGuard, string[]>
>;

export const ButtonList: React.FC<Props> = ({
  umi,
  guardList,
  candyMachine,
  candyGuard,
  ownedTokens = [], // provide default empty array
  setGuardList,
  setMintsCreated,
  onOpen,
  setCheckEligibility,
  ownedCoreAssets = [],
  availableNFTs,
  setIsMinting,
  setMintingStage,
  isConnected = false,
  walletBalance = null,
  mintServiceStatus = "not-required",
}) => {
  const solanaTime = useSolanaTime();
  const {
    sendTransaction: walletSendTransaction,
    signTransaction: walletSignTransaction,
    signAllTransactions: walletSignAllTransactions,
  } = useWallet();
  const [mintAmounts, setMintAmounts] = useState<Record<string, number>>({});
  const [coreSelectionValues, setCoreSelectionValues] = useState<
    Record<string, CoreSelectionValues>
  >({});
  if (!candyMachine || !candyGuard) {
    return <></>;
  }

  const filteredGuardlist = guardList.filter(
    (elem, index, self) =>
      index === self.findIndex((t) => t.label === elem.label)
  );
  if (filteredGuardlist.length === 0) {
    return <></>;
  }

  let buttonGuardList: GuardButtonList[] = [];
  for (const guard of filteredGuardlist) {
    const text = getMintText(guard.label);
    const group = getMintableGuardGroup(candyGuard, guard.label);
    let startTime = createBigInt(0);
    let endTime = createBigInt(0);
    let mintPrice = 0;

    if (group) {
      if (group.guards.startDate.__option === "Some") {
        startTime = group.guards.startDate.value.date;
      }
      if (group.guards.endDate.__option === "Some") {
        endTime = group.guards.endDate.value.date;
      }
      // Get mint price from guards - check all payment types
      if (group.guards.solPayment.__option === "Some") {
        mintPrice = solAmountToSol(group.guards.solPayment.value.lamports);
      } else if (group.guards.solFixedFee.__option === "Some") {
        mintPrice = solAmountToSol(group.guards.solFixedFee.value.lamports);
      } else if (group.guards.freezeSolPayment.__option === "Some") {
        mintPrice = solAmountToSol(group.guards.freezeSolPayment.value.lamports);
      }
    }

    const buttonElement: GuardButtonList = {
      label: guard ? guard.label : "default",
      allowed: guard.allowed,
      header: text.header,
      mintText: text.mintText,
      buttonLabel: text.buttonLabel,
      startTime,
      endTime,
      tooltip: guard.reason,
      maxAmount: guard.maxAmount,
      mintPrice,
    };
    buttonGuardList.push(buttonElement);
  }

  // In "best" mode show one automatically selected group. In "all" mode the
  // buyer can choose among every configured group.
  let bestGuard: GuardButtonList | undefined;
  if (parseGuardSelectionMode() === "best") {
    const allowedGuards = buttonGuardList.filter((guard) => guard.allowed);
    const sortedAllowed = [...allowedGuards].sort(
      (a, b) => a.mintPrice - b.mintPrice
    );

    const publicFallback = [...buttonGuardList].sort(
      (a, b) => b.mintPrice - a.mintPrice
    )[0];

    if (!isConnected) {
      // Show the public/highest price before the wallet reveals eligibility.
      bestGuard = publicFallback;
    } else if (sortedAllowed.length > 0) {
      bestGuard = sortedAllowed[0];
    } else {
      // No group is eligible. Keep showing the public offer and its failure
      // reason instead of advertising a cheaper holder/allowlist group that
      // the connected wallet cannot use.
      bestGuard = publicFallback;
    }

    buttonGuardList = bestGuard ? [bestGuard] : [];
  }

  // Compare the already-normalized prices, including fixed/freeze payments.
  const allPrices = buttonGuardList
    .map((guard) => guard.mintPrice)
    .filter((price) => price > 0);
  const maxPrice = allPrices.length > 0 ? Math.max(...allPrices) : 0;
  const listItems = buttonGuardList.map((buttonGuard, index) => {
    const isMintingThis = guardList.find((elem) => elem.label === buttonGuard.label)?.minting;
    const loadingText = guardList.find((elem) => elem.label === buttonGuard.label)?.loadingText;
    const showEndTimer = buttonGuard.endTime > createBigInt(0) &&
      buttonGuard.endTime - solanaTime > createBigInt(0) &&
      (!buttonGuard.startTime || buttonGuard.startTime - solanaTime <= createBigInt(0));
    const showStartTimer = buttonGuard.startTime > createBigInt(0) &&
      buttonGuard.startTime - solanaTime > createBigInt(0) &&
      (!buttonGuard.endTime || solanaTime - buttonGuard.endTime <= createBigInt(0));
    const activeGuards = getMintableGuardGroup(
      candyGuard,
      buttonGuard.label
    )?.guards;
    const requiresBackendSigner = activeGuards?.thirdPartySigner.__option === "Some";
    const mintServiceReady = !requiresBackendSigner || mintServiceStatus === "ready";
    const quantityLimit = Math.max(
      1,
      Math.min(
        parseMaxMintAmount(),
        Math.max(1, buttonGuard.maxAmount),
        Math.max(1, availableNFTs)
      )
    );
    const mintAmount = Math.min(
      Math.max(1, mintAmounts[buttonGuard.label] ?? 1),
      quantityLimit
    );
    const canSelectQuantity = parseMultimintEnabled() && quantityLimit > 1;
    const guardSelectionValues =
      coreSelectionValues[buttonGuard.label] ?? {};
    const coreRequirements = activeGuards
      ? getCoreAssetRequirements(activeGuards)
      : [];
    const coreSelections: CoreAssetSelections = Object.fromEntries(
      coreRequirements.map((requirement) => {
        const expected = requirement.assetsPerMint * mintAmount;
        return [
          requirement.guard,
          (guardSelectionValues[requirement.guard] ?? [])
            .slice(0, expected)
            .filter(Boolean)
            .map((value) => publicKey(value)),
        ];
      })
    );
    const selectionError = activeGuards
      ? validateCoreAssetSelections(
          activeGuards,
          ownedCoreAssets,
          mintAmount,
          coreSelections
        )
      : undefined;
    const selectedAssetKeys = new Set(
      coreRequirements.flatMap((requirement) =>
        (guardSelectionValues[requirement.guard] ?? []).slice(
          0,
          requirement.assetsPerMint * mintAmount
        )
      )
    );
    const isGettingDiscount =
      isConnected &&
      buttonGuard.allowed &&
      buttonGuard.mintPrice < maxPrice;

    const updateCoreSelection = (
      guardName: DestructiveCoreGuard,
      slot: number,
      value: string
    ) => {
      setCoreSelectionValues((current) => {
        const byGuard = { ...(current[buttonGuard.label] ?? {}) };
        const values = [...(byGuard[guardName] ?? [])];
        values[slot] = value;
        byGuard[guardName] = values;
        return { ...current, [buttonGuard.label]: byGuard };
      });
    };

    return (
      <Box key={index} marginTop={"10px"} position="relative" zIndex={1}>
        <VStack gap={3} width="100%">
          {/* Holder Discount Badge */}
          {isGettingDiscount && (
            <Box
              bg="linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(5, 150, 105, 0.2))"
              border="1px solid rgba(16, 185, 129, 0.4)"
              borderRadius="full"
              px={3}
              py={1}
              display="flex"
              alignItems="center"
              gap={1.5}
            >
              <Text fontSize="sm">🎫</Text>
              <Text
                fontSize={{ base: "xs", md: "sm" }}
                fontWeight="700"
                color="#10b981"
                textTransform="uppercase"
                letterSpacing="0.05em"
              >
                Holder Discount Applied
              </Text>
            </Box>
          )}

          {/* Header */}
          <Heading
            size={{ base: "sm", md: "md" }}
            textTransform="uppercase"
            textAlign="center"
            width="100%"
            color="white"
            letterSpacing="0.1em"
            fontWeight="700"
            fontSize={{ base: "0.9rem", md: "1rem" }}
          >
            {buttonGuard.header}
          </Heading>

          {/* End Timer - Using Modern CountdownTimer */}
          {showEndTimer && (
            <CountdownTimer
              targetTime={buttonGuard.endTime}
              currentTime={solanaTime}
              variant="ending"
              setCheckEligibility={setCheckEligibility}
            />
          )}

          {/* Start Timer - Using Modern CountdownTimer */}
          {showStartTimer && (
            <CountdownTimer
              targetTime={buttonGuard.startTime}
              currentTime={solanaTime}
              variant="starting"
              setCheckEligibility={setCheckEligibility}
            />
          )}

          {/* Description */}
          <Text
            textAlign="center"
            fontSize={{ base: "0.8rem", md: "0.85rem" }}
            color="rgba(255, 255, 255, 0.7)"
            lineHeight="1.5"
          >
            {buttonGuard.mintText}
          </Text>

          {canSelectQuantity && (
            <HStack gap={3} justify="center" aria-label="Mint quantity">
              <Button
                size="sm"
                onClick={() =>
                  setMintAmounts((current) => ({
                    ...current,
                    [buttonGuard.label]: Math.max(1, mintAmount - 1),
                  }))
                }
                disabled={mintAmount <= 1}
                aria-label="Decrease mint quantity"
              >
                −
              </Button>
              <Text color="white" minW="5rem" textAlign="center">
                {mintAmount} NFT{mintAmount === 1 ? "" : "s"}
              </Text>
              <Button
                size="sm"
                onClick={() =>
                  setMintAmounts((current) => ({
                    ...current,
                    [buttonGuard.label]: Math.min(
                      quantityLimit,
                      mintAmount + 1
                    ),
                  }))
                }
                disabled={mintAmount >= quantityLimit}
                aria-label="Increase mint quantity"
              >
                +
              </Button>
            </HStack>
          )}

          {coreRequirements.map((requirement) => {
            const eligibleAssets = eligibleCoreAssets(
              ownedCoreAssets,
              requirement.requiredCollection
            );
            const count = requirement.assetsPerMint * mintAmount;
            const values = guardSelectionValues[requirement.guard] ?? [];
            return (
              <VStack
                key={requirement.guard}
                align="stretch"
                width="100%"
                gap={2}
                p={3}
                border="1px solid rgba(245, 158, 11, 0.45)"
                borderRadius="12px"
                bg="rgba(245, 158, 11, 0.08)"
              >
                <Text color="#fbbf24" fontSize="sm" fontWeight="700">
                  Select {count} asset{count === 1 ? "" : "s"} to {requirement.action}
                </Text>
                {Array.from({ length: count }, (_, slot) => (
                  <select
                    key={`${requirement.guard}-${slot}`}
                    aria-label={`${requirement.guard} asset ${slot + 1}`}
                    value={values[slot] ?? ""}
                    onChange={(event) =>
                      updateCoreSelection(
                        requirement.guard,
                        slot,
                        event.target.value
                      )
                    }
                    style={{
                      width: "100%",
                      minHeight: "40px",
                      borderRadius: "8px",
                      border: "1px solid rgba(255,255,255,0.25)",
                      background: "#17171f",
                      color: "white",
                      padding: "0 10px",
                    }}
                  >
                    <option value="">Choose an owned Core asset…</option>
                    {eligibleAssets.map((asset) => {
                      const key = asset.publicKey.toString();
                      const name = asset.name || "Core asset";
                      const selectedHere = values[slot] === key;
                      return (
                        <option
                          key={key}
                          value={key}
                          disabled={selectedAssetKeys.has(key) && !selectedHere}
                        >
                          {name} · {key.slice(0, 4)}…{key.slice(-4)}
                        </option>
                      );
                    })}
                  </select>
                ))}
              </VStack>
            );
          })}

          {selectionError && coreRequirements.length > 0 && (
            <Text color="#fbbf24" fontSize="xs" textAlign="center">
              {selectionError}
            </Text>
          )}

          {/* Premium Mint Button */}
          {requiresBackendSigner && mintServiceStatus !== "ready" && (
            <Text
              color={mintServiceStatus === "checking" ? "rgba(255, 255, 255, 0.65)" : "#f59e0b"}
              fontSize="xs"
              textAlign="center"
              role="status"
            >
              {mintServiceStatus === "checking"
                ? "Checking mint service…"
                : "Mint service is temporarily unavailable"}
            </Text>
          )}
          <PremiumMintButton
            onClick={() =>
              mintClick(
                umi,
                buttonGuard,
                candyMachine,
                candyGuard,
                ownedTokens,
                mintAmount,
                setMintsCreated,
                guardList,
                setGuardList,
                onOpen,
                setCheckEligibility,
                ownedCoreAssets,
                coreSelections,
                setIsMinting,
                setMintingStage,
                walletSendTransaction,
                walletSignTransaction,
                walletSignAllTransactions
              )
            }
            price={buttonGuard.mintPrice * mintAmount}
            isSoldOut={availableNFTs <= 0}
            isEligible={buttonGuard.allowed && mintServiceReady && !selectionError}
            isLoading={isMintingThis}
            loadingText={loadingText}
            title={selectionError ?? (mintServiceReady ? buttonGuard.tooltip : "Mint authorization service unavailable")}
            isConnected={isConnected}
            insufficientFunds={isConnected && walletBalance !== null && walletBalance < (buttonGuard.mintPrice + getDeveloperFeeSol() + 0.01) * mintAmount}
          >
            {mintAmount > 1
              ? `${buttonGuard.buttonLabel} ${mintAmount}`
              : buttonGuard.buttonLabel}
          </PremiumMintButton>
        </VStack>
      </Box>
    );
  });

  return <>{listItems}</>;
};
