import { readFileSync } from "node:fs";
import bs58 from "bs58";

/**
 * @param {string} raw
 * @param {string} label
 * @returns {Uint8Array}
 */
export function parseSecret(raw, label) {
  const value = raw.trim();
  let secret;
  if (value.startsWith("[")) {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed) || parsed.some(
      (byte) => !Number.isInteger(byte) || byte < 0 || byte > 255
    )) {
      throw new Error(`${label} contains invalid JSON keypair bytes`);
    }
    secret = new Uint8Array(parsed);
  } else {
    secret = new Uint8Array(bs58.decode(value));
  }
  if (secret.length !== 64) {
    throw new Error(`${label} is not a valid 64-byte Solana keypair`);
  }
  return secret;
}

/**
 * @param {string | undefined} inline
 * @param {string | undefined} file
 * @param {string} label
 * @returns {Uint8Array}
 */
export function loadSecretFromEnvOrFile(inline, file, label) {
  if (inline && file) throw new Error(`Set only one ${label} source`);
  if (inline) return parseSecret(inline, label);
  if (file) return parseSecret(readFileSync(file, "utf8"), label);
  throw new Error(`${label} is not configured`);
}
