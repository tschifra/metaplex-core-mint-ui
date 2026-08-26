import {
  consumeMintAuthorizationNonce,
  getMintAuthorizationMaxAge,
  parseMintAuthorizationMemo,
  resetMintAuthorizationNoncesForTests,
} from "../utils/server/mintAuthorizationCore";

const payer = "11111111111111111111111111111111";
const nonce = "0123456789abcdef0123456789abcdef";

describe("mint authorization memo", () => {
  beforeEach(resetMintAuthorizationNoncesForTests);

  it("parses a fresh payer-bound memo", () => {
    const now = 1_800_000_000_000;
    const memo = `mintui:v1:${payer}:${now}:${nonce}`;
    expect(parseMintAuthorizationMemo(new TextEncoder().encode(memo), payer, now, 30_000))
      .toMatchObject({ nonceKey: `${payer}:${nonce}`, issuedAt: now });
  });

  it("rejects stale and invalid UTF-8 memos", () => {
    const now = 1_800_000_000_000;
    const stale = `mintui:v1:${payer}:${now - 30_001}:${nonce}`;
    expect(() => parseMintAuthorizationMemo(new TextEncoder().encode(stale), payer, now, 30_000))
      .toThrow(/expired/);
    expect(() => parseMintAuthorizationMemo(new Uint8Array([0xff]), payer, now, 30_000))
      .toThrow(/UTF-8/);
  });

  it("consumes a nonce only once during its lifetime", () => {
    expect(consumeMintAuthorizationNonce("payer:nonce", 10_000, 1_000)).toBe(true);
    expect(consumeMintAuthorizationNonce("payer:nonce", 10_000, 1_001)).toBe(false);
    expect(consumeMintAuthorizationNonce("payer:nonce", 20_000, 10_001)).toBe(true);
  });

  it("caps the authorization window to the blockhash lifetime", () => {
    expect(getMintAuthorizationMaxAge("120000")).toBe(120_000);
    expect(() => getMintAuthorizationMaxAge("10800000")).toThrow(/between 5000 and 120000/);
  });
});
