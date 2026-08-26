import { readFileSync } from "fs";
import bs58 from "bs58";
import { Keypair } from "@solana/web3.js";

function parseSecretKey(raw: string): Uint8Array {
  const value = raw.trim();
  if (value.startsWith("[")) {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed) || parsed.some(
      (byte) => !Number.isInteger(byte) || byte < 0 || byte > 255
    )) {
      throw new Error("Signer JSON is invalid");
    }
    return Uint8Array.from(parsed as number[]);
  }
  return Uint8Array.from(bs58.decode(value));
}

export function loadThirdPartySigner(): Keypair {
  const inline = process.env.THIRD_PARTY_SIGNER_SECRET_KEY;
  const keypairPath = process.env.THIRD_PARTY_SIGNER_KEYPAIR_PATH;
  if ((inline && keypairPath) || (!inline && !keypairPath)) {
    throw new Error("Exactly one server signer source must be configured");
  }

  const raw = inline || readFileSync(keypairPath!, "utf8");
  const secretKey = parseSecretKey(raw);
  if (secretKey.length !== 64) {
    throw new Error("Server signer must be a 64-byte Solana keypair");
  }
  return Keypair.fromSecretKey(secretKey);
}
