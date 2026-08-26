import {
  AddressGate,
  AssetBurn,
  AssetBurnMulti,
  AssetGate,
  AssetPayment,
  AssetPaymentMulti,
  CandyGuard,
  CandyMachine,
  EndDate,
  FreezeSolPayment,
  FreezeTokenPayment,
  GuardSet,
  NftBurn,
  NftGate,
  NftPayment,
  RedeemedAmount,
  SolFixedFee,
  SolPayment,
  StartDate,
  TokenBurn,
  TokenGate,
  TokenPayment,
} from "@metaplex-foundation/mpl-core-candy-machine";
import {
  SolAmount,
  PublicKey,
  Some,
  Umi,
  assertAccountExists,
  publicKey,
  sol,
} from "@metaplex-foundation/umi";
import {
  addressGateChecker,
  allowlistChecker,
  checkNftsRequired,
  checkSolBalanceRequired,
  mintLimitChecker,
  ownedNftChecker,
  GuardReturn,
  allocationChecker,
  calculateMintable,
  remainingBeforeRedeemedLimit,
  nftMintLimitChecker,
  DigitalAssetWithTokenAndNftMintLimit,
  DasApiAssetAndAssetMintLimit,
  checkCoreAssetsRequired,
  assetMintLimitChecker,
  ownedCoreAssetChecker,
  tokenBalanceChecker,
} from "./checkerHelper";
import { allowLists } from "./../allowlist";
import { fetchAllDigitalAssetWithTokenByOwner } from "@metaplex-foundation/mpl-token-metadata";
import { checkAtaValid } from "./validateConfig";
import { das } from "@metaplex-foundation/mpl-core-das";
import { getDeveloperFeeLamports } from "./developerFee";
import {
  eligibleCoreAssets,
  getCoreAssetRequirements,
} from "./coreAssetSelection";
import { getMintableGuardGroups } from "./guardResolution";

const TOKEN_2022_PROGRAM_ID = publicKey(
  "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
);

