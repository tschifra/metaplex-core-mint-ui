import type { NextApiRequest, NextApiResponse } from "next";
import { ed25519 } from "@noble/curves/ed25519";
import {
  ComputeBudgetInstruction,
  ComputeBudgetProgram,
  Connection,
  PublicKey,
  SYSVAR_INSTRUCTIONS_PUBKEY,
  SYSVAR_SLOT_HASHES_PUBKEY,
  SystemInstruction,
  SystemProgram,
  TransactionInstruction,
  VersionedTransaction,
} from "@solana/web3.js";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import {
  MPL_CORE_CANDY_GUARD_PROGRAM_ID,
  MPL_CORE_CANDY_MACHINE_CORE_PROGRAM_ID,
  fetchCandyMachine,
  findCandyMachineAuthorityPda,
  mplCandyMachine,
  safeFetchCandyGuard,
} from "@metaplex-foundation/mpl-core-candy-machine";
import { MPL_CORE_PROGRAM_ID } from "@metaplex-foundation/mpl-core";
import { isSome, publicKey } from "@metaplex-foundation/umi";
import {
  DEVELOPER_FEE_LAMPORTS,
  DEVELOPER_FEE_RECIPIENT,
  isDeveloperFeeEnabled,
} from "../../../utils/developerFee";
import { loadThirdPartySigner } from "../../../utils/server/thirdPartySigner";
import {
  consumeMintSubmissionKey,
  getMintAuthorizationMaxAge,
} from "../../../utils/server/mintAuthorizationCore";
import { consumeMintRateLimit } from "../../../utils/server/mintRateLimitCore";
import { mintSimulationCreatedAsset } from "../../../utils/server/mintSimulationCore";

const MINT_V1_DISCRIMINATOR = "9162c076b8937668";

type ApiResult = { signature: string } | { error: string };

function fail(message: string, status = 400): never {
  const error = new Error(message) as Error & { status?: number };
  error.status = status;
  throw error;
}

function getFeeConfig() {
  const recipient = new PublicKey(DEVELOPER_FEE_RECIPIENT);
  const lamports = isDeveloperFeeEnabled() ? BigInt(DEVELOPER_FEE_LAMPORTS) : BigInt(0);
  return { recipient, lamports };
}

function enforceSameOrigin(req: NextApiRequest) {
  const origin = req.headers.origin;
  const host = req.headers.host;
  const requireOrigin = process.env.MINT_REQUIRE_ORIGIN === "true" ||
    (process.env.MINT_REQUIRE_ORIGIN !== "false" && process.env.NODE_ENV === "production");
  if (!origin || !host) {
    if (requireOrigin) fail("Request origin is required", 403);
    return;
  }
  let originUrl: URL;
  try {
    originUrl = new URL(origin);
  } catch {
    fail("Invalid request origin", 403);
  }
  const allowed = (process.env.MINT_ALLOWED_ORIGINS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => {
      try {
        return new URL(value).origin;
      } catch {
        fail("Mint origin configuration is invalid", 503);
      }
    });
  if (originUrl.host !== host && !allowed.includes(originUrl.origin)) {
    fail("Request origin is not allowed", 403);
  }
}

function getClientIp(req: NextApiRequest): string {
  const forwarded = req.headers["x-vercel-forwarded-for"] || req.headers["x-forwarded-for"];
  return String(forwarded || req.socket.remoteAddress || "unknown").split(",")[0].trim();
}

function enforceRateLimit(req: NextApiRequest, res: NextApiResponse, payer: string) {
  let rate;
  try {
    rate = consumeMintRateLimit(getClientIp(req), payer);
  } catch {
    fail("Mint rate-limit configuration is invalid", 503);
  }
  if (!rate.allowed) {
    res.setHeader("Retry-After", String(rate.retryAfter));
    fail(`Too many mint authorization requests for this ${rate.scope}`, 429);
  }
}

function getSubmissionReplayWindow(): number {
  try {
    return getMintAuthorizationMaxAge();
  } catch {
    fail("Mint authorization timing configuration is invalid", 503);
  }
}

