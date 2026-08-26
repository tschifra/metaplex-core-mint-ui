import bs58 from "bs58";
import { Keypair } from "@solana/web3.js";
import { loadThirdPartySigner } from "../utils/server/thirdPartySigner";

describe("third-party signer loading", () => {
  const originalInline = process.env.THIRD_PARTY_SIGNER_SECRET_KEY;
  const originalPath = process.env.THIRD_PARTY_SIGNER_KEYPAIR_PATH;
  const keypair = Keypair.fromSeed(Uint8Array.from({ length: 32 }, (_, index) => index + 1));

  afterEach(() => {
    if (originalInline === undefined) delete process.env.THIRD_PARTY_SIGNER_SECRET_KEY;
    else process.env.THIRD_PARTY_SIGNER_SECRET_KEY = originalInline;
    if (originalPath === undefined) delete process.env.THIRD_PARTY_SIGNER_KEYPAIR_PATH;
    else process.env.THIRD_PARTY_SIGNER_KEYPAIR_PATH = originalPath;
  });

  it("accepts a JSON byte array", () => {
    delete process.env.THIRD_PARTY_SIGNER_KEYPAIR_PATH;
    process.env.THIRD_PARTY_SIGNER_SECRET_KEY = JSON.stringify(Array.from(keypair.secretKey));
    expect(loadThirdPartySigner().publicKey.toBase58()).toBe(keypair.publicKey.toBase58());
  });

  it("accepts a base58-encoded 64-byte keypair", () => {
    delete process.env.THIRD_PARTY_SIGNER_KEYPAIR_PATH;
    process.env.THIRD_PARTY_SIGNER_SECRET_KEY = bs58.encode(keypair.secretKey);
    expect(loadThirdPartySigner().publicKey.toBase58()).toBe(keypair.publicKey.toBase58());
  });

  it("rejects ambiguous signer configuration", () => {
    process.env.THIRD_PARTY_SIGNER_SECRET_KEY = bs58.encode(keypair.secretKey);
    process.env.THIRD_PARTY_SIGNER_KEYPAIR_PATH = "/tmp/not-used.json";
    expect(() => loadThirdPartySigner()).toThrow("Exactly one server signer source");
  });
});
