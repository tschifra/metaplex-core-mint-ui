# Production readiness checklist

## Repository

- [ ] Licensing/redistribution rights in `PROVENANCE.md` are resolved.
- [ ] No real `.env`, wallet, keypair, Vercel state, cache, or Guard snapshot is tracked.
- [ ] Placeholder images, descriptions, social links, icons, and domain are replaced.
- [ ] Fixed developer fee is intentionally enabled or disabled and disclosed.
- [ ] `npm run check`, `npm run security:audit`, and `npm run build` pass.

## On-chain state

- [ ] Correct network, Core Candy Machine, Core Collection, Candy Guard, and authorities.
- [ ] Candy Guard is the machine `mintAuthority`.
- [ ] `itemsLoaded === itemsAvailable`; supply and metadata URIs are correct.
- [ ] Prices, treasuries, start/end dates, limits, groups, and destructive destinations are independently reviewed.
- [ ] Group labels and UI display-name mapping match.
- [ ] `npm run guard:check` has no unexpected errors and its snapshot is archived privately.
- [ ] Fairness/reveal claims match the actual config-line or hidden-settings design.

## Guard testing

- [ ] Every group tested with eligible and ineligible devnet wallets.
- [ ] Allow List root and proof route tested.
- [ ] Core asset, NFT, and SPL token gates use the correct asset standard.
- [ ] Payments and burns use distinct intended assets and destinations.
- [ ] Mint limits, sold-out state, start/end boundaries, and redeemed limits tested.
- [ ] Multi-mint tested at 1 and configured maximum.
- [ ] Freeze/allocation routes initialized and lifecycle tested where used.
- [ ] Gatekeeper/custom/Token-2022 integrations tested or explicitly unsupported.

## Infrastructure

- [ ] Private HTTPS DAS-enabled `RPC_URL` configured.
- [ ] Final HTTPS site URL and both origin allowlists configured.
- [ ] RPC timeout/rate values fit provider and Vercel plan quotas.
- [ ] Provider spending alerts or hard quotas enabled.
- [ ] Production logs contain no secrets or serialized keypairs.
- [ ] Custom domain, TLS, security headers, social preview, and mobile layout verified.

## Third-party signer, when used

- [ ] Dedicated signer stored only in secret management and has no unnecessary SOL/authority role.
- [ ] Server reports `standby` before on-chain activation.
- [ ] Dry-run output and exact Candy Guard address reviewed.
- [ ] Default and every effective group use the expected signer.
- [ ] Server reports `ready` after activation.
- [ ] `GUARD_REQUIRE_THIRD_PARTY_SIGNER=true npm run guard:check` reports no unprotected mintable group.
- [ ] Valid mint, invalid shape, stale memo, replay, wrong origin, wrong payer, and excessive fee tests pass.
- [ ] Rollback/rotation procedure and responsible operator are documented.

## Fairness and reveal

- [ ] Allow List is described only as wallet eligibility, never as item-selection protection.
- [ ] Third-party signer is described only as transaction authorization, never as randomness.
- [ ] A fairness-sensitive config-line sale has been replaced with Hidden Settings and a precommitted reveal process, or its influence risk is explicitly disclosed.

## Release evidence

- [ ] Final commit hash and Vercel deployment ID recorded.
- [ ] Final environment-variable names recorded without values.
- [ ] Final Guard snapshot and devnet test signatures archived privately.
- [ ] One production simulation or explicitly authorized low-risk mint completed.
- [ ] Monitoring and incident contact are active.
