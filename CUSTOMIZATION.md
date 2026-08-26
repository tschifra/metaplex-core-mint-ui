# Customization

Normal collection customization should require environment variables and replacing files under `public/`, not editing transaction code.

## Branding

Set:

```env
NEXT_PUBLIC_SITE_URL=https://mint.example.com/
NEXT_PUBLIC_SITE_NAME="Example Collection"
NEXT_PUBLIC_SITE_DESCRIPTION="Mint an Example Collection Core asset."
NEXT_PUBLIC_TWITTER_URL=https://x.com/example
NEXT_PUBLIC_DISCORD_URL=https://discord.gg/example
NEXT_PUBLIC_WEBSITE_URL=https://example.com
NEXT_PUBLIC_TWITTER_HANDLE=example
NEXT_PUBLIC_SHARE_HASHTAGS=Example,SolanaNFT,MetaplexCore
```

Empty social URLs hide their buttons.

## Images and video

The repository contains neutral defaults:

- `public/hero.webp` — main collection preview;
- `public/minting.svg` — mint progress artwork;
- `public/social-preview.webp` — 1200×630 share preview;
- `public/icon.svg` — browser/app icon.

The default raster artwork was generated specifically for this template and the animated SVG/icon were created directly for it. See `ASSET_PROVENANCE.md` for the prompts and asset record.

Replace them while keeping the filenames, or point environment variables to different site-relative/absolute HTTPS URLs. `NEXT_PUBLIC_WORKING_IMAGE` can be a GIF if the collection wants an animated mint screen. Set `NEXT_PUBLIC_BACKGROUND_VIDEO` to an MP4/WebM URL or leave it empty.

Keep assets optimized: large background video and GIF files dominate mobile load time.

## Fonts

```env
NEXT_PUBLIC_FONT_PRESET=audiowide
```

Supported presets are `audiowide`, `system`, and `mono`. Further typography changes belong in `pages/_app.tsx` and the Chakra theme.

## Guard display names

On-chain group labels are short identifiers. Map them to readable names:

```env
NEXT_PUBLIC_GUARD_LABELS=wl:Allowlist Mint,vip:VIP Mint,pub:Public Mint
```

An unmapped group displays its raw label. This setting changes only presentation; it cannot change Guard selection or eligibility.

## Collection information card

```env
NEXT_PUBLIC_SHOW_COLLECTION_INFO=true
NEXT_PUBLIC_COLLECTION_DESCRIPTION="Describe the collection and mint terms."
NEXT_PUBLIC_CREATOR_NAME="Example Studio"
NEXT_PUBLIC_CREATOR_IMAGE=/creator.webp
NEXT_PUBLIC_COLLECTION_VERIFIED=false
```

`NEXT_PUBLIC_COLLECTION_VERIFIED` is a presentation badge controlled by the deployer. It is not an on-chain verification check, so enable it only when the statement is accurate.

## Mint experience

```env
NEXT_PUBLIC_MULTIMINT=true
NEXT_PUBLIC_MAXMINTAMOUNT=5
NEXT_PUBLIC_MINT_PROGRESS_MIN_MS=5000
NEXT_PUBLIC_GUARD_SELECTION_MODE=all
```

The on-chain supply and Guard limits always override UI quantities. The progress duration is a minimum; confirmation time already spent in the modal counts toward it.

## Theme

The default theme is a neutral dark purple design. Global tokens and animations are in `styles/modern-theme.css`, `styles/globals.css`, and `styles/nft-animations.css`. Components also contain local Chakra style props. If changing colors, verify contrast, wallet modal readability, mobile layouts, success/error states, and reduced-motion behavior.

## Optional fixed developer fee

`NEXT_PUBLIC_DEVELOPER_FEE_ENABLED=true` enables the built-in **Buy me a beer** function. It adds a 0.0065 SOL project-support transfer to each mint transaction. The fixed recipient and lamport amount are defined in `utils/developerFee.ts`, and the same constants are validated server-side when the signing service is active. Please consider leaving it enabled to support ongoing maintenance; operators can opt out by setting the variable to `false`.

Direct tips can be sent to `E4jpuwa7ppY2hmF2RWcfYrQ2FAXfLeVwPVGZZJVq9sk5` on Solana.

Before offering a customer deployment:

- disclose the amount and recipient to the operator and minters;
- decide whether the fee should be enabled;
- ensure an effective `thirdPartySigner` Guard protects every mintable group if bypass prevention is required;
- never rely on browser code alone to enforce a fee.
