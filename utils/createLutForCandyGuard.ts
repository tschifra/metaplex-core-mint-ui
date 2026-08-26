import {
  CandyGuard,
  CandyMachine,
  findAllocationTrackerPda,
  findCandyMachineAuthorityPda,
  getMplCoreCandyMachineCoreProgramId,
  safeFetchMintCounterFromSeeds,
} from "@metaplex-foundation/mpl-core-candy-machine";
import { getMplCoreProgramId } from "@metaplex-foundation/mpl-core";
import {
  createLut,
  getSplAssociatedTokenProgramId,
  getSplTokenProgramId,
  getSysvar,
} from "@metaplex-foundation/mpl-toolbox";
import {
  AddressLookupTableInput,
  PublicKey,
  Signer,
  TransactionBuilder,
  Umi,
  publicKey,
  uniquePublicKeys,
} from "@metaplex-foundation/umi";
import {
  DEVELOPER_FEE_RECIPIENT,
  isDeveloperFeeEnabled,
} from "./developerFee";

export const createLutForCandyMachineAndGuard = async (
  umi: Umi,
  recentSlot: number,
  candyMachine: CandyMachine,
  candyGuard: CandyGuard,
  lutAuthority?: Signer
): Promise<[TransactionBuilder, AddressLookupTableInput]> => {
  const addresses = await getLutAddressesForCandyMachineAndGuard(
    umi,
    candyMachine,
    candyGuard
  );

  return createLut(umi, {
    recentSlot,
    addresses,
    authority: lutAuthority,
  });
};

export const getLutAddressesForCandyMachineAndGuard = async (
  umi: Umi,
  candyMachine: CandyMachine,
  candyGuard: CandyGuard
): Promise<PublicKey[]> => {
  if (!umi.identity.publicKey) {
    return [];
  }

  const { mintAuthority, collectionMint } = candyMachine;
  const guardKeys: PublicKey[] = [];

  // Extract addresses from ALL guard sets (default + groups)
  const allGuardSets = [
    { label: "default", guards: candyGuard.guards },
    ...candyGuard.groups.map((g) => ({ label: g.label, guards: g.guards })),
  ];

  for (const { guards } of allGuardSets) {
    if (guards.addressGate.__option === "Some") {
      guardKeys.push(guards.addressGate.value.address);
    }
    if (guards.allocation.__option === "Some") {
      guardKeys.push(
        publicKey(
          findAllocationTrackerPda(umi, {
            candyGuard: candyGuard.publicKey,
            candyMachine: candyMachine.publicKey,
            id: guards.allocation.value.id,
          })
        )
      );
    }
    if (guards.freezeSolPayment.__option === "Some") {
      guardKeys.push(guards.freezeSolPayment.value.destination);
    }
    if (guards.freezeTokenPayment.__option === "Some") {
      guardKeys.push(guards.freezeTokenPayment.value.destinationAta);
      guardKeys.push(guards.freezeTokenPayment.value.mint);
    }
    if (guards.mintLimit.__option === "Some") {
      try {
        const mintLimitCounter = await safeFetchMintCounterFromSeeds(umi, {
          id: guards.mintLimit.value.id,
          user: umi.identity.publicKey,
          candyMachine: candyMachine.publicKey,
          candyGuard: candyGuard.publicKey,
        });
        if (mintLimitCounter?.publicKey) {
          guardKeys.push(mintLimitCounter.publicKey);
        }
      } catch {
        // Counter may not exist yet, skip
      }
    }
    if (guards.nftBurn.__option === "Some") {
      guardKeys.push(guards.nftBurn.value.requiredCollection);
    }
    if (guards.nftGate.__option === "Some") {
      guardKeys.push(guards.nftGate.value.requiredCollection);
    }
    if (guards.nftPayment.__option === "Some") {
      guardKeys.push(guards.nftPayment.value.requiredCollection);
    }
    if (guards.assetGate.__option === "Some") {
      guardKeys.push(guards.assetGate.value.requiredCollection);
    }
    if (guards.assetPayment.__option === "Some") {
      guardKeys.push(guards.assetPayment.value.requiredCollection);
    }
    if (guards.assetBurn.__option === "Some") {
      guardKeys.push(guards.assetBurn.value.requiredCollection);
    }
    if (guards.programGate.__option === "Some") {
      guards.programGate.value.additional.forEach((prog) => {
        guardKeys.push(prog);
      });
    }
    if (guards.solPayment.__option === "Some") {
      guardKeys.push(guards.solPayment.value.destination);
    }
    if (guards.token2022Payment.__option === "Some") {
      guardKeys.push(guards.token2022Payment.value.destinationAta);
      guardKeys.push(guards.token2022Payment.value.mint);
    }
    if (guards.tokenBurn.__option === "Some") {
      guardKeys.push(guards.tokenBurn.value.mint);
    }
    if (guards.tokenGate.__option === "Some") {
      guardKeys.push(guards.tokenGate.value.mint);
    }
    if (guards.tokenPayment.__option === "Some") {
      guardKeys.push(guards.tokenPayment.value.mint);
      guardKeys.push(guards.tokenPayment.value.destinationAta);
    }
  }

  return uniquePublicKeys([
    // Core candy machine accounts
    candyMachine.publicKey,
    mintAuthority, // candy guard address
    collectionMint,
    candyMachine.authority,
    findCandyMachineAuthorityPda(umi, {
      candyMachine: candyMachine.publicKey,
    })[0],
    // Sysvars
    getSysvar("instructions"),
    getSysvar("slotHashes"),
    // Program IDs
    getMplCoreCandyMachineCoreProgramId(umi),
    getMplCoreProgramId(umi),
    getSplTokenProgramId(umi),
    getSplAssociatedTokenProgramId(umi),
    // Guard-specific and optional fee addresses
    ...guardKeys,
    ...(isDeveloperFeeEnabled()
      ? [publicKey(DEVELOPER_FEE_RECIPIENT)]
      : []),
  ]);
};
