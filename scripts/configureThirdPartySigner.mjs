import nextEnv from "@next/env";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import {
  fetchCandyMachine,
  mplCandyMachine,
  safeFetchCandyGuard,
  updateCandyGuard,
} from "@metaplex-foundation/mpl-core-candy-machine";
import {
  createSignerFromKeypair,
  publicKey,
  signerIdentity,
  some,
} from "@metaplex-foundation/umi";
import { loadSecretFromEnvOrFile } from "./lib/keypair.mjs";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const rpc = process.env.RPC_URL;
const candyMachineId = process.env.NEXT_PUBLIC_CANDY_MACHINE_ID;
const signerPath = process.env.THIRD_PARTY_SIGNER_KEYPAIR_PATH;
const signerSecret = process.env.THIRD_PARTY_SIGNER_SECRET_KEY;
const apply = process.env.APPLY === "true";

if (!rpc || !candyMachineId || (!signerPath && !signerSecret)) {
  throw new Error("Set RPC_URL, NEXT_PUBLIC_CANDY_MACHINE_ID, and one third-party signer secret source");
}

const umi = createUmi(rpc).use(mplCandyMachine());
const signerKeypair = umi.eddsa.createKeypairFromSecretKey(
  loadSecretFromEnvOrFile(signerSecret, signerPath, "third-party signer")
);
const signer = createSignerFromKeypair(umi, signerKeypair);
const machine = await fetchCandyMachine(umi, publicKey(candyMachineId));
const guard = await safeFetchCandyGuard(umi, machine.mintAuthority);
if (!guard) throw new Error("Candy Guard account was not found");

console.log("Candy Machine:", machine.publicKey.toString());
console.log("Candy Guard:", guard.publicKey.toString());
console.log("Third-party signer:", signer.publicKey.toString());
console.log("Groups:", guard.groups.map((group) => group.label).join(", ") || "none");

const signerValue = some({ signerKey: signer.publicKey });
const guards = { ...guard.guards, thirdPartySigner: signerValue };
const groups = guard.groups.map((group) => ({
  label: group.label,
  guards: { ...group.guards, thirdPartySigner: signerValue },
}));

const alreadyConfigured = guard.guards.thirdPartySigner.__option === "Some" &&
  guard.guards.thirdPartySigner.value.signerKey.toString() === signer.publicKey.toString() &&
  guard.groups.every((group) => group.guards.thirdPartySigner.__option === "Some" &&
    group.guards.thirdPartySigner.value.signerKey.toString() === signer.publicKey.toString());
if (alreadyConfigured) {
  console.log("No update required: the signer already matches every Guard set.");
  process.exit(0);
}

if (!apply) {
  console.log("DRY RUN: no transaction sent. Re-run with APPLY=true and CANDY_GUARD_AUTHORITY_KEYPAIR_PATH set.");
  process.exit(0);
}

const authorityPath = process.env.CANDY_GUARD_AUTHORITY_KEYPAIR_PATH;
if (!authorityPath) throw new Error("CANDY_GUARD_AUTHORITY_KEYPAIR_PATH is required when APPLY=true");
if (process.env.CANDY_GUARD_CONFIRM_ADDRESS !== guard.publicKey.toString()) {
  throw new Error("Set CANDY_GUARD_CONFIRM_ADDRESS to the printed Candy Guard before applying");
}
const authorityKeypair = umi.eddsa.createKeypairFromSecretKey(
  loadSecretFromEnvOrFile(undefined, authorityPath, "Candy Guard authority")
);
const authority = createSignerFromKeypair(umi, authorityKeypair);
if (authority.publicKey.toString() !== guard.authority.toString()) {
  throw new Error("The supplied authority wallet does not control this Candy Guard");
}
umi.use(signerIdentity(authority));

await updateCandyGuard(umi, {
  candyGuard: guard.publicKey,
  guards,
  groups,
}).sendAndConfirm(umi, {
  confirm: { commitment: "finalized" },
  send: { skipPreflight: false },
});

const updated = await safeFetchCandyGuard(umi, guard.publicKey);
const verified = updated && updated.guards.thirdPartySigner.__option === "Some" &&
  updated.guards.thirdPartySigner.value.signerKey.toString() === signer.publicKey.toString() &&
  updated.groups.every((group) => group.guards.thirdPartySigner.__option === "Some" &&
    group.guards.thirdPartySigner.value.signerKey.toString() === signer.publicKey.toString());
if (!verified) {
  throw new Error("Candy Guard update could not be verified");
}
console.log("Candy Guard updated and verified.");
