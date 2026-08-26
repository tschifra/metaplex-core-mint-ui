import { publicConfig } from "./utils/publicConfig";

const builtInGuardNames: Record<string, string> = {
  default: "Public Mint",
  hold: "Holder Mint",
  pub: "Public Mint",
  wl: "Allowlist Mint",
  WL: "Allowlist Mint",
};

export function getMintText(label: string) {
  const header = publicConfig.guardLabels[label] || builtInGuardNames[label] || label;
  return {
    label,
    header,
    mintText: label === "default"
      ? "Connect your wallet to mint from this collection"
      : `${header} access`,
    buttonLabel: "Mint",
  };
}

export const image = publicConfig.heroImage;
export const workimage = publicConfig.workingImage;

//website title
export const headerText = publicConfig.siteName;

//mint page URL for Twitter sharing
export const mintPageUrl = publicConfig.siteUrl;

//Twitter hashtags for sharing (without #)
export const twitterHashtags = publicConfig.shareHashtags;

// Social links (leave empty string "" to hide)
export const socialLinks = publicConfig.socialLinks;

// Collection info
export const collectionInfo = publicConfig.collection;
