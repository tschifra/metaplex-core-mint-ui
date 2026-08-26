import { buildMintShareUrl, resolveAssetUrl } from "../utils/assetMedia";

describe("asset media helpers", () => {
  it("normalizes native IPFS and Arweave URLs", () => {
    expect(resolveAssetUrl("ipfs://bafy-example/asset.png")).toBe(
      "https://ipfs.io/ipfs/bafy-example/asset.png"
    );
    expect(resolveAssetUrl("ar://abcdefghijklmnopqrstuvwxyzABCDEFGH123456789")).toBe(
      "https://arweave.net/abcdefghijklmnopqrstuvwxyzABCDEFGH123456789"
    );
  });

  it("leaves absolute and unknown URLs unchanged", () => {
    expect(resolveAssetUrl("https://example.com/asset.png")).toBe(
      "https://example.com/asset.png"
    );
    expect(resolveAssetUrl("relative/asset.png")).toBe("relative/asset.png");
  });

  it("builds a stable encoded share URL without duplicate extension hints", () => {
    const url = buildMintShareUrl(
      {
        name: "Core #1",
        animation_url: "https://example.com/asset.mp4?download=1",
      },
      "https://mint.example.com",
      ["#Metaplex", "Core"]
    );
    const text = new URL(url).searchParams.get("text");

    expect(text).toContain("Just minted Core #1!");
    expect(text).toContain("https://example.com/asset.mp4?download=1&ext=mp4");
    expect(text).toContain("#Metaplex #Core");
  });
});
