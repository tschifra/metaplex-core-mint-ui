import {
  normalizeSiteUrl,
  normalizeTwitterHandle,
  parseFontPreset,
  parseGuardLabels,
  parsePublicBoolean,
  parsePublicList,
  resolvePublicUrl,
} from "../utils/publicConfig";

describe("public customer configuration", () => {
  it("normalizes the canonical site URL", () => {
    expect(normalizeSiteUrl("https://mint.example.com/drop?ignored=1#top"))
      .toBe("https://mint.example.com/drop/");
    expect(() => normalizeSiteUrl("javascript:alert(1)"))
      .toThrow("must use http or https");
  });

  it("resolves a site-relative social preview image", () => {
    expect(resolvePublicUrl("/preview.jpg", "https://mint.example.com/"))
      .toBe("https://mint.example.com/preview.jpg");
  });

  it("parses hashtags, handles and booleans", () => {
    expect(parsePublicList("#Solana, NFT, ,MetaplexCore"))
      .toEqual(["Solana", "NFT", "MetaplexCore"]);
    expect(normalizeTwitterHandle("@example"))
      .toBe("@example");
    expect(parsePublicBoolean("true", false)).toBe(true);
    expect(parsePublicBoolean(undefined, false)).toBe(false);
    expect(() => parsePublicBoolean("yes", false)).toThrow("must be true or false");
  });

  it("parses reusable font and guard-label customization", () => {
    expect(parseFontPreset("system")).toBe("system");
    expect(() => parseFontPreset("comic")).toThrow("must be audiowide");
    expect(parseGuardLabels("wl:Allowlist Mint,pub:Public Mint")).toEqual({
      wl: "Allowlist Mint",
      pub: "Public Mint",
    });
    expect(() => parseGuardLabels("invalid")).toThrow("label:Display Name");
  });
});
