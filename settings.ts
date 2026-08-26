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
export const headerText = publicConfig.siteName;
export const mintPageUrl = publicConfig.siteUrl;
export const twitterHashtags = publicConfig.shareHashtags;
export const socialLinks = publicConfig.socialLinks;
export const collectionInfo = publicConfig.collection;