export const guardChecker = async (
  umi: Umi,
  candyGuard: CandyGuard,
  candyMachine: CandyMachine,
  solanaTime: bigint
) => {
  const guardReturn: GuardReturn[] = [];

  let ownedTokens: DigitalAssetWithTokenAndNftMintLimit[] = [];
  let ownedCoreAssets: DasApiAssetAndAssetMintLimit[] = [];
  if (!candyGuard) {
    if (guardReturn.length === 0) {
      //guardReturn.push({ label: "default", allowed: false });
    }
    return { guardReturn, ownedNfts: ownedTokens, ownedCoreAssets };
  }

  const guardsToCheck: { label: string; guards: GuardSet }[] =
    getMintableGuardGroups(candyGuard);
  const developerFeeLamports = getDeveloperFeeLamports();

  //no wallet connected. return dummies
  const dummyPublicKey = publicKey("11111111111111111111111111111111");
  if (
    umi.identity.publicKey === dummyPublicKey
  ) {
    for (const eachGuard of guardsToCheck) {
      guardReturn.push({
        label: eachGuard.label,
        allowed: false,
        reason: "Please connect your wallet to mint",
        maxAmount: 0,
      });
    }
    return { guardReturn, ownedNfts: ownedTokens, ownedCoreAssets };
  }

  if (
    Number(candyMachine.data.itemsAvailable) -
      Number(candyMachine.itemsRedeemed) ===
      0
  ) {
    for (const eachGuard of guardsToCheck) {
      guardReturn.push({
        label: eachGuard.label,
        allowed: false,
        reason: "Sorry, we are minted out!",
        maxAmount: 0,
      });
    }
    return { guardReturn, ownedNfts: ownedTokens, ownedCoreAssets };
  }

  if (candyMachine.authority === umi.identity.publicKey) {
    checkAtaValid(umi, guardsToCheck);
  }

  let solBalance: SolAmount = sol(0);
  if (developerFeeLamports > BigInt(0) || checkSolBalanceRequired(guardsToCheck)) {
    try {
      const account = await umi.rpc.getAccount(umi.identity.publicKey);
      assertAccountExists(account);
      solBalance = account.lamports;
    } catch (e) {
      for (const eachGuard of guardsToCheck) {
        guardReturn.push({
          label: eachGuard.label,
          allowed: false,
          reason: "Wallet does not exist. Do you have SOL?",
          maxAmount: 0,
        });
      }
      return { guardReturn, ownedNfts: ownedTokens, ownedCoreAssets };
    }
  }

  if (checkNftsRequired(guardsToCheck)) {
    try {
      ownedTokens = await fetchAllDigitalAssetWithTokenByOwner(
        umi,
        umi.identity.publicKey
      );
    } catch {
      ownedTokens = [];
    }
  }

  if (checkCoreAssetsRequired(guardsToCheck)) {
    try {
      const assetList = await das.getAssetsByOwner(umi,{
        owner: umi.identity.publicKey})
      ownedCoreAssets = assetList;
    } catch (e) {
      // No assets found is a normal case - wallet may not have any NFTs
      // No core assets found - this is normal if wallet has no NFTs
      ownedCoreAssets = [];
    }
  }

  for (const eachGuard of guardsToCheck) {
    const singleGuard = eachGuard.guards;
    let mintableAmount =
      Number(candyMachine.data.itemsAvailable) -
      Number(candyMachine.itemsRedeemed);

    if (singleGuard.addressGate.__option === "Some") {
      const addressGate = singleGuard.addressGate as Some<AddressGate>;
      if (
        !addressGateChecker(
          umi.identity.publicKey,
          publicKey(addressGate.value.address)
        )
      ) {
        guardReturn.push({
          label: eachGuard.label,
          allowed: false,
          reason: "AddressGate: Wrong Address",
          maxAmount: 0,
        });
        continue;
      }
    }

    if (singleGuard.allocation.__option === "Some") {
      const allocatedAmount = await allocationChecker(
        umi,
        candyMachine,
        eachGuard
      );
      mintableAmount = calculateMintable(mintableAmount, allocatedAmount);

      if (allocatedAmount < 1) {
        guardReturn.push({
          label: eachGuard.label,
          allowed: false,
          reason: "Allocation of this guard reached",
          maxAmount: 0,
        });
        continue;
      }
    }

    if (singleGuard.allowList.__option === "Some") {
      if (!allowlistChecker(allowLists, umi, eachGuard.label)) {
        guardReturn.push({
          label: eachGuard.label,
          allowed: false,
          reason: "Wallet not allowlisted",
          maxAmount: 0,
        });
        continue;
      }
    }

    if (singleGuard.assetBurn.__option === "Some") {
      const assetBurn = singleGuard.assetBurn as Some<AssetBurn>;
      const payableAmount = await ownedCoreAssetChecker(
        ownedCoreAssets,
        assetBurn.value.requiredCollection
      );
      mintableAmount = calculateMintable(mintableAmount, payableAmount);
      if (payableAmount === 0) {
        guardReturn.push({
          label: eachGuard.label,
          allowed: false,
          reason: "No Asset to burn!",
          maxAmount: 0,
        });
        continue;
      }
    }

    if (singleGuard.assetBurnMulti.__option === "Some") {
      const assetBurnMulti = singleGuard.assetBurnMulti as Some<AssetBurnMulti>;
      const payableAmount = await ownedCoreAssetChecker(
        ownedCoreAssets,
        assetBurnMulti.value.requiredCollection
      );
      const multiAmount = Math.floor(
        payableAmount / Number(assetBurnMulti.value.num)
      );
      mintableAmount = calculateMintable(mintableAmount, multiAmount);
      if (multiAmount < 1) {
        guardReturn.push({
          label: eachGuard.label,
          allowed: false,
          reason: "No Asset to burn!",
          maxAmount: 0,
        });
        continue;
      }
    }

    if (singleGuard.assetMintLimit.__option === "Some") {
      const { assetMintLimitAssets, ownedCoreAssets: newOwnedCoreAssets  } = await assetMintLimitChecker(
        umi,
        candyMachine,
        eachGuard,
        ownedCoreAssets
      );
      ownedCoreAssets = newOwnedCoreAssets;
      if (!assetMintLimitAssets) {
        continue;
      }
      let totalAmount: number = 0;
      assetMintLimitAssets.forEach(element => {
        if (element.assetMintLimit){
          totalAmount = totalAmount + element.assetMintLimit
        }
      });
      mintableAmount = calculateMintable(mintableAmount, totalAmount);
      if (totalAmount < 1) {
        guardReturn.push({
          label: eachGuard.label,
          allowed: false,
          reason: "Asset Mint limit of all owned NFT reached",
          maxAmount: 0,
        });
        continue;
      }
    }

    if (singleGuard.assetPayment.__option === "Some") {
      const assetPayment = singleGuard.assetPayment as Some<AssetPayment>;
      const payableAmount = await ownedCoreAssetChecker(
        ownedCoreAssets,
        assetPayment.value.requiredCollection
      );
      mintableAmount = calculateMintable(mintableAmount, payableAmount);
      if (payableAmount === 0) {
        guardReturn.push({
          label: eachGuard.label,
          allowed: false,
          reason: "No Asset to pay!",
          maxAmount: 0,
        });
        continue;
      }
    }

    if (singleGuard.assetPaymentMulti.__option === "Some") {
      const assetPaymentMulti = singleGuard.assetPaymentMulti as Some<AssetPaymentMulti>;
      const payableAmount = await ownedCoreAssetChecker(
        ownedCoreAssets,
        assetPaymentMulti.value.requiredCollection
      );
      const multiAmount = Math.floor(
        payableAmount / Number(assetPaymentMulti.value.num)
      );
      mintableAmount = calculateMintable(mintableAmount, multiAmount);
      if (multiAmount < 1) {
        guardReturn.push({
          label: eachGuard.label,
          allowed: false,
          reason: "No Asset to pay!",
          maxAmount: 0,
        });
        continue;
      }
    }

    if (singleGuard.endDate.__option === "Some") {
      const addressGate = singleGuard.endDate as Some<EndDate>;
      if (solanaTime >= addressGate.value.date) {
        guardReturn.push({
          label: eachGuard.label,
          allowed: false,
          reason: "Mint time is over!",
          maxAmount: 0,
        });
        continue;
      }
    }

    if (singleGuard.freezeSolPayment.__option === "Some") {
      const freezeSolPayment =
        singleGuard.freezeSolPayment as Some<FreezeSolPayment>;
      const totalCost = freezeSolPayment.value.lamports.basisPoints + developerFeeLamports;
      if (totalCost > BigInt(0)) {
        const payableAmount = solBalance.basisPoints / totalCost;
        mintableAmount = calculateMintable(mintableAmount, Number(payableAmount));
      }

      if (
        totalCost > solBalance.basisPoints
      ) {
        guardReturn.push({
          label: eachGuard.label,
          allowed: false,
          reason: "Not enough SOL",
          maxAmount: 0,
        });
        continue;
      }
    }

    if (singleGuard.mintLimit.__option === "Some") {
      const amount = await mintLimitChecker(umi, candyMachine, eachGuard);
      mintableAmount = calculateMintable(mintableAmount, amount);
      if (amount < 1) {
        guardReturn.push({
          label: eachGuard.label,
          allowed: false,
          reason: "Mint limit of this wallet reached",
          maxAmount: 0,
        });
        continue;
      }
    }

    if (singleGuard.freezeTokenPayment.__option === "Some") {
      const freezeTokenPayment =
        singleGuard.freezeTokenPayment as Some<FreezeTokenPayment>;
      const tokenBalance = await tokenBalanceChecker(
        umi,
        freezeTokenPayment.value.amount,
        freezeTokenPayment.value.mint
      );
      if (tokenBalance < freezeTokenPayment.value.amount) {
        guardReturn.push({
          label: eachGuard.label,
          allowed: false,
          reason: "Not enough tokens!",
          maxAmount: 0,
        });
        continue;
      } else {
        const payableAmount = Number(tokenBalance) / Number(freezeTokenPayment.value.amount);
        mintableAmount = calculateMintable(
          mintableAmount,
          Number(payableAmount)
        );
      }
    }

    if (singleGuard.nftBurn.__option === "Some") {
      const nftBurn = singleGuard.nftBurn as Some<NftBurn>;
      const payableAmount = await ownedNftChecker(
        ownedTokens,
        nftBurn.value.requiredCollection
      );
      mintableAmount = calculateMintable(mintableAmount, payableAmount);
      if (payableAmount === 0) {
        guardReturn.push({
          label: eachGuard.label,
          allowed: false,
          reason: "No NFT to burn!",
          maxAmount: 0,
        });
        continue;
      }
    }

    if (singleGuard.nftMintLimit.__option === "Some") {
      const { nftMintLimitAssets, ownedNfts } = await nftMintLimitChecker(
        umi,
        candyMachine,
        eachGuard,
        ownedTokens
      );
      ownedTokens = ownedNfts;
      if (!nftMintLimitAssets) {
        continue;
      }
      let totalAmount: number = 0;
      nftMintLimitAssets.forEach(element => {
        if (element.nftMintLimit){
          totalAmount = totalAmount + element.nftMintLimit
        }
      });
      mintableAmount = calculateMintable(mintableAmount, totalAmount);
      if (totalAmount < 1) {
        guardReturn.push({
          label: eachGuard.label,
          allowed: false,
          reason: "NFT Mint limit of all owned NFT reached",
          maxAmount: 0,
        });
        continue;
      }
    }

    if (singleGuard.nftGate.__option === "Some") {
      const nftGate = singleGuard.nftGate as Some<NftGate>;
      const legacyNftCount = await ownedNftChecker(ownedTokens, nftGate.value.requiredCollection);
      if (legacyNftCount === 0) {
        guardReturn.push({
          label: eachGuard.label,
          allowed: false,
          reason: "No NFT from required collection!",
          maxAmount: 0,
        });
        continue;
      }
    }

    // AssetGate - for Metaplex Core NFT collections
    if (singleGuard.assetGate.__option === "Some") {
      const assetGate = singleGuard.assetGate as Some<AssetGate>;
      const coreAssetCount = await ownedCoreAssetChecker(ownedCoreAssets, assetGate.value.requiredCollection);
      if (coreAssetCount === 0) {
        guardReturn.push({
          label: eachGuard.label,
          allowed: false,
          reason: "No Core NFT from required collection!",
          maxAmount: 0,
        });
        continue;
      }
    }

    if (singleGuard.nftPayment.__option === "Some") {
      const nftPayment = singleGuard.nftPayment as Some<NftPayment>;
      const payableAmount = await ownedNftChecker(
        ownedTokens,
        nftPayment.value.requiredCollection
      );
      mintableAmount = calculateMintable(mintableAmount, payableAmount);
      if (payableAmount === 0) {
        guardReturn.push({
          label: eachGuard.label,
          allowed: false,
          reason: "No NFT to pay with!",
          maxAmount: 0,
        });
        continue;
      }
    }

    if (singleGuard.redeemedAmount.__option === "Some") {
      const redeemedAmount = singleGuard.redeemedAmount as Some<RedeemedAmount>;
      const remaining = remainingBeforeRedeemedLimit(
        redeemedAmount.value.maximum,
        candyMachine.itemsRedeemed
      );

      mintableAmount = calculateMintable(mintableAmount, remaining);
      if (remaining < 1) {
        guardReturn.push({
          label: eachGuard.label,
          allowed: false,
          reason: "Too many NFTs redeemed!",
          maxAmount: 0,
        });
        continue;
      }
    }

    if (
      singleGuard.solPayment.__option === "Some" ||
      singleGuard.solFixedFee.__option === "Some" ||
      singleGuard.freezeSolPayment.__option === "Some" ||
      developerFeeLamports > BigInt(0)
    ) {
      const solPayment = singleGuard.solPayment as Some<SolPayment>;
      const solFixedFee = singleGuard.solFixedFee as Some<SolFixedFee>;
      let cost = Number(developerFeeLamports);
      if (
        singleGuard.solPayment.__option === "Some" &&
        solPayment.value.lamports.basisPoints !== BigInt(0)
      ) {
        cost += Number(solPayment.value.lamports.basisPoints);
      }
      if (
        singleGuard.solFixedFee.__option === "Some" &&
        solFixedFee.value.lamports.basisPoints !== BigInt(0)
      ) {
        cost += Number(solFixedFee.value.lamports.basisPoints);
      }
      if (singleGuard.freezeSolPayment.__option === "Some") {
        cost += Number(
          (singleGuard.freezeSolPayment as Some<FreezeSolPayment>).value
            .lamports.basisPoints
        );
      }
      if (cost > 0) {
        const payableAmount = Number(solBalance.basisPoints) / cost;
        mintableAmount = calculateMintable(mintableAmount, payableAmount);
      }

      if (mintableAmount === 0) {
        guardReturn.push({
          label: eachGuard.label,
          allowed: false,
          reason: "Not enough SOL!",
          maxAmount: 0,
        });
        continue;
      }
    }

    if (singleGuard.startDate.__option === "Some") {
      const startDate = singleGuard.startDate as Some<StartDate>;
      if (solanaTime < startDate.value.date) {
        guardReturn.push({
          label: eachGuard.label,
          allowed: false,
          reason: "StartDate not reached!",
          maxAmount: 0,
        });

        continue;
      }
    }

    if (singleGuard.tokenBurn.__option === "Some") {
      const tokenBurn = singleGuard.tokenBurn as Some<TokenBurn>;
      const tokenBalance = await tokenBalanceChecker(
        umi,
        tokenBurn.value.amount,
        tokenBurn.value.mint
      );
      if (tokenBalance < tokenBurn.value.amount) {
        guardReturn.push({
          label: eachGuard.label,
          allowed: false,
          reason: "Not enough tokens!",
          maxAmount: 0,
        });
        continue;
      }
      const payableAmount = Number(tokenBalance) / Number(tokenBurn.value.amount);
      mintableAmount = calculateMintable(mintableAmount, Number(payableAmount));
    }

    if (singleGuard.tokenGate.__option === "Some") {
      const tokenGate = singleGuard.tokenGate as Some<TokenGate>;
      // Check SPL token balance using tokenBalanceChecker
      const tokenBalance = await tokenBalanceChecker(
        umi,
        tokenGate.value.amount,
        tokenGate.value.mint
      );
      if (tokenBalance < tokenGate.value.amount) {
        guardReturn.push({
          label: eachGuard.label,
          allowed: false,
          reason: "Not enough tokens!",
          maxAmount: 0,
        });
        continue;
      }
    }

    if (singleGuard.tokenPayment.__option === "Some") {
      const tokenPayment = singleGuard.tokenPayment as Some<TokenPayment>;
      const tokenBalance = await tokenBalanceChecker(
        umi,
        tokenPayment.value.amount,
        tokenPayment.value.mint
      );
      if (tokenBalance < tokenPayment.value.amount) {
        guardReturn.push({
          label: eachGuard.label,
          allowed: false,
          reason: "Not enough tokens!",
          maxAmount: 0,
        });
        continue;
      }
      const payableAmount = Number(tokenBalance) / Number(tokenPayment.value.amount);
      mintableAmount = calculateMintable(mintableAmount, Number(payableAmount));
    }

    if (singleGuard.token2022Payment.__option === "Some") {
      const token2022Payment =
        singleGuard.token2022Payment as Some<TokenPayment>;
      const tokenBalance = await tokenBalanceChecker(
        umi,
        token2022Payment.value.amount,
        token2022Payment.value.mint,
        TOKEN_2022_PROGRAM_ID
      );
      if (tokenBalance < token2022Payment.value.amount) {
        guardReturn.push({
          label: eachGuard.label,
          allowed: false,
          reason: "Not enough tokens!",
          maxAmount: 0,
        });
        continue;
      }
      const payableAmount = Number(tokenBalance) / Number(token2022Payment.value.amount);
      mintableAmount = calculateMintable(mintableAmount, Number(payableAmount));
    }

    // Multiple destructive Token Metadata guards cannot reuse the same NFT.
    const legacyNftRequirements = new Map<
      string,
      { assetsPerMint: number; collection: PublicKey }
    >();
    if (singleGuard.nftBurn.__option === "Some") {
      const collection = (singleGuard.nftBurn as Some<NftBurn>).value
        .requiredCollection;
      legacyNftRequirements.set(collection.toString(), {
        assetsPerMint: 1,
        collection,
      });
    }
    if (singleGuard.nftPayment.__option === "Some") {
      const collection = (singleGuard.nftPayment as Some<NftPayment>).value
        .requiredCollection;
      const key = collection.toString();
      legacyNftRequirements.set(key, {
        assetsPerMint:
          (legacyNftRequirements.get(key)?.assetsPerMint ?? 0) + 1,
        collection,
      });
    }
    let lacksRequiredLegacyNfts = false;
    for (const { assetsPerMint, collection } of legacyNftRequirements.values()) {
      const owned = await ownedNftChecker(ownedTokens, collection);
      const possibleMints = Math.floor(owned / assetsPerMint);
      mintableAmount = calculateMintable(mintableAmount, possibleMints);
      if (possibleMints < 1) lacksRequiredLegacyNfts = true;
    }
    if (lacksRequiredLegacyNfts) {
      guardReturn.push({
        label: eachGuard.label,
        allowed: false,
        reason: "Not enough distinct NFTs for this guard group",
        maxAmount: 0,
      });
      continue;
    }

    // Token burns and payments from the same mint must be affordable together.
    const tokenCosts = new Map<string, { amount: bigint; mint: PublicKey }>();
    const addTokenCost = (mint: PublicKey, amount: bigint) => {
      const key = mint.toString();
      tokenCosts.set(key, {
        mint,
        amount: (tokenCosts.get(key)?.amount ?? BigInt(0)) + amount,
      });
    };
    if (singleGuard.tokenBurn.__option === "Some") {
      const guard = singleGuard.tokenBurn as Some<TokenBurn>;
      addTokenCost(guard.value.mint, guard.value.amount);
    }
    if (singleGuard.tokenPayment.__option === "Some") {
      const guard = singleGuard.tokenPayment as Some<TokenPayment>;
      addTokenCost(guard.value.mint, guard.value.amount);
    }
    if (singleGuard.freezeTokenPayment.__option === "Some") {
      const guard = singleGuard.freezeTokenPayment as Some<FreezeTokenPayment>;
      addTokenCost(guard.value.mint, guard.value.amount);
    }
    let lacksRequiredTokens = false;
    for (const { amount, mint } of tokenCosts.values()) {
      if (amount === BigInt(0)) continue;
      const balance = await tokenBalanceChecker(umi, amount, mint);
      const possibleMints = Number(balance / amount);
      mintableAmount = calculateMintable(mintableAmount, possibleMints);
      if (possibleMints < 1) lacksRequiredTokens = true;
    }
    if (lacksRequiredTokens) {
      guardReturn.push({
        label: eachGuard.label,
        allowed: false,
        reason: "Not enough tokens for the combined guard payments",
        maxAmount: 0,
      });
      continue;
    }

    // Multiple destructive Core guards cannot reuse the same asset. Constrain
    // the amount by their combined per-collection requirement as well as by
    // each individual guard above.
    const destructiveRequirements = getCoreAssetRequirements(singleGuard);
    const requiredByCollection = new Map<
      string,
      { assetsPerMint: number; collection: PublicKey }
    >();
    destructiveRequirements.forEach((requirement) => {
      const key = requirement.requiredCollection.toString();
      const current = requiredByCollection.get(key);
      requiredByCollection.set(key, {
        assetsPerMint:
          (current?.assetsPerMint ?? 0) + requirement.assetsPerMint,
        collection: requirement.requiredCollection,
      });
    });
    let lacksRequiredCoreAssets = false;
    requiredByCollection.forEach(({ assetsPerMint, collection }) => {
      const owned = eligibleCoreAssets(ownedCoreAssets, collection).length;
      const possibleMints = Math.floor(owned / assetsPerMint);
      mintableAmount = calculateMintable(mintableAmount, possibleMints);
      if (possibleMints < 1) lacksRequiredCoreAssets = true;
    });
    if (lacksRequiredCoreAssets) {
      guardReturn.push({
        label: eachGuard.label,
        allowed: false,
        reason: "Not enough distinct Core assets for this guard group",
        maxAmount: 0,
      });
      continue;
    }
    guardReturn.push({
      label: eachGuard.label,
      allowed: true,
      maxAmount: mintableAmount,
    });
  }
  return { guardReturn, ownedTokens, ownedCoreAssets };
};
