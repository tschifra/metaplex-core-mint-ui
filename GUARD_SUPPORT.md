# Candy Guard support

The UI exposes the default set when no named groups exist. When groups exist, it exposes only those groups and resolves every group against its inherited default Guards. Unknown custom Guards are not supported automatically; they require a compatible Umi manifest, eligibility logic, mint arguments, account selection, and tests.

## Implemented paths

| Category | Guards |
| --- | --- |
| Time and supply | `startDate`, `endDate`, `mintLimit`, `nftMintLimit`, `assetMintLimit`, `allocation`, `redeemedAmount` |
| Access | `addressGate`, `allowList`, `tokenGate`, `nftGate`, `assetGate`, `thirdPartySigner` |
| SOL payments | `solPayment`, `solFixedFee`, `freezeSolPayment` |
| Token payments/burns | `tokenPayment`, `freezeTokenPayment`, `token2022Payment`, `tokenBurn` |
| Token Metadata NFT actions | `nftGate`, `nftPayment`, `nftBurn`, `nftMintLimit` |
| Metaplex Core asset actions | `assetGate`, `assetPayment`, `assetPaymentMulti`, `assetBurn`, `assetBurnMulti`, `assetMintLimit` |
| Program-enforced/no extra UI input | `botTax`, `programGate`, `edition`, `vanityMint` |

The client calculates eligibility, selects required accounts, builds mint arguments, and preserves distinct destructive assets across multi-mint transactions. The on-chain Guard remains authoritative; client eligibility is only a preview.

## Important boundaries

### Gatekeeper

The mint argument shape exists, but obtaining or refreshing a Civic/Gateway token requires an external provider integration. Do not enable `gatekeeper` until that flow has been implemented and tested for the deployment.

### Freeze Guards

Mint construction is implemented. Treasury initialization, unlock/thaw operations, and post-sale administration are operational duties outside the buyer flow. Test the full lifecycle before launch.

### Token-2022

Basic payment eligibility and mint arguments are implemented. Test the exact token’s extensions on devnet; transfer hooks, fees, confidential transfers, or other extensions can alter account and balance behavior.

### Programmable Token Metadata NFTs

Token Metadata NFT gate/payment/burn code resolves token records and rule sets where available. Test every programmable rule set used by the collection.

### Custom Guards

Custom on-chain Guards are unsupported until explicitly added to the client. A custom Guard may need new route instructions, accounts, proof data, and eligibility checks.

## Allowlists

`allowlist.ts` ships empty. The map key must exactly match a Guard group label; use `default` only when the Guard has no named groups. Its addresses must be the source used for the on-chain Merkle root. The UI sends the proof route when a proof account does not already exist.

## Groups and inheritance

Default Guards are inherited by each group. A group-level Guard overrides the default Guard of the same type. Eligibility, displayed price and dates, mint arguments, asset selection, and the signer health path all use the same effective inherited Guard set. Once named groups exist, Candy Guard requires a group label and the default set is not directly mintable.

Use `NEXT_PUBLIC_GUARD_SELECTION_MODE=all` for explicit phase selection. Use `best` only when automatic cheapest-group selection matches the intended sale semantics.

## Required project test matrix

Static checks cannot validate customer-specific accounts or extensions. Simulate or devnet-test every enabled combination, particularly:

- allowlist proof creation;
- allocation initialization;
- Core and Token Metadata ownership gates;
- all burn/payment destinations;
- programmable NFTs;
- Token-2022 extensions;
- freeze initialization and thaw;
- multi-mint with repeated destructive Guards;
- third-party signer inheritance across every group.
