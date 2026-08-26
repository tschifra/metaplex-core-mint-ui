import {
  CandyGuard,
  DefaultGuardSet,
  GuardGroup,
  GuardSet,
} from "@metaplex-foundation/mpl-core-candy-machine";
import { isSome } from "@metaplex-foundation/umi";

/**
 * Resolve a guard group exactly as Candy Guard does on-chain: every guard set
 * on the group overrides the default value, while an unset group guard inherits
 * the default value.
 */
export function resolveGuardSet<G extends GuardSet>(defaults: G, group: G): G {
  const resolved = { ...defaults } as G;
  const writableResolved: GuardSet = resolved;

  for (const [name, value] of Object.entries(group)) {
    if (isSome(value)) {
      writableResolved[name] = value;
    }
  }

  return resolved;
}

/**
 * Return only guard selections that can actually be minted. Once groups exist,
 * Candy Guard requires a group label and the default set is no longer directly
 * mintable.
 */
export function getMintableGuardGroups(
  candyGuard: CandyGuard
): GuardGroup<DefaultGuardSet>[] {
  if (candyGuard.groups.length === 0) {
    return [{ label: "default", guards: candyGuard.guards }];
  }

  return candyGuard.groups.map((group) => ({
    label: group.label,
    guards: resolveGuardSet(candyGuard.guards, group.guards),
  }));
}

export function getMintableGuardGroup(
  candyGuard: CandyGuard,
  label: string
): GuardGroup<DefaultGuardSet> | undefined {
  return getMintableGuardGroups(candyGuard).find(
    (group) => group.label === label
  );
}
