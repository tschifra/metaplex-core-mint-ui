import {
  CandyGuard,
  GuardGroup,
  GuardSet,
} from "@metaplex-foundation/mpl-core-candy-machine";
import { PublicKey, isSome, none, sol, some } from "@metaplex-foundation/umi";

export type DualPricingConfig = {
  guards: GuardSet;
  groups: GuardGroup<GuardSet>[];
};

const withRequiredSigner = (
  guards: GuardSet,
  defaults: GuardSet
): GuardSet => ({
  ...guards,
  thirdPartySigner:
    isSome(guards.thirdPartySigner) || !isSome(defaults.thirdPartySigner)
      ? guards.thirdPartySigner
      : defaults.thirdPartySigner,
});

export const buildDualPricingConfig = (
  candyGuard: CandyGuard,
  publicPrice: number,
  holderPrice: number,
  discountMintOrCollection: PublicKey,
  treasury: PublicKey,
  isCoreCollection: boolean
): DualPricingConfig => {
  const publicPayment = some({
    lamports: sol(publicPrice),
    destination: treasury,
  });
  const holderPayment = some({
    lamports: sol(holderPrice),
    destination: treasury,
  });

  const existingHolder = candyGuard.groups.find(
    (group) => group.label === "hold"
  );
  const existingPublic = candyGuard.groups.find(
    (group) => group.label === "pub"
  );

  let holderGuards: GuardSet = withRequiredSigner(
    { ...(existingHolder?.guards ?? candyGuard.guards) },
    candyGuard.guards
  );
  holderGuards = {
    ...holderGuards,
    solPayment: holderPayment,
    assetGate: isCoreCollection
      ? some({ requiredCollection: discountMintOrCollection })
      : none(),
    tokenGate: isCoreCollection
      ? none()
      : some({ mint: discountMintOrCollection, amount: BigInt(1) }),
  };

  let publicGuards: GuardSet = withRequiredSigner(
    { ...(existingPublic?.guards ?? candyGuard.guards) },
    candyGuard.guards
  );
  publicGuards = {
    ...publicGuards,
    solPayment: publicPayment,
    assetGate: none(),
    tokenGate: none(),
  };

  const groups = candyGuard.groups.map((group) => {
    if (group.label === "hold") {
      return { label: group.label, guards: holderGuards };
    }
    if (group.label === "pub") {
      return { label: group.label, guards: publicGuards };
    }
    return { label: group.label, guards: { ...group.guards } };
  });
  if (!existingHolder) groups.push({ label: "hold", guards: holderGuards });
  if (!existingPublic) groups.push({ label: "pub", guards: publicGuards });

  return {
    guards: { ...candyGuard.guards, solPayment: publicPayment },
    groups,
  };
};
