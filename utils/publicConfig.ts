export type PublicMintConfig = Readonly<{
  siteUrl: string;
  siteName: string;
  siteDescription: string;
  socialPreviewImage: string;
  heroImage: string;
  workingImage: string;
  backgroundVideo: string;
  favicon: string;
  appleTouchIcon: string;
  icon192: string;
  icon512: string;
  twitterHandle: string;
  shareHashtags: string[];
  fontPreset: "audiowide" | "system" | "mono";
  guardLabels: Readonly<Record<string, string>>;
  socialLinks: Readonly<{
    discord: string;
    twitter: string;
    website: string;
  }>;
  collection: Readonly<{
    showInfo: boolean;
    description: string;
    creatorName: string;
    creatorImage: string;
    isVerified: boolean;
  }>;
}>;

export function normalizeSiteUrl(value: string): string {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("NEXT_PUBLIC_SITE_URL must be a valid absolute URL");
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("NEXT_PUBLIC_SITE_URL must use http or https");
  }
  parsed.pathname = parsed.pathname.replace(/\/?$/, "/");
  parsed.search = "";
  parsed.hash = "";
  return parsed.toString();
}

export function resolvePublicUrl(value: string, siteUrl: string): string {
  try {
    const parsed = new URL(value, siteUrl);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      throw new Error("unsupported protocol");
    }
    return parsed.toString();
  } catch {
    throw new Error("NEXT_PUBLIC_SOCIAL_PREVIEW_IMAGE must be a valid HTTP(S) URL or site-relative path");
  }
}

export function parsePublicList(value: string): string[] {
  return value
    .split(",")
    .map((entry) => entry.trim().replace(/^#/, ""))
    .filter(Boolean);
}

export function parsePublicBoolean(
  value: string | undefined,
  fallback: boolean,
  variableName = "public boolean"
): boolean {
  if (value === undefined || value.trim() === "") return fallback;
  if (value.toLowerCase() === "true") return true;
  if (value.toLowerCase() === "false") return false;
  throw new Error(`${variableName} must be true or false`);
}

export function normalizeTwitterHandle(value: string): string {
  const handle = value.trim().replace(/^@/, "");
  return handle ? `@${handle}` : "";
}

export function parseFontPreset(
  value: string | undefined
): PublicMintConfig["fontPreset"] {
  const preset = value?.trim().toLowerCase() || "audiowide";
  if (preset !== "audiowide" && preset !== "system" && preset !== "mono") {
    throw new Error("NEXT_PUBLIC_FONT_PRESET must be audiowide, system, or mono");
  }
  return preset;
}

export function parseGuardLabels(value: string | undefined): Record<string, string> {
  if (!value?.trim()) return {};
  return Object.fromEntries(value.split(",").map((rawEntry) => {
    const entry = rawEntry.trim();
    const separator = entry.indexOf(":");
    const label = separator === -1 ? "" : entry.slice(0, separator).trim();
    const displayName = separator === -1 ? "" : entry.slice(separator + 1).trim();
    if (!label || !displayName) {
      throw new Error(
        "NEXT_PUBLIC_GUARD_LABELS must use label:Display Name entries separated by commas"
      );
    }
    return [label, displayName];
  }));
}

const siteUrl = normalizeSiteUrl(
  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000/"
);

export const publicConfig: PublicMintConfig = Object.freeze({
  siteUrl,
  siteName: process.env.NEXT_PUBLIC_SITE_NAME || "NFT Mint",
  siteDescription:
    process.env.NEXT_PUBLIC_SITE_DESCRIPTION ||
    "Mint a digital collectible on Solana.",
  socialPreviewImage: resolvePublicUrl(
    process.env.NEXT_PUBLIC_SOCIAL_PREVIEW_IMAGE || "/social-preview.webp",
    siteUrl
  ),
  heroImage: process.env.NEXT_PUBLIC_HERO_IMAGE || "/hero.webp",
  workingImage: process.env.NEXT_PUBLIC_WORKING_IMAGE || "/minting.svg",
  backgroundVideo: process.env.NEXT_PUBLIC_BACKGROUND_VIDEO || "",
  favicon: process.env.NEXT_PUBLIC_FAVICON_URL || "/icon.svg",
  appleTouchIcon:
    process.env.NEXT_PUBLIC_APPLE_TOUCH_ICON_URL || "/icon.svg",
  icon192: process.env.NEXT_PUBLIC_ICON_192_URL || "/icon.svg",
  icon512: process.env.NEXT_PUBLIC_ICON_512_URL || "/icon.svg",
  twitterHandle: normalizeTwitterHandle(
    process.env.NEXT_PUBLIC_TWITTER_HANDLE || ""
  ),
  shareHashtags: parsePublicList(
    process.env.NEXT_PUBLIC_SHARE_HASHTAGS || "SolanaNFT,NFT,MetaplexCore"
  ),
  fontPreset: parseFontPreset(process.env.NEXT_PUBLIC_FONT_PRESET),
  guardLabels: Object.freeze(
    parseGuardLabels(process.env.NEXT_PUBLIC_GUARD_LABELS)
  ),
  socialLinks: Object.freeze({
    discord: process.env.NEXT_PUBLIC_DISCORD_URL || "",
    twitter: process.env.NEXT_PUBLIC_TWITTER_URL || "",
    website: process.env.NEXT_PUBLIC_WEBSITE_URL || "",
  }),
  collection: Object.freeze({
    showInfo: parsePublicBoolean(
      process.env.NEXT_PUBLIC_SHOW_COLLECTION_INFO,
      false,
      "NEXT_PUBLIC_SHOW_COLLECTION_INFO"
    ),
    description:
      process.env.NEXT_PUBLIC_COLLECTION_DESCRIPTION ||
      "A digital art collection on the Solana blockchain.",
    creatorName: process.env.NEXT_PUBLIC_CREATOR_NAME || "Collection Creator",
    creatorImage: process.env.NEXT_PUBLIC_CREATOR_IMAGE || "",
    isVerified: parsePublicBoolean(
      process.env.NEXT_PUBLIC_COLLECTION_VERIFIED,
      false,
      "NEXT_PUBLIC_COLLECTION_VERIFIED"
    ),
  }),
});
