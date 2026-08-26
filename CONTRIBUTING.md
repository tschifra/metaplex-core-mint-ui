# Contributing

## Development

Use Node.js 24 and install the exact lockfile:

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Use a devnet Core Candy Machine and a dedicated test wallet. Never commit RPC credentials, wallets, keypairs, Guard snapshots, or generated collection caches.

## Required checks

Before opening a pull request:

```bash
npm run check
npm run security:audit
npm run build
```

Changes to Guard handling must include focused tests for eligibility, mint arguments, required accounts, multi-mint behavior, and destructive asset selection. Test the affected Guard combination on a local validator or devnet before recommending it for production.

## Scope

Keep the default repository collection-neutral. New branding should be configurable through environment variables or replaceable public assets. Do not add customer wallets, domains, Candy Machine addresses, private endpoints, or collection media to the template.

## Security reports

Do not open a public issue for an exploitable vulnerability. Use the repository's [private GitHub Security Advisory form](https://github.com/tschifra/metaplex-core-mint-ui/security/advisories/new). Never include seed phrases, private keys, signer secrets, private RPC credentials, or unauthorized live transactions.

## Licensing

The licensing status in `PROVENANCE.md` must be resolved before accepting outside contributions under a public software license. Contributors should not add third-party code or media without compatible, documented rights.
