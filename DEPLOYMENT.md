# Deployment

## Vercel

1. Push this repository to a private GitHub repository first.
2. Import it into Vercel as a Next.js project.
3. Keep the default install command `npm ci` and build command `npm run build`.
4. Add the public and server-only variables listed below to the Production environment.
5. Deploy, test the generated Vercel URL, then attach the custom domain.
6. Update `NEXT_PUBLIC_SITE_URL`, `RPC_ALLOWED_ORIGINS`, and `MINT_ALLOWED_ORIGINS` to the final HTTPS origin and redeploy.

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

Do not import a production secret file into Vercel from a public or shared location. Enter secrets directly through Vercel or its approved secret-management integration.

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

Confirm that only `.env.example` is tracked and no wallet/keypair/cache/snapshot files appear in `git ls-files`.

## Rollback

Keep the last known-good Vercel deployment and Guard snapshot. Rolling back only the website does not roll back the on-chain Candy Guard. If signer configuration changes, coordinate the server deployment and Guard update so there is never a window where the active signer has no working service.