function parseMintGroup(data: Uint8Array): string {
  const bytes = Buffer.from(data);
  if (bytes.length < 13 || bytes.subarray(0, 8).toString("hex") !== MINT_V1_DISCRIMINATOR) {
    fail("Invalid Candy Guard MintV1 data");
  }
  const mintArgsLength = bytes.readUInt32LE(8);
  if (mintArgsLength > 1024) fail("Candy Guard mint arguments are too large");
  const optionOffset = 12 + mintArgsLength;
  if (optionOffset >= bytes.length) fail("Truncated Candy Guard MintV1 data");
  const groupOption = bytes[optionOffset];
  if (groupOption === 0) {
    if (optionOffset + 1 !== bytes.length) fail("Unexpected trailing MintV1 data");
    return "default";
  }
  if (groupOption !== 1 || optionOffset + 5 > bytes.length) {
    fail("Invalid Candy Guard group encoding");
  }
  const groupLength = bytes.readUInt32LE(optionOffset + 1);
  const groupStart = optionOffset + 5;
  if (groupStart + groupLength !== bytes.length || groupLength === 0 || groupLength > 6) {
    fail("Invalid Candy Guard group label");
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes.subarray(groupStart));
  } catch {
    fail("Candy Guard group label is not valid UTF-8");
  }
}

function parseBoundedInteger(name: string, fallback: number, min: number, max: number): number {
  const raw = process.env[name];
  const value = raw === undefined || raw.trim() === "" ? fallback : Number(raw);
  if (!Number.isSafeInteger(value) || value < min || value > max) {
    fail(`${name} configuration is invalid`, 503);
  }
  return value;
}

function validateComputeBudget(instructions: TransactionInstruction[]) {
  const computeInstructions = instructions.filter((instruction) =>
    instruction.programId.equals(ComputeBudgetProgram.programId)
  );
  if (computeInstructions.length !== 2 || instructions.slice(0, 2).some(
    (instruction) => !instruction.programId.equals(ComputeBudgetProgram.programId)
  )) {
    fail("Transaction must begin with the canonical compute budget instructions");
  }

  const maxUnits = parseBoundedInteger("MINT_MAX_COMPUTE_UNITS", 1_400_000, 200_000, 1_400_000);
  const maxPrice = BigInt(parseBoundedInteger(
    "MINT_MAX_PRIORITY_FEE_MICROLAMPORTS",
    100_000,
    0,
    10_000_000
  ));
  let sawLimit = false;
  let sawPrice = false;
  for (const instruction of computeInstructions) {
    if (instruction.keys.length !== 0) fail("Compute budget instructions must not reference accounts");
    let type;
    try {
      type = ComputeBudgetInstruction.decodeInstructionType(instruction);
    } catch {
      fail("Invalid compute budget instruction");
    }
    if (type === "SetComputeUnitLimit" && !sawLimit) {
      const { units } = ComputeBudgetInstruction.decodeSetComputeUnitLimit(instruction);
      if (units < 1 || units > maxUnits) fail("Compute unit limit exceeds server policy");
      sawLimit = true;
    } else if (type === "SetComputeUnitPrice" && !sawPrice) {
      const { microLamports } = ComputeBudgetInstruction.decodeSetComputeUnitPrice(instruction);
      if (BigInt(microLamports) > maxPrice) fail("Priority fee exceeds server policy");
      sawPrice = true;
    } else {
      fail("Duplicate or unsupported compute budget instruction");
    }
  }
  if (!sawLimit || !sawPrice) fail("Transaction is missing a compute budget policy instruction");
}

