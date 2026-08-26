import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import nextEnv from "@next/env";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { fetchCollection } from "@metaplex-foundation/mpl-core";
import {
  MPL_CORE_CANDY_GUARD_PROGRAM_ID,
  MPL_CORE_CANDY_MACHINE_CORE_PROGRAM_ID,
  fetchCandyMachine,
  mplCandyMachine,
  safeFetchCandyGuard,
} from "@metaplex-foundation/mpl-core-candy-machine";
import { isSome, publicKey } from "@metaplex-foundation/umi";
import { loadSecretFromEnvOrFile } from "./lib/keypair.mjs";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

/** @param {string} name @returns {string} */
function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

/** @param {unknown} value @returns {unknown} */
function jsonSafe(value) {
  if (typeof value === "bigint") return value.toString();
  if (value instanceof Uint8Array) return Buffer.from(value).toString("base64");
  if (Array.isArray(value)) return value.map(jsonSafe);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, jsonSafe(item)]));
  }
  return value;
}

/** @param {Record<string, any>} guards @param {string} name */
function hasGuard(guards, name) {
  return guards[name]?.__option === "Some";
}

/** @param {Record<string, any>} guards @returns {string | undefined} */
function guardSigner(guards) {
  return isSome(guards.thirdPartySigner)
    ? guards.thirdPartySigner.value.signerKey.toString()
    : undefined;
}

const rpc = required("RPC_URL");
const candyMachineId = required("NEXT_PUBLIC_CANDY_MACHINE_ID");
const errors = [];
const warnings = [];
const umi = createUmi(rpc).use(mplCandyMachine());
const machine = await fetchCandyMachine(umi, publicKey(candyMachineId));
const guard = await safeFetchCandyGuard(umi, machine.mintAuthority);
if (!guard) throw new Error("Candy Guard account was not found");
const collection = await fetchCollection(umi, machine.collectionMint);

if (machine.mintAuthority.toString() !== guard.publicKey.toString()) {
  errors.push("Candy Machine mintAuthority is not the fetched Candy Guard");
}
if (machine.authority.toString() !== collection.updateAuthority.toString()) {
  warnings.push("Candy Machine authority and collection update authority differ");
}
if (machine.itemsLoaded !== Number(machine.data.itemsAvailable)) {
  errors.push(`Only ${machine.itemsLoaded}/${machine.data.itemsAvailable} config lines are loaded`);
}
if (machine.itemsRedeemed > machine.data.itemsAvailable) {
  errors.push("itemsRedeemed exceeds itemsAvailable");
}
for (const group of guard.groups) {
  if (Buffer.byteLength(group.label, "utf8") > 6) errors.push(`Group '${group.label}' exceeds six bytes`);
}

let expectedSigner = process.env.THIRD_PARTY_SIGNER_PUBLIC_KEY?.trim();
if (!expectedSigner && (process.env.THIRD_PARTY_SIGNER_SECRET_KEY ||
    process.env.THIRD_PARTY_SIGNER_KEYPAIR_PATH)) {
  const keypair = umi.eddsa.createKeypairFromSecretKey(loadSecretFromEnvOrFile(
    process.env.THIRD_PARTY_SIGNER_SECRET_KEY,
    process.env.THIRD_PARTY_SIGNER_KEYPAIR_PATH,
    "third-party signer"
  ));
  expectedSigner = keypair.publicKey.toString();
}

const defaultSigner = guardSigner(guard.guards);
const effectiveSignerByGroup = Object.fromEntries(guard.groups.map((group) => [
  group.label,
  guardSigner(group.guards) || defaultSigner || null,
]));
const requireSigner = process.env.GUARD_REQUIRE_THIRD_PARTY_SIGNER === "true" ||
  (process.env.GUARD_REQUIRE_THIRD_PARTY_SIGNER !== "false" &&
    process.env.NEXT_PUBLIC_DEVELOPER_FEE_ENABLED === "true");
if (requireSigner && guard.groups.length === 0 && !defaultSigner) {
  errors.push("Default thirdPartySigner is missing; direct clients can bypass the signing service");
}
if (guard.groups.length === 0 && expectedSigner && defaultSigner && defaultSigner !== expectedSigner) {
  errors.push("Default thirdPartySigner does not match the configured server signer");
}
for (const [label, signer] of Object.entries(effectiveSignerByGroup)) {
  if (requireSigner && !signer) errors.push(`Group '${label}' has no effective thirdPartySigner`);
  if (expectedSigner && signer && signer !== expectedSigner) {
    errors.push(`Group '${label}' does not use the configured server signer`);
  }
}

