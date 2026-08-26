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
  const walletIdentity = useMemo(() => ({
    publicKey: wallet.publicKey,
    signMessage: wallet.signMessage,
    signTransaction: wallet.signTransaction,
    signAllTransactions: wallet.signAllTransactions,
  }), [
    wallet.publicKey,
    wallet.signAllTransactions,
    wallet.signMessage,
    wallet.signTransaction,
  ]);

  // Umi plugins mutate their host instance. Build a fresh client when the
  // endpoint or wallet context changes so stale identities are never reused.
  const umi = useMemo(() => {
    const nextUmi = createUmi(endpoint)
      .use(mplTokenMetadata())
      .use(mplCore())
      .use(mplCandyMachine())
      .use(dasApi());

    if (walletIdentity.publicKey === null) {
      const noopSigner = createNoopSigner(publicKey("11111111111111111111111111111111"));
      return nextUmi.use(signerIdentity(noopSigner));
    }

    return nextUmi.use(walletAdapterIdentity(walletIdentity));
  }, [endpoint, walletIdentity]);

  return <UmiContext.Provider value={{ umi }}>{children}</UmiContext.Provider>;
};
