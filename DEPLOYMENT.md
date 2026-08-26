# Deployment

Use Vercel's current [Environment Variables documentation](https://vercel.com/docs/environment-variables) and [`vercel env` CLI reference](https://vercel.com/docs/cli/env) as the platform source of truth.

## Environment files

- `.env.example` is the complete local/reference template.
- `.env.local` contains real local-development values and is ignored by Git.
- `.env.vercel.example` contains only production runtime variables needed by Vercel.
- `.env.vercel` is the completed, ignored file you may import into Vercel.

Create the production import file:

```bash
cp .env.vercel.example .env.vercel
```

Replace every `YOUR_*` value, set the final HTTPS domain in `NEXT_PUBLIC_SITE_URL`, `RPC_ALLOWED_ORIGINS`, and `MINT_ALLOWED_ORIGINS`, and add the signer secret only when an effective `thirdPartySigner` Guard requires it. Never commit `.env.vercel`.

## Vercel dashboard deployment

1. In Vercel choose **Add New → Project** and import the GitHub repository.
2. Keep the detected framework as **Next.js**, install command `npm ci`, and build command `npm run build`.
3. Open **Project Settings → Environment Variables**.
4. Use the `.env` import/paste control and select the completed `.env.vercel` file from your machine.
5. Apply the variables to **Production**. Add a separate safe set for **Preview** if preview deployments should work.
6. Confirm that `RPC_URL` and `THIRD_PARTY_SIGNER_SECRET_KEY` do not begin with `NEXT_PUBLIC_`.
7. Deploy, attach the custom domain, update the three origin/site URL values to that final domain, and redeploy.

Git and Vercel do not automatically upload `.env.local` or `.env.vercel`. Vercel applies variable changes only to new deployments, so redeploy after every change.

## Vercel CLI alternative

After installing the Vercel CLI:

```bash
vercel link
vercel env add RPC_URL production --sensitive
vercel env ls production
vercel deploy --prod
```

Use `vercel env add VARIABLE production` for the remaining values. To download Development-scoped variables later, run:

```bash
vercel env pull .env.local
```

This direction is important: `vercel env pull` downloads values from Vercel; it does not upload `.env.local`.

`NEXT_PUBLIC_*` variables are compiled during the build. Changing one requires a new deployment.

## Minimum production variables

```env
NEXT_PUBLIC_CANDY_MACHINE_ID=YOUR_MAINNET_CORE_CANDY_MACHINE
NEXT_PUBLIC_ENVIRONMENT=mainnet-beta
NEXT_PUBLIC_SITE_URL=https://mint.example.com/
NEXT_PUBLIC_SITE_NAME="Example Collection"
NEXT_PUBLIC_SITE_DESCRIPTION="Mint an Example Collection Core asset."
NEXT_PUBLIC_DEVELOPER_FEE_ENABLED=false
NEXT_PUBLIC_ADMIN_ENABLED=false

RPC_URL=https://YOUR_PRIVATE_MAINNET_DAS_RPC
RPC_RATE_LIMIT_PER_MINUTE=180
RPC_TIMEOUT_MS=15000
RPC_ALLOWED_ORIGINS=https://mint.example.com
RPC_REQUIRE_ORIGIN=true

MINT_ALLOWED_ORIGINS=https://mint.example.com
MINT_REQUIRE_ORIGIN=true
```

If the Guard requires `thirdPartySigner`, also set:

```env
THIRD_PARTY_SIGNER_SECRET_KEY=YOUR_64_BYTE_JSON_OR_BASE58_SECRET
MINT_AUTHORIZATION_MAX_AGE_MS=120000
MINT_IP_RATE_LIMIT_PER_MINUTE=60
MINT_PAYER_RATE_LIMIT_PER_MINUTE=30
MINT_MAX_COMPUTE_UNITS=1400000
MINT_MAX_PRIORITY_FEE_MICROLAMPORTS=100000
```

Import `.env.vercel` only from your protected local machine. For stricter secret handling, omit secrets from the file and add them separately as sensitive values through the Vercel dashboard or CLI.

## Origin rules

Use comma-separated absolute origins without paths:

```env
RPC_ALLOWED_ORIGINS=https://mint.example.com,https://www.mint.example.com
MINT_ALLOWED_ORIGINS=https://mint.example.com,https://www.mint.example.com
```

The endpoint also accepts requests whose `Origin` host matches the request `Host`. Keep `RPC_REQUIRE_ORIGIN=true` and `MINT_REQUIRE_ORIGIN=true` in production.

## RPC requirements

The RPC must support normal Solana JSON-RPC plus DAS methods such as `getAsset`, `getAssetsByOwner`, and `searchAssets`. Keep the credential only in `RPC_URL`; browser code uses `/api/rpc`.

The serverless in-memory rate limiter resets on cold starts and applies per warm instance. It is suitable as a first layer on Vercel Hobby, not as a global quota. Set provider-side request caps and spending alerts. Use a distributed rate limiter or Vercel Firewall when a hard deployment-wide limit is required.

## Health checks

After deployment:

```text
GET https://mint.example.com/api/mint/health
```

- `ready`: signer loads and matches the effective on-chain Guard configuration;
- `standby`: service is configured but the Guard has not yet been switched to this signer;
- `unavailable`: missing/invalid secret, RPC failure, wrong machine, or Guard mismatch.

The UI disables signer-protected minting unless health is `ready`.

## Recommended signer activation sequence

1. Deploy the new signer secret and confirm `standby`.
2. Run `npm run guard:third-party` locally as a dry run.
3. Apply the Guard update using the real authority and exact-address confirmation.
4. Confirm `/api/mint/health` reports `ready`.
5. Execute one authorized devnet mint or mainnet simulation using the final transaction shape.
6. Monitor server logs, RPC quota, failed simulations, and Guard snapshots.

## CI and repository publication

The included GitHub Actions workflow runs lint, typecheck, tests, security shape checks, and a production build on supported Node versions. Before pushing a new public repository:

```bash
git status
git grep -n -i "private-key\|secret-key\|your-real-domain"
npm run check
npm run security:audit
npm run build
```

Confirm that only `.env.example` and `.env.vercel.example` are tracked and no completed environment file, wallet, keypair, cache, or snapshot appears in `git ls-files`.

## Rollback

Keep the last known-good Vercel deployment and Guard snapshot. Rolling back only the website does not roll back the on-chain Candy Guard. If signer configuration changes, coordinate the server deployment and Guard update so there is never a window where the active signer has no working service.