async function handler(req: NextApiRequest, res: NextApiResponse<ApiResult>) {
  try {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return res.status(405).json({ error: "Method not allowed" });
    }
    if (!String(req.headers["content-type"] || "").toLowerCase().startsWith("application/json")) {
      fail("Content-Type must be application/json", 415);
    }
    enforceSameOrigin(req);

    const encoded = req.body?.transaction;
    const payerText = req.body?.payer;
    if (typeof encoded !== "string" || encoded.length > 4096 || typeof payerText !== "string") {
      fail("Invalid request body");
    }
    let payer: PublicKey;
    try {
      payer = new PublicKey(payerText);
    } catch {
      fail("Invalid payer address");
    }
    enforceRateLimit(req, res, payer.toBase58());

    let transaction: VersionedTransaction;
    try {
      transaction = VersionedTransaction.deserialize(Buffer.from(encoded, "base64"));
    } catch {
      fail("Invalid serialized transaction");
    }
    const rpc = process.env.RPC_URL;
    const candyMachineText = process.env.NEXT_PUBLIC_CANDY_MACHINE_ID;
    if (!rpc || !candyMachineText) fail("Server mint configuration is incomplete", 503);

    const connection = new Connection(rpc, "confirmed");
    let signer;
    try {
      signer = loadThirdPartySigner();
    } catch {
      fail("Server signer configuration is invalid", 503);
    }
    const message = transaction.message;
    if (!message.staticAccountKeys[0]?.equals(payer)) fail("Payer does not match the request");
    if (message.header.numRequiredSignatures !== 3 || transaction.signatures.length !== 3) {
      fail("Unexpected signer set");
    }

    const signerIndex = message.staticAccountKeys
      .slice(0, message.header.numRequiredSignatures)
      .findIndex((key) => key.equals(signer.publicKey));
    if (signerIndex < 0 || transaction.signatures[signerIndex].some((byte) => byte !== 0)) {
      fail("Transaction is not awaiting the configured server signer");
    }

    const serializedMessage = message.serialize();
    for (let index = 0; index < message.header.numRequiredSignatures; index++) {
      if (index === signerIndex) continue;
      const signature = transaction.signatures[index];
      const key = message.staticAccountKeys[index];
      if (signature.every((byte) => byte === 0) || !ed25519.verify(signature, serializedMessage, key.toBytes())) {
        fail("A required client signature is missing or invalid");
      }
    }

    const configuredLookupTable = process.env.NEXT_PUBLIC_LUT?.trim();
    if (message.addressTableLookups.length > 1) {
      fail("Transaction uses too many address lookup tables");
    }
    if (message.addressTableLookups.length === 1) {
      let expectedLookupTable: PublicKey;
      try {
        if (!configuredLookupTable) fail("Address lookup tables are not enabled for this sale");
        expectedLookupTable = new PublicKey(configuredLookupTable);
      } catch (error) {
        if (error instanceof Error && "status" in error) throw error;
        fail("Configured address lookup table is invalid", 503);
      }
      if (!message.addressTableLookups[0].accountKey.equals(expectedLookupTable)) {
        fail("Transaction uses an unauthorized address lookup table");
      }
    }
    const lookupAccounts = await Promise.all(message.addressTableLookups.map(async (lookup) => {
      const response = await connection.getAddressLookupTable(lookup.accountKey);
      if (!response.value) fail("An address lookup table is unavailable");
      return response.value;
    }));
    const accountKeys = message.getAccountKeys({ addressLookupTableAccounts: lookupAccounts });
    const keyAt = (index: number) => {
      const key = accountKeys.get(index);
      if (!key) fail("Transaction references an invalid account index");
      return key;
    };
    const toInstruction = (compiled: (typeof message.compiledInstructions)[number]) =>
      new TransactionInstruction({
        programId: keyAt(compiled.programIdIndex),
        keys: compiled.accountKeyIndexes.map((index) => ({
          pubkey: keyAt(index),
          isSigner: message.isAccountSigner(index),
          isWritable: message.isAccountWritable(index),
        })),
        data: Buffer.from(compiled.data),
      });

    const guardProgram = new PublicKey(MPL_CORE_CANDY_GUARD_PROGRAM_ID);
    const allowedPrograms = new Set([
      ComputeBudgetProgram.programId.toBase58(),
      SystemProgram.programId.toBase58(),
      guardProgram.toBase58(),
    ]);
    const instructions = message.compiledInstructions.map(toInstruction);
    if (instructions.length < 2 || !instructions[instructions.length - 1].programId.equals(guardProgram)) {
      fail("The direct Candy Guard mint must be the final instruction");
    }
    if (instructions.some((instruction) => !allowedPrograms.has(instruction.programId.toBase58()))) {
      fail("Transaction contains an unauthorized top-level program");
    }
    validateComputeBudget(instructions);
    const mintInstructions = instructions.filter((instruction) => instruction.programId.equals(guardProgram));
    if (mintInstructions.length !== 1 || Buffer.from(mintInstructions[0].data).subarray(0, 8).toString("hex") !== MINT_V1_DISCRIMINATOR) {
      fail("Transaction must contain exactly one Candy Guard MintV1 instruction");
    }

    const { recipient, lamports } = getFeeConfig();
    const systemInstructions = instructions.filter((instruction) => instruction.programId.equals(SystemProgram.programId));
    if (systemInstructions.length !== (lamports > BigInt(0) ? 1 : 0)) {
      fail("Transaction has an unexpected developer fee transfer");
    }
    if (lamports > BigInt(0)) {
      let transfer;
      try {
        transfer = SystemInstruction.decodeTransfer(systemInstructions[0]);
      } catch {
        fail("Developer fee instruction is not a SOL transfer");
      }
      if (!transfer.fromPubkey.equals(payer) || !transfer.toPubkey.equals(recipient) || BigInt(transfer.lamports) !== lamports) {
        fail("Developer fee transfer does not match the disclosed configuration");
      }
    }
    const expectedMintIndex = lamports > BigInt(0) ? 3 : 2;
    if (instructions.length !== expectedMintIndex + 1 ||
        (lamports > BigInt(0) && !instructions[2].programId.equals(SystemProgram.programId))) {
      fail("Transaction instruction order does not match the canonical mint flow");
    }

    const mintInstruction = mintInstructions[0];
    if (mintInstruction.keys.length < 14) fail("Mint instruction is missing required accounts");
    const candyMachine = new PublicKey(candyMachineText);
    const umi = createUmi(rpc).use(mplCandyMachine());
    const machine = await fetchCandyMachine(umi, publicKey(candyMachineText));
    const candyGuard = await safeFetchCandyGuard(umi, machine.mintAuthority);
    if (!candyGuard) fail("Candy Guard account is unavailable", 503);

    if (!new PublicKey(machine.mintAuthority.toString()).equals(
      new PublicKey(candyGuard.publicKey.toString())
    )) {
      fail("Candy Machine is not wrapped by the fetched Candy Guard", 503);
    }
    const [authorityPda] = findCandyMachineAuthorityPda(umi, {
      candyMachine: publicKey(candyMachineText),
    });
    const expectedFixedAccounts = [
      { key: new PublicKey(candyGuard.publicKey.toString()), signer: false, writable: false },
      { key: new PublicKey(MPL_CORE_CANDY_MACHINE_CORE_PROGRAM_ID), signer: false, writable: false },
      { key: candyMachine, signer: false, writable: true },
      { key: new PublicKey(authorityPda.toString()), signer: false, writable: true },
      { key: payer, signer: true, writable: true },
      { key: payer, signer: true, writable: true },
      { key: guardProgram, signer: false, writable: false },
      { key: undefined, signer: true, writable: true },
      { key: new PublicKey(machine.collectionMint.toString()), signer: false, writable: true },
      { key: new PublicKey(MPL_CORE_PROGRAM_ID), signer: false, writable: false },
      { key: SystemProgram.programId, signer: false, writable: false },
      { key: SYSVAR_INSTRUCTIONS_PUBKEY, signer: false, writable: false },
      { key: SYSVAR_SLOT_HASHES_PUBKEY, signer: false, writable: false },
    ] as const;
    if (mintInstruction.keys.length < expectedFixedAccounts.length) {
      fail("Mint instruction is missing required fixed accounts");
    }
    for (let index = 0; index < expectedFixedAccounts.length; index++) {
      const actual = mintInstruction.keys[index];
      const expected = expectedFixedAccounts[index];
      if ((expected.key && !actual.pubkey.equals(expected.key)) ||
          actual.isSigner !== expected.signer || actual.isWritable !== expected.writable) {
        fail(`Mint instruction fixed account ${index} does not match the canonical sale`);
      }
    }
    const asset = mintInstruction.keys[7].pubkey;
    const assetSignerIndex = message.staticAccountKeys
      .slice(0, message.header.numRequiredSignatures)
      .findIndex((key) => key.equals(asset));
    if (assetSignerIndex < 0 || asset.equals(payer) || asset.equals(signer.publicKey)) {
      fail("Mint asset must be a fresh, independently signed account");
    }
    const requiredSignerKeys = new Set(message.staticAccountKeys
      .slice(0, message.header.numRequiredSignatures)
      .map((key) => key.toBase58()));
    if (requiredSignerKeys.size !== 3 || !requiredSignerKeys.has(payer.toBase58()) ||
        !requiredSignerKeys.has(asset.toBase58()) || !requiredSignerKeys.has(signer.publicKey.toBase58())) {
      fail("Transaction required signers do not match payer, asset, and authorization signer");
    }
    const signerMeta = mintInstruction.keys.find((account, index) =>
      index >= expectedFixedAccounts.length && account.pubkey.equals(signer.publicKey)
    );
    if (!signerMeta?.isSigner || !signerMeta.isWritable) {
      fail("Third-party signer account meta is missing or invalid");
    }

    const groupLabel = parseMintGroup(mintInstruction.data);
    const group = groupLabel === "default"
      ? undefined
      : candyGuard.groups.find((candidate) => candidate.label === groupLabel);
    if (groupLabel === "default" && candyGuard.groups.length > 0) {
      fail("A Candy Guard group is required for this sale");
    }
    if (groupLabel !== "default" && !group) fail("Mint uses an unknown guard group");
    const groupSigner = group?.guards.thirdPartySigner;
    const activeSigner = groupSigner && isSome(groupSigner)
      ? groupSigner
      : candyGuard.guards.thirdPartySigner;
    if (!isSome(activeSigner) || activeSigner.value.signerKey.toString() !== signer.publicKey.toBase58()) {
      fail("Configured wallet is not the active third-party signer", 503);
    }

    const blockhashStatus = await connection.isBlockhashValid(
      message.recentBlockhash,
      { commitment: "confirmed" }
    );
    if (!blockhashStatus.value) {
      fail("Transaction blockhash expired; approve a fresh transaction", 409);
    }

    const replayWindow = getSubmissionReplayWindow();
    const submissionKey = `${payer.toBase58()}:${Buffer.from(
      transaction.signatures[0]
    ).toString("base64url")}`;
    if (!consumeMintSubmissionKey(submissionKey, Date.now() + replayWindow)) {
      fail("This signed mint transaction has already been submitted", 409);
    }

    transaction.sign([signer]);
    const simulation = await connection.simulateTransaction(transaction, {
      commitment: "processed",
      sigVerify: true,
      accounts: {
        encoding: "base64",
        addresses: [asset.toBase58()],
      },
    });
    if (!mintSimulationCreatedAsset(simulation.value)) {
      const botTaxTriggered = simulation.value.logs?.some((log) =>
        log.includes("Candy Guard Botting is taxed")
      );
      if (botTaxTriggered) {
        fail("Candy Guard rejected the mint; the bot-tax transaction was not broadcast", 422);
      }
      if (simulation.value.err) {
        fail(`Mint simulation failed: ${JSON.stringify(simulation.value.err)}`, 422);
      }
      fail("Mint simulation completed without creating the requested asset", 422);
    }
    // The exact signed bytes were just simulated with signature verification.
    // Re-running RPC preflight here duplicates that work; the validator still
    // executes all on-chain Candy Guard checks when processing the transaction.
    const signature = await connection.sendRawTransaction(transaction.serialize(), {
      skipPreflight: true,
      maxRetries: 3,
    });
    return res.status(200).json({ signature });
  } catch (caught) {
    const error = caught as Error & { status?: number };
    const status = error.status && error.status >= 400 && error.status < 600 ? error.status : 500;
    const message = status === 500 ? "Mint authorization service failed" : error.message;
    return res.status(status).json({ error: message });
  }
}

export const config = { api: { bodyParser: { sizeLimit: "8kb" } } };
export default handler;
