# Security

## Security boundary

The Candy Machine and Candy Guard enforce mint authorization on-chain. Browser eligibility, hidden buttons, displayed prices, and group names are not security controls.

When `thirdPartySigner` is active, `/api/mint/submit` additionally enforces a narrow transaction shape before signing:

- expected Candy Machine, Guard, Core collection, programs, accounts, and signer set;
- valid buyer and asset signatures;
- one fresh authorization memo and nonce;
- bounded compute units and priority fee;
- optional exact developer-fee transfer;
- one final Core Candy Guard `MintV1` instruction;
- approved lookup table and no unrelated top-level programs;
- successful RPC simulation before broadcast.

The server sends the signed transaction directly and never returns a reusable signer signature.

## Secrets

- Never commit `.env`, `.env*.local`, `.env.vercel`, `wallet.json`, keypair files, Guard snapshots, or Vercel state. Only placeholder templates such as `.env.example` and `.env.vercel.example` may be tracked.
- Never put RPC credentials or key material in `NEXT_PUBLIC_*` variables.
- Use a dedicated third-party signer with no authority or treasury role.
- Store production secrets in Vercel or an approved secret manager.
- Rotate a signer by deploying the new service first, then updating every effective Guard group.
- Treat historical Git commits as public once pushed; deleting a file in a later commit does not remove the old secret.

## RPC proxy

`/api/rpc` permits only the Solana/DAS methods used by the application, validates parameter sizes, limits batch size and response size, enforces origin policy, and charges weighted in-memory rate-limit costs.

The proxy is not a general-purpose private RPC gateway. Do not add administrative or airdrop methods. Serverless local rate limits are not global; configure provider quotas and alerts.

## Admin UI

The admin button is feature-flagged and shown only when the connected wallet equals the Candy Machine authority. That UI can send authority operations after explicit wallet approval. Keep it disabled on public deployments unless needed, verify every destination/address, and use a hardware-backed authority where possible.

## Guard risks

- `botTax` can charge users for invalid attempts; test all eligibility paths before enabling it.
- burn/payment Guards are destructive or transfer assets; require explicit selection and test destinations.
- freeze Guards require correct initialization and later thaw/withdraw operations.
- Allow List addresses compiled into the browser are public.
- Gatekeeper needs an external token-acquisition integration.
- Custom and Token-2022 Guard behavior must be tested for the exact deployed programs/extensions.
- A third-party signer is authorization, not randomness.

## Fair mint claims

Do not describe config-line selection as cryptographically random. For fairness-sensitive launches use hidden settings, a precommitted reveal hash, a documented reveal process, and tests against the exact deployed Core Candy Machine version.

## Required checks

```bash
npm run check
npm run security:audit
npm run security:mint-shape
npm run build
npm run guard:check
```

`security:audit` fails on critical production dependency vulnerabilities. Lower-severity upstream findings still require review before release.

### Current transitive audit baseline

As of 2026-08-26, `npm audit --omit=dev` reports four high-severity paths to `image-size@1.2.1` through React Native/Metro packages pulled in by `@solana/wallet-adapter-react` → `@solana-mobile/wallet-adapter-mobile`. The advisories cover crafted [ICNS](https://github.com/advisories/GHSA-w3rx-r6r6-pgpr) and [JXL/HEIF](https://github.com/advisories/GHSA-5p2g-fcmc-qvqq) denial-of-service loops. This web application does not call Metro or `image-size` and does not parse user-supplied files with them, but the packages remain in the dependency tree and npm currently offers no applicable lockfile fix. Re-check on every dependency update and remove this exception when the Solana Mobile/Metro chain publishes a patched resolution.

## Reporting vulnerabilities

Before making this repository public, replace this section with the project’s private security contact or GitHub Security Advisory process. Do not request wallet seed phrases, private keys, or live unauthorized transactions in a vulnerability report.
