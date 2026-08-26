# Asset provenance

The default visuals are generic template artwork. They do not use a previous customer collection, another NFT collection, a Solana logo, or an existing project logo.

## Generated raster artwork

`public/hero.webp` and `public/social-preview.webp` were generated on 2026-08-26 using OpenAI's built-in image generation tool, then locally resized and encoded as WebP. No source collection images were supplied as references.

### Hero prompt summary

> Create an original, premium abstract digital collectible emerging from a glowing mint portal for a generic Metaplex Core Candy Machine website. Use a centered faceted glass core, orbital paths, modular asset tiles, deep black-violet space, ultraviolet, cyan and magenta light, and a polished cinematic 3D editorial style. Keep it readable at mobile size. No people, text, letters, logos, currency symbols, Solana logo, NFT-project branding, watermark, or previous customer identity.

### Social-preview prompt summary

> Create a wide companion visual for a generic Metaplex Core Candy Machine mint template. Place a faceted glass core and luminous portal right of center with clean dark negative space on the left, modular asset nodes and elegant orbital lines. Use a premium cinematic 3D style in black-violet, cyan and magenta. No people, text, letters, logos, Solana logo, NFT-project identity, watermark, or previous customer identity.

## Code-native artwork

- `public/minting.svg` is an original animated SVG created for this repository. Its rotating orbits, floating crystal, glow and particles honor `prefers-reduced-motion`.
- `public/icon.svg` is an original generic vector icon created for this repository.

## Documentation screenshots

- `docs/screenshots/site-overview.png` is rendered from the real Chakra/React mint-page components with generic documentation values.
- `docs/screenshots/minting-progress.png` is rendered from the real `NFTRevealModal` mint-progress state.
- `docs/screenshots/minted-nft-modal.png` is rendered from the real successful single-asset reveal state with generic metadata and traits.
- `docs/screenshots/mint-page-loop.webp`, `minting-progress-loop.webp`, and `minted-nft-loop.webp` are infinite animated WebP previews recorded from those same real UI states at eight frames per second. The reveal loop includes the product's 600-piece confetti effect.

No wallet was connected and no blockchain transaction was signed or submitted while producing these screenshots. Displayed supply, balance, address and price values are illustrative.

When replacing any asset, record its creator, source, license or generation method here and confirm that its rights permit the intended public and commercial distribution.
