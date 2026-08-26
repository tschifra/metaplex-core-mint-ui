import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { walletAdapterIdentity } from "@metaplex-foundation/umi-signer-wallet-adapters";
import { mplTokenMetadata } from "@metaplex-foundation/mpl-token-metadata";
import { mplCore } from "@metaplex-foundation/mpl-core";
import { useWallet } from "@solana/wallet-adapter-react";
import { ReactNode, useMemo } from "react";
import { UmiContext } from "./useUmi";
import { mplCandyMachine } from "@metaplex-foundation/mpl-core-candy-machine";
import { createNoopSigner, publicKey, signerIdentity } from "@metaplex-foundation/umi";
import { dasApi } from '@metaplex-foundation/digital-asset-standard-api';

export const UmiProvider = ({
  endpoint,
  children,
}: {
  endpoint: string;
  children: ReactNode;
}) => {
  const wallet = useWallet();

  // Memoize the base Umi instance - only recreate when endpoint changes
  const baseUmi = useMemo(() => {
    return createUmi(endpoint)
      .use(mplTokenMetadata())
      .use(mplCore())
      .use(mplCandyMachine())
      .use(dasApi());
  }, [endpoint]);

  // Memoize the final Umi with identity - recreate when wallet connection changes
  const umi = useMemo(() => {
    if (wallet.publicKey === null) {
      const noopSigner = createNoopSigner(publicKey("11111111111111111111111111111111"));
      return baseUmi.use(signerIdentity(noopSigner));
    } else {
      return baseUmi.use(walletAdapterIdentity(wallet));
    }
  }, [baseUmi, wallet]);

  return <UmiContext.Provider value={{ umi }}>{children}</UmiContext.Provider>;
};
