import {
  PublicKey,
  Signer,
  TransactionWithMeta,
  Umi,
} from "@metaplex-foundation/umi";
import { createToaster } from "@chakra-ui/react";

const toaster = createToaster({ placement: "top" });

const detectBotTax = (logs: string[]) => {
  if (logs.find((l) => l.includes("Candy Guard Botting"))) {
    return true;
  }
  return false;
};

type VerifySignatureResult =
  | { success: true; mintedAssets: PublicKey[]; reason?: never }
  | { success: false; mint?: never; reason: string };

export const verifyTx = async (
  umi: Umi,
  signatures: Uint8Array[],
  nftSigners: Signer[],
  commitment: "processed" | "confirmed" | "finalized"
) => {
  const verifySignature = async (
    signature: Uint8Array
  ): Promise<VerifySignatureResult> => {
    let transaction: TransactionWithMeta | null | undefined;
    const transactionCommitment = commitment === "processed"
      ? "confirmed"
      : commitment;
    // The browser RPC endpoint is an HTTP-only same-origin proxy. Umi's
    // confirmTransaction path uses a WebSocket subscription which cannot work
    // through that endpoint and only returns after its long timeout. A
    // transaction returned at the requested commitment is already confirmed,
    // so polling getTransaction gives us confirmation, logs and account data in
    // one HTTP request path.
    for (let i = 0; i < 30; i++) {
      transaction = await umi.rpc.getTransaction(signature, {
        commitment: transactionCommitment,
      });
      if (transaction) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    if (transaction === undefined || transaction === null) {
      return { success: false, reason: "No TX found" };
    }

    if (detectBotTax(transaction.meta.logs)) {
      return { success: false, reason: "Bot Tax detected!" };
    }

    if (transaction.meta.err) {
      return { success: false, reason: "Transaction failed on-chain" };
    }

    const mintedAssets = nftSigners
      .filter((signer) =>
        transaction?.message.accounts.some(
          (account) => account === signer.publicKey
        )
      )
      .map((signer) => signer.publicKey);

    return { success: true, mintedAssets };
  };

  // Poll all signatures in parallel so multimints do not add confirmation
  // latency for every additional transaction.
  const stati = await Promise.all(signatures.map(verifySignature));
  const successful: PublicKey[] = [];
  const failed: string[] = [];
  stati.forEach((status) => {
    if (status.success === true) {
      successful.push(...status.mintedAssets);
    } else {
      failed.push(status.reason);
    }
  });

  if (failed && failed.length > 0) {
    toaster.create({
      title: `${failed.length} Mints failed!`,
      description: failed.join(', '),
      type: "error",
      duration: 5000,
    });
  }

  if (successful.length > 0) {
    toaster.create({
      title: `${successful.length} Mints successful!`,
      type: "success",
      duration: 3000,
    });
  }

  return successful;
};
