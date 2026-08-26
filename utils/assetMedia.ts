export interface ShareableAssetMetadata {
  name?: string;
  image?: string;
  animation_url?: string;
}

const ARWEAVE_ID = /^[A-Za-z0-9_-]{43}$/;

export function resolveAssetUrl(rawUrl: string | undefined): string {
  const value = rawUrl?.trim();
  if (!value) return "";

  if (/^(https?:|data:|blob:)/i.test(value)) return value;

  if (value.startsWith("ipfs://")) {
    const path = value.slice("ipfs://".length).replace(/^ipfs\//, "");
    return `https://ipfs.io/ipfs/${path}`;
  }

  if (value.startsWith("ar://")) {
    return `https://arweave.net/${value.slice("ar://".length)}`;
  }

  if (value.startsWith("Qm") || value.startsWith("bafy")) {
    return `https://ipfs.io/ipfs/${value}`;
  }

  const [identifier, suffix = ""] = value.split(/(?=[?#])/u, 2);
  if (ARWEAVE_ID.test(identifier)) {
    return `https://arweave.net/${identifier}${suffix}`;
  }

  return value;
}

function appendExtensionHint(url: string, extension: "mp4" | "png"): string {
  if (!url || /[?&]ext=/u.test(url)) return url;
  return `${url}${url.includes("?") ? "&" : "?"}ext=${extension}`;
}

export function buildMintShareUrl(
  metadata: ShareableAssetMetadata,
  mintPageUrl: string,
  hashtags: string[]
): string {
  const animationUrl = resolveAssetUrl(metadata.animation_url);
  const imageUrl = resolveAssetUrl(metadata.image);
  const mediaUrl = appendExtensionHint(
    animationUrl || imageUrl,
    animationUrl ? "mp4" : "png"
  );
  const tags = hashtags
    .map((tag) => tag.trim().replace(/^#+/u, ""))
    .filter(Boolean)
    .map((tag) => `#${tag}`)
    .join(" ");

  const lines = [
    `Just minted ${metadata.name || "My NFT"}! 🎉`,
    mediaUrl,
    mintPageUrl ? `Mint is Live at: ${mintPageUrl}` : "",
    tags,
  ].filter(Boolean);

  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(lines.join("\n\n"))}`;
}

export function openExternalUrl(url: string): void {
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.target = "_blank";
  anchor.rel = "noopener noreferrer";
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  window.setTimeout(() => anchor.remove(), 100);
}
