# Environment configuration

Copy `.env.example` to an ignored `.env.local` for development. In production, configure the same values in the hosting platform.

Every variable beginning with `NEXT_PUBLIC_` is embedded into browser JavaScript at build time. It is public even when entered through Vercel. `RPC_URL`, signer secrets, and authority paths are server-only and must never use that prefix.

## Required public values

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_CANDY_MACHINE_ID` | Core Candy Machine address used by the UI and signing service. |
| `NEXT_PUBLIC_ENVIRONMENT` | `devnet` or `mainnet-beta`; controls explorer links and must match the RPC/machine. |
| `NEXT_PUBLIC_SITE_URL` | Canonical absolute deployment URL, including scheme. |
| `NEXT_PUBLIC_SITE_NAME` | Page heading, title, and social title. |
| `NEXT_PUBLIC_SITE_DESCRIPTION` | Search and social description. |

## Mint behavior

| Variable | Default | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_MULTIMINT` | `false` | Enables quantity selection. |
| `NEXT_PUBLIC_MAXMINTAMOUNT` | `1` | Maximum per click, from 1 through 15. On-chain limits still apply. |
| `NEXT_PUBLIC_GUARD_SELECTION_MODE` | `all` | `all` shows eligible groups; `best` selects the cheapest eligible group. |
| `NEXT_PUBLIC_GUARD_LABELS` | empty | Comma-separated `label:Display Name` mapping. |
| `NEXT_PUBLIC_MINT_PRICE` | none | Display fallback only; it does not change the on-chain Guard price. |
| `NEXT_PUBLIC_MICROLAMPORTS` | `1001` | Compute-unit price used when building transactions. |
| `NEXT_PUBLIC_MINT_PROGRESS_MIN_MS` | `3000` | Minimum progress artwork duration, 0–60000 ms. Confirmation time counts toward it. |
| `NEXT_PUBLIC_LUT` | empty | Optional address lookup table created for the current machine/Guard. |
| `NEXT_PUBLIC_ADMIN_ENABLED` | `false` | Enables authority-only administration UI. |
| `NEXT_PUBLIC_DEVELOPER_FEE_ENABLED` | `false` | Includes the disclosed fixed fee from `utils/developerFee.ts`. |

## Branding and media

| Variable | Default |
| --- | --- |
| `NEXT_PUBLIC_SOCIAL_PREVIEW_IMAGE` | `/social-preview.webp` |
| `NEXT_PUBLIC_HERO_IMAGE` | `/hero.webp` |
| `NEXT_PUBLIC_WORKING_IMAGE` | `/minting.svg` |
| `NEXT_PUBLIC_BACKGROUND_VIDEO` | empty |
| `NEXT_PUBLIC_FAVICON_URL` | `/icon.svg` |
| `NEXT_PUBLIC_APPLE_TOUCH_ICON_URL` | `/icon.svg` |
| `NEXT_PUBLIC_ICON_192_URL` | `/icon.svg` |
| `NEXT_PUBLIC_ICON_512_URL` | `/icon.svg` |
| `NEXT_PUBLIC_FONT_PRESET` | `audiowide`; also accepts `system` or `mono` |

Media may use a site-relative file under `public/` or an absolute HTTPS URL. `NEXT_PUBLIC_SOCIAL_PREVIEW_IMAGE` is normalized to an absolute URL.

Optional content and links:

```env
NEXT_PUBLIC_SHOW_COLLECTION_INFO=false
NEXT_PUBLIC_COLLECTION_DESCRIPTION="Describe the collection."
NEXT_PUBLIC_CREATOR_NAME="Collection Creator"
NEXT_PUBLIC_CREATOR_IMAGE=
NEXT_PUBLIC_COLLECTION_VERIFIED=false
NEXT_PUBLIC_TWITTER_URL=
NEXT_PUBLIC_DISCORD_URL=
NEXT_PUBLIC_WEBSITE_URL=
NEXT_PUBLIC_TWITTER_HANDLE=
NEXT_PUBLIC_SHARE_HASHTAGS=SolanaNFT,NFT,MetaplexCore
```