const expectedAuthority = process.env.CANDY_GUARD_EXPECTED_AUTHORITY?.trim();
if (expectedAuthority && guard.authority.toString() !== expectedAuthority) {
  errors.push("Candy Guard authority differs from CANDY_GUARD_EXPECTED_AUTHORITY");
}
const expectedCollection = process.env.CANDY_MACHINE_EXPECTED_COLLECTION?.trim();
if (expectedCollection && machine.collectionMint.toString() !== expectedCollection) {
  errors.push("Candy Machine collection differs from CANDY_MACHINE_EXPECTED_COLLECTION");
}
const expectedGroups = (process.env.CANDY_GUARD_EXPECTED_GROUPS || "")
  .split(",").map((value) => value.trim()).filter(Boolean).sort();
const actualGroups = guard.groups.map((group) => group.label).sort();
if (expectedGroups.length && JSON.stringify(expectedGroups) !== JSON.stringify(actualGroups)) {
  errors.push(`Guard groups differ: expected ${expectedGroups.join(", ")}, found ${actualGroups.join(", ")}`);
}

const publicLabel = process.env.CANDY_GUARD_PUBLIC_GROUP_LABEL?.trim() ||
  (actualGroups.includes("pub") ? "pub" : undefined);
const publicGuards = publicLabel
  ? guard.groups.find((group) => group.label === publicLabel)?.guards
  : undefined;
if (publicLabel && !publicGuards) errors.push(`Public group '${publicLabel}' does not exist`);
if (publicGuards) {
  /** @param {string} name */
  const effective = (name) => hasGuard(publicGuards, name) || hasGuard(guard.guards, name);
  if (!effective("mintLimit")) warnings.push(`Public group '${publicLabel}' has no wallet mintLimit`);
  if (!effective("endDate")) warnings.push(`Public group '${publicLabel}' has no endDate`);
  if (!effective("programGate")) warnings.push(`Public group '${publicLabel}' has no programGate`);
}

const snapshot = jsonSafe({
  checkedAt: new Date().toISOString(),
  programs: {
    candyMachine: MPL_CORE_CANDY_MACHINE_CORE_PROGRAM_ID,
    candyGuard: MPL_CORE_CANDY_GUARD_PROGRAM_ID,
  },
  candyMachine: {
    publicKey: machine.publicKey,
    authority: machine.authority,
    mintAuthority: machine.mintAuthority,
    collectionMint: machine.collectionMint,
    itemsAvailable: machine.data.itemsAvailable,
    itemsLoaded: machine.itemsLoaded,
    itemsRedeemed: machine.itemsRedeemed,
    isSequential: machine.data.configLineSettings.__option === "Some"
      ? machine.data.configLineSettings.value.isSequential
      : null,
  },
  collection: {
    publicKey: collection.publicKey,
    updateAuthority: collection.updateAuthority,
  },
  candyGuard: {
    publicKey: guard.publicKey,
    authority: guard.authority,
    guards: guard.guards,
    groups: guard.groups,
    effectiveSignerByGroup,
  },
  warnings,
  errors,
});

const snapshotDir = process.env.GUARD_SNAPSHOT_DIR || ".guard-snapshots";
mkdirSync(snapshotDir, { recursive: true, mode: 0o700 });
const snapshotName = `guard-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
const snapshotPath = join(snapshotDir, snapshotName);
writeFileSync(snapshotPath, `${JSON.stringify(snapshot, null, 2)}\n`, { mode: 0o600 });

console.log("Candy Machine:", machine.publicKey.toString());
console.log("Candy Guard:", guard.publicKey.toString());
console.log("Authority:", guard.authority.toString());
console.log("Collection:", machine.collectionMint.toString());
console.log("Supply:", `${machine.itemsRedeemed}/${machine.data.itemsAvailable} redeemed; ${machine.itemsLoaded} loaded`);
console.log("Groups:", actualGroups.join(", ") || "none");
console.log("Default third-party signer:", defaultSigner || "missing");
if (guard.groups.length > 0) {
  console.log("Effective group signers:", JSON.stringify(effectiveSignerByGroup));
}
console.log("Snapshot:", snapshotPath);
for (const warning of warnings) console.warn("WARNING:", warning);
for (const error of errors) console.error("ERROR:", error);
if (errors.length) process.exitCode = 1;
