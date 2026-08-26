import {
  FreezeTokenPayment,
  GuardSet,
  TokenPayment,
} from "@metaplex-foundation/mpl-core-candy-machine";
import { fetchToken } from "@metaplex-foundation/mpl-toolbox";
import { PublicKey, Some, Umi } from "@metaplex-foundation/umi";
import { toaster } from "./toaster";


export const checkAtaValid = (
  umi: Umi,
  guards: { label: string; guards: GuardSet }[]
) => {
  const atas: PublicKey[] = [];
  guards.forEach((guard) => {
    if (guard.guards.tokenPayment.__option === "Some") {
      const tokenPayment = guard.guards.tokenPayment as Some<TokenPayment>;
      atas.push(tokenPayment.value.destinationAta);
    }
    if (guard.guards.freezeTokenPayment.__option === "Some") {
      const freezeTokenPayment = guard.guards
        .freezeTokenPayment as Some<FreezeTokenPayment>;
      atas.push(freezeTokenPayment.value.destinationAta);
    }
  });
  atas.forEach((ata) => {
    fetchToken(umi, ata).catch(() => {
      toaster.create({
        title: "Your Candy Guard config is incorrect!",
        description: `${ata} is not a Associated Token Account! Minting will fail!`,
        type: "error",
        duration: 9000,
      });
    });
  });
  return;
};