## RPC proxy

```env
RPC_URL=https://YOUR_PRIVATE_DAS_ENABLED_RPC
RPC_RATE_LIMIT_PER_MINUTE=180
RPC_TIMEOUT_MS=15000
RPC_ALLOWED_ORIGINS=https://mint.example.com
RPC_REQUIRE_ORIGIN=true
```

`RPC_URL` stays on the server. The browser calls `/api/rpc`, whose method allowlist includes required Solana reads/submission and DAS methods. `RPC_ALLOWED_ORIGINS` is comma-separated. Same-origin requests are accepted automatically; list additional canonical origins only when required.

The built-in counter is instance-local. It protects a warm function instance but is not a deployment-wide quota. Configure upstream RPC quotas or a hosting firewall when hard global limits are required.

## Mint authorization service

Only required when an effective on-chain `thirdPartySigner` Guard is present:

```env
THIRD_PARTY_SIGNER_SECRET_KEY=
# Local alternative; set one source only:
# THIRD_PARTY_SIGNER_KEYPAIR_PATH=/absolute/protected/path/signer.json

MINT_AUTHORIZATION_MAX_AGE_MS=120000
MINT_IP_RATE_LIMIT_PER_MINUTE=60
MINT_PAYER_RATE_LIMIT_PER_MINUTE=30
MINT_MAX_COMPUTE_UNITS=1400000
MINT_MAX_PRIORITY_FEE_MICROLAMPORTS=100000
MINT_ALLOWED_ORIGINS=https://mint.example.com
MINT_REQUIRE_ORIGIN=true
```

`THIRD_PARTY_SIGNER_SECRET_KEY` accepts a JSON array of exactly 64 bytes or a base58-encoded 64-byte keypair. `MINT_RATE_LIMIT_PER_MINUTE` remains a legacy fallback; the separate IP and payer limits take precedence.

## Guard audit and update variables

These are for local scripts, not the browser:

```env
THIRD_PARTY_SIGNER_PUBLIC_KEY=
GUARD_REQUIRE_THIRD_PARTY_SIGNER=false
CANDY_GUARD_EXPECTED_AUTHORITY=
CANDY_MACHINE_EXPECTED_COLLECTION=
CANDY_GUARD_EXPECTED_GROUPS=
CANDY_GUARD_PUBLIC_GROUP_LABEL=

CANDY_GUARD_AUTHORITY_KEYPAIR_PATH=/absolute/protected/path/authority.json
CANDY_GUARD_CONFIRM_ADDRESS=
APPLY=false
```

`guard:check` uses the expectation values to fail on configuration drift. `guard:third-party` never mutates the Guard unless `APPLY=true`, the authority key matches, and the exact fetched Guard address is confirmed.

## Safe local example

```env
NEXT_PUBLIC_CANDY_MACHINE_ID=YOUR_DEVNET_CORE_CANDY_MACHINE
NEXT_PUBLIC_ENVIRONMENT=devnet
NEXT_PUBLIC_SITE_URL=http://localhost:3000/
NEXT_PUBLIC_SITE_NAME="Example Core Collection"
NEXT_PUBLIC_SITE_DESCRIPTION="Devnet mint test"
NEXT_PUBLIC_MULTIMINT=false
NEXT_PUBLIC_GUARD_SELECTION_MODE=all
NEXT_PUBLIC_ADMIN_ENABLED=false
NEXT_PUBLIC_DEVELOPER_FEE_ENABLED=false

RPC_URL=https://YOUR_DEVNET_DAS_RPC
RPC_REQUIRE_ORIGIN=false
MINT_REQUIRE_ORIGIN=false
```

Never commit the resulting `.env.local`.
