# Core Candy Machine setup

This website is a client for an existing **Metaplex Core Candy Machine**. It does not replace the on-chain collection, Candy Machine, Candy Guard, or item-upload workflow.

Use the current official references while setting up the sale:

- [Core Candy Machine overview](https://www.metaplex.com/docs/smart-contracts/core-candy-machine)
- [MPLX CLI Candy Machine commands](https://www.metaplex.com/docs/dev-tools/cli/cm)
- [Creating a Core Candy Machine](https://www.metaplex.com/docs/smart-contracts/core-candy-machine/create)
- [Candy Guards](https://www.metaplex.com/docs/smart-contracts/core-candy-machine/guards)
- [Inserting items](https://www.metaplex.com/docs/smart-contracts/core-candy-machine/insert-items)
- [Minting and Guard groups](https://www.metaplex.com/docs/smart-contracts/core-candy-machine/mint)

## Recommended path: MPLX CLI wizard

Install and configure the MPLX CLI using the official documentation. Prepare a dedicated directory containing numbered asset image/JSON pairs plus collection metadata, then run:

```bash
mplx cm create --wizard
```

The wizard validates assets, uploads media/metadata, creates the Core collection and Candy Machine, configures Guards, and inserts items. Keep its generated configuration and cache files outside this UI repository and back them up securely.

Advanced users can create the same accounts using `@metaplex-foundation/mpl-core-candy-machine`; use the package version in `package.json` and the current official SDK documentation.

## Required on-chain state

Before the UI can mint, verify all of the following:

1. The Candy Machine is a **Core Candy Machine**, not a legacy Token Metadata Candy Machine V3.
2. Its collection is the intended Core Collection.
3. `itemsLoaded` equals `itemsAvailable` when using config-line settings.
4. Every item has the intended name and immutable or updatable metadata URI.
5. A Candy Guard account exists and is the Candy Machine `mintAuthority`.
6. The Guard default set and groups match the intended prices, dates, limits, gates, burns, and payment destinations.
7. Every Guard group label is at most six UTF-8 bytes.
8. The Candy Machine, Guard, collection, RPC, UI network, lookup table, and signer all belong to the same Solana cluster.

Set `NEXT_PUBLIC_CANDY_MACHINE_ID` and `RPC_URL`, then run the repository audit:

```bash
npm run guard:check
```

The command is read-only. It prints the machine, Guard, collection, supply, groups, and effective signer configuration, and writes a private snapshot under `.guard-snapshots/`.

## Minimum Guard design

There is no universal Guard combination. A common public sale uses:

- `solPayment` or `solFixedFee` for the exact on-chain price and treasury;
- `startDate` and optionally `endDate` for the sale window;
- `mintLimit` for a per-wallet cap;
- `botTax` for invalid mint attempts, after devnet testing;
- `programGate` when an explicit top-level program policy is desired;
- `thirdPartySigner` only when the server authorization service is required.

The browser-displayed price is informational. The Guard’s payment configuration is the actual enforced price. Always verify treasury addresses directly from the on-chain Guard snapshot.

## Guard groups

Default Guards are inherited by groups unless a group overrides them. This matters for `thirdPartySigner`, dates, payments, and limits.

Use short on-chain labels such as `wl`, `vip`, or `pub`. Give them readable UI names without changing on-chain accounts:

```env
NEXT_PUBLIC_GUARD_SELECTION_MODE=all
NEXT_PUBLIC_GUARD_LABELS=wl:Allowlist Mint,vip:VIP Mint,pub:Public Mint
```

Use `all` when buyers should select among eligible phases. Use `best` only when automatically selecting the cheapest eligible group is correct for the sale design.

## Allow List Guard

An Allow List restricts eligibility to wallet addresses included in a Merkle tree. Use it for a restricted phase, not automatically for every sale. A public phase should not have an Allow List unless every intended buyer is included.

This Guard does not select the minted item and does not provide randomness. An allowlisted buyer is authorized to mint but may still attempt to influence a pseudo-random config-line result.

For each Allow List group:

1. Add the exact wallet list to `allowlist.tsx` under the exact group label.
2. Generate the Merkle root from that same list. When the admin panel is enabled, it displays roots for the compiled lists.
3. Configure the on-chain group’s `allowList.merkleRoot` to that root.
4. Re-run the build and deploy.
5. Test with an included and excluded wallet on devnet.

The mint flow sends the Allow List proof route when the wallet does not already have a proof account. The list ships to the browser and is public.

## Core versus Token Metadata gates

- Use `assetGate`, `assetPayment`, or `assetBurn` for Metaplex **Core** assets.
- Use `nftGate`, `nftPayment`, or `nftBurn` for legacy **Token Metadata** NFTs.
- Use `tokenGate`, `tokenPayment`, or `tokenBurn` for SPL tokens.

These account types are not interchangeable. A mismatched Guard can make every buyer ineligible even when they own an asset with the expected collection name.

## Third-party signer setup

Use a third-party signer when every mint must pass the hosted server's transaction policy. It is required for enforcing this UI's optional developer-fee instruction against custom clients and is strongly recommended when the operator wants the server to reject modified transaction shapes. It adds a centralized availability dependency: if the service or key is unavailable, minting through protected groups stops.

It is not a replacement for Hidden Settings or a reveal design. The current endpoint validates the transaction and requires a distinct signed asset account, but it does not generate or preassign that asset account. Therefore it must not be described as preventing config-line grinding or as a source of randomness.

Generate a dedicated Solana keypair outside the repository and store it in a secret manager. It should not be the Candy Machine authority, treasury, or a personal hot wallet. It needs no SOL because it only adds a signature; the buyer remains the payer.

For local development, reference the protected file:

```env
THIRD_PARTY_SIGNER_KEYPAIR_PATH=/absolute/protected/path/signer.json
```

For Vercel, set `THIRD_PARTY_SIGNER_SECRET_KEY` to either the complete JSON byte array or a base58-encoded 64-byte secret key. Never prefix it with `NEXT_PUBLIC_`.

Inspect the proposed Guard update:

```bash
npm run guard:third-party
```

The script prints the fetched Candy Guard address and exits without sending. To apply, set all of the following in the local environment:

```env
APPLY=true
CANDY_GUARD_AUTHORITY_KEYPAIR_PATH=/absolute/protected/path/authority.json
CANDY_GUARD_CONFIRM_ADDRESS=THE_EXACT_PRINTED_GUARD_ADDRESS
```

Then run `npm run guard:third-party` again. It preserves unrelated Guards, sets the signer on the default set and every group, waits for finalization, and verifies the result.

Deploy the signer service before applying the Guard and expect `/api/mint/health` to report `standby`. After the matching Guard is active, it should report `ready`.

Production checklist:

1. Set the server secret, `RPC_URL`, Candy Machine ID, and origin restrictions in the deployment environment.
2. Deploy and confirm `/api/mint/health` reports `standby` before changing the on-chain Guard.
3. Run `npm run guard:third-party` as a dry run and verify the printed machine, Guard, signer, and groups.
4. Apply the update with the exact confirmation address and the Candy Guard authority.
5. Set `GUARD_REQUIRE_THIRD_PARTY_SIGNER=true` when running `npm run guard:check`; resolve every reported unprotected group.
6. Confirm health reports `ready`, then test valid, modified, expired, replayed, and wrong-origin transactions on devnet.

## Fairness and item selection

Do not claim that config-line minting is cryptographically random or unpredictable. The current Metaplex documentation warns that pseudo-random config-line selection may be influenced and recommends hidden settings for reveal designs where that threat matters.

For a fairness-sensitive launch:

- use hidden settings and a committed reveal hash;
- publish the reveal procedure before minting;
- test the exact deployed program version on a local validator/devnet;
- avoid exposing rarity-to-index mappings before reveal;
- treat Allow Lists as wallet eligibility, not item-selection protection;
- treat a third-party signer as transaction authorization, not as randomness.

## Final devnet matrix

Before mainnet, test at least:

- eligible and ineligible wallet for every Guard group;
- exact price and payment destination;
- before start, during sale, and after end;
- first mint and limit-exceeded mint;
- one mint and maximum configured multi-mint;
- Allow List proof creation and repeat mint;
- each Core/NFT/token gate, payment, or burn using real devnet assets;
- signer healthy, signer unavailable, expired authorization, and replay attempt;
- sold-out behavior and metadata reveal/indexing delay.
