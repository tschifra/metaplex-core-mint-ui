import {
  getMintableGuardGroups,
  resolveGuardSet,
} from "../utils/guardResolution";
import { none, some } from "@metaplex-foundation/umi";

describe("Candy Guard group resolution", () => {
  it("inherits default guards and lets group guards override them", () => {
    const defaults = {
      startDate: some({ date: BigInt(10) }),
      solPayment: some({ amount: "public" }),
      thirdPartySigner: some({ signerKey: "server" }),
    };
    const group = {
      startDate: none<{ date: bigint }>(),
      solPayment: some({ amount: "allowlist" }),
      thirdPartySigner: none<{ signerKey: string }>(),
    };

    const resolved = resolveGuardSet(defaults, group);

    expect(resolved.startDate).toEqual(defaults.startDate);
    expect(resolved.solPayment).toEqual(group.solPayment);
    expect(resolved.thirdPartySigner).toEqual(defaults.thirdPartySigner);
  });

  it("does not expose the default selection when groups exist", () => {
    const defaults = {
      startDate: some({ date: BigInt(10) }),
      solPayment: none<{ amount: string }>(),
    };
    const candyGuard = {
      guards: defaults,
      groups: [{
        label: "wl",
        guards: {
          startDate: none<{ date: bigint }>(),
          solPayment: some({ amount: "allowlist" }),
        },
      }],
    };

    const mintable = getMintableGuardGroups(candyGuard as never);

    expect(mintable.map((group) => group.label)).toEqual(["wl"]);
    expect(mintable[0].guards.startDate).toEqual(defaults.startDate);
  });

  it("uses the default selection when no groups exist", () => {
    const guards = { startDate: some({ date: BigInt(10) }) };
    const candyGuard = { guards, groups: [] };

    expect(getMintableGuardGroups(candyGuard as never)).toEqual([
      { label: "default", guards },
    ]);
  });
});
