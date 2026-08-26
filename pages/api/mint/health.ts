import type { NextApiRequest, NextApiResponse } from "next";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import {
  fetchCandyMachine,
  mplCandyMachine,
  safeFetchCandyGuard,
} from "@metaplex-foundation/mpl-core-candy-machine";
import { isSome, publicKey } from "@metaplex-foundation/umi";
import { loadThirdPartySigner } from "../../../utils/server/thirdPartySigner";

type HealthBody = {
  ok: boolean;
  status: "ready" | "standby" | "unavailable";
};

type CachedHealth = {
  expiresAt: number;
  body: HealthBody;
};

let cachedHealth: CachedHealth | undefined;
let healthRequest: Promise<HealthBody> | undefined;

function isSameOrigin(req: NextApiRequest): boolean {
  const origin = req.headers.origin;
  const host = req.headers.host;
  if (!origin || !host) return true;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

async function inspectMintService(): Promise<HealthBody> {
  const rpc = process.env.RPC_URL;
  const candyMachineId = process.env.NEXT_PUBLIC_CANDY_MACHINE_ID;
  if (!rpc || !candyMachineId) return { ok: false, status: "unavailable" };

  try {
    const signer = loadThirdPartySigner();
    const umi = createUmi(rpc).use(mplCandyMachine());
    const machine = await fetchCandyMachine(umi, publicKey(candyMachineId));
    const guard = await safeFetchCandyGuard(umi, machine.mintAuthority);
    if (!guard) return { ok: false, status: "unavailable" };
    if (machine.mintAuthority.toString() !== guard.publicKey.toString()) {
      return { ok: false, status: "unavailable" };
    }

    const defaultSigner = guard.guards.thirdPartySigner;
    const configured = isSome(defaultSigner) &&
      defaultSigner.value.signerKey.toString() === signer.publicKey.toBase58() &&
      guard.groups.every((group) => {
        const groupSigner = group.guards.thirdPartySigner;
        const effectiveSigner = isSome(groupSigner) ? groupSigner : defaultSigner;
        return isSome(effectiveSigner) &&
          effectiveSigner.value.signerKey.toString() === signer.publicKey.toBase58();
      });
    return configured
      ? { ok: true, status: "ready" }
      : { ok: false, status: "standby" };
  } catch {
    return { ok: false, status: "unavailable" };
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<HealthBody | { error: string }>
) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!isSameOrigin(req)) return res.status(403).json({ error: "Origin not allowed" });

  const now = Date.now();
  if (!cachedHealth || cachedHealth.expiresAt <= now) {
    const timeoutMs = Math.min(15_000, Math.max(3_000, Number(process.env.RPC_TIMEOUT_MS || "10000")));
    if (!healthRequest) {
      healthRequest = new Promise<HealthBody>((resolve) => {
        const timeout = setTimeout(
          () => resolve({ ok: false, status: "unavailable" }),
          timeoutMs
        );
        inspectMintService().then(resolve).finally(() => clearTimeout(timeout));
      }).finally(() => {
        healthRequest = undefined;
      });
    }
    const body = await healthRequest;
    cachedHealth = { body, expiresAt: now + 15_000 };
  }

  return res.status(cachedHealth.body.ok ? 200 : 503).json(cachedHealth.body);
}
