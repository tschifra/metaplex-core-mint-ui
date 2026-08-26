import assert from "node:assert/strict";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import {
  MPL_CORE_CANDY_GUARD_PROGRAM_ID,
  MPL_CORE_CANDY_MACHINE_CORE_PROGRAM_ID,
  findCandyMachineAuthorityPda,
  getMerkleProof,
  getMerkleRoot,
  mintV1,
  mplCandyMachine,
} from "@metaplex-foundation/mpl-core-candy-machine";
import { MPL_CORE_PROGRAM_ID } from "@metaplex-foundation/mpl-core";
import {
  createNoopSigner,
  generateSigner,
  signerIdentity,
  some,
  transactionBuilder,
} from "@metaplex-foundation/umi";
import { toWeb3JsTransaction } from "@metaplex-foundation/umi-web3js-adapters";
import {
  SYSVAR_INSTRUCTIONS_PUBKEY,
  SYSVAR_SLOT_HASHES_PUBKEY,
  SystemProgram,
} from "@solana/web3.js";

const umi = createUmi("http://127.0.0.1:8899").use(mplCandyMachine());
const payer = generateSigner(umi);
const asset = generateSigner(umi);
const candyMachine = generateSigner(umi).publicKey;
const candyGuard = generateSigner(umi).publicKey;
const collection = generateSigner(umi).publicKey;
const authorizationSigner = generateSigner(umi).publicKey;
umi.use(signerIdentity(payer));

const transaction = transactionBuilder()
  .add(mintV1(umi, {
    candyMachine,
    candyGuard,
    collection,
    asset,
    group: some("pub"),
    mintArgs: {
      thirdPartySigner: some({ signer: createNoopSigner(authorizationSigner) }),
    },
  }))
  .setBlockhash(generateSigner(umi).publicKey.toString())
  .build(umi);
const message = toWeb3JsTransaction(transaction).message;
const keys = message.getAccountKeys();
const compiled = message.compiledInstructions[0];
const metas = compiled.accountKeyIndexes.map((index) => ({
  pubkey: keys.get(index),
  signer: message.isAccountSigner(index),
  writable: message.isAccountWritable(index),
}));
const [authorityPda] = findCandyMachineAuthorityPda(umi, { candyMachine });

assert.equal(message.header.numRequiredSignatures, 3);
assert.equal(Buffer.from(compiled.data).subarray(0, 8).toString("hex"), "9162c076b8937668");
assert.deepEqual(new Set(message.staticAccountKeys.slice(0, 3).map((key) => key.toBase58())), new Set([
  payer.publicKey.toString(),
  asset.publicKey.toString(),
  authorizationSigner.toString(),
]));
assert.deepEqual(metas.slice(0, 13).map((meta) => meta.pubkey?.toBase58()), [
  candyGuard.toString(),
  MPL_CORE_CANDY_MACHINE_CORE_PROGRAM_ID,
  candyMachine.toString(),
  authorityPda.toString(),
  payer.publicKey.toString(),
  payer.publicKey.toString(),
  MPL_CORE_CANDY_GUARD_PROGRAM_ID,
  asset.publicKey.toString(),
  collection.toString(),
  MPL_CORE_PROGRAM_ID,
  SystemProgram.programId.toBase58(),
  SYSVAR_INSTRUCTIONS_PUBKEY.toBase58(),
  SYSVAR_SLOT_HASHES_PUBKEY.toBase58(),
]);
assert.deepEqual(metas.slice(0, 13).map(({ signer, writable }) => ({ signer, writable })), [
  { signer: false, writable: false },
  { signer: false, writable: false },
  { signer: false, writable: true },
  { signer: false, writable: true },
  { signer: true, writable: true },
  { signer: true, writable: true },
  { signer: false, writable: false },
  { signer: true, writable: true },
  { signer: false, writable: true },
  { signer: false, writable: false },
  { signer: false, writable: false },
  { signer: false, writable: false },
  { signer: false, writable: false },
]);
assert.deepEqual(
  { signer: metas[7].signer, writable: metas[7].writable },
  { signer: true, writable: true }
);
assert.deepEqual(
  { signer: metas.at(-1)?.signer, writable: metas.at(-1)?.writable },
  { signer: true, writable: true }
);

const allowlistVector = [
  "11111111111111111111111111111111",
  "So11111111111111111111111111111111111111112",
  "Vote111111111111111111111111111111111111111",
];
/** @param {Uint8Array} value */
const toHex = (value) => Buffer.from(value).toString("hex");
assert.equal(
  toHex(getMerkleRoot(allowlistVector)),
  "45da716b646d162a08c688991fcf58bebb54a59ce925d00766c83f331e1d31ac"
);
assert.deepEqual(
  getMerkleProof(allowlistVector, allowlistVector[1]).map(toHex),
  [
    "761dbf5223aee055bf4c264e939fe5d122b8c88689e203c43250bbf3c6964925",
    "1dc36694148ecc2d4f51b8ec2b016759ecd431a52713b004fafb3624fb82c953",
  ]
);

console.log("MintV1 transaction shape and allowlist Merkle vectors are compatible.");
