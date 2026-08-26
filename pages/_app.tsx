import { WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import type { AppProps } from "next/app";
import Head from "next/head";
import { Audiowide, JetBrains_Mono } from "next/font/google";
import { useMemo } from "react";
import { UmiProvider } from "../utils/UmiProvider";
import { ErrorBoundary } from "../components/ErrorBoundary";
import "@/styles/globals.css";
import "@/styles/modern-theme.css";
import "@solana/wallet-adapter-react-ui/styles.css";
import { ChakraProvider, createSystem, defaultConfig } from '@chakra-ui/react';
import { headerText, mintPageUrl } from 'settings';
import { SolanaTimeProvider } from "@/utils/SolanaTimeContext";
import { getActiveRpc } from "@/utils/configManager";
import { publicConfig } from "@/utils/publicConfig";
import { AppToaster } from "@/components/ui/AppToaster";

const audiowide = Audiowide({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
});

const systemFont = '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
const configuredFont = publicConfig.fontPreset === "system"
  ? systemFont
  : publicConfig.fontPreset === "mono"
    ? jetBrainsMono.style.fontFamily
    : audiowide.style.fontFamily;

const system = createSystem(defaultConfig, {
  theme: {
    tokens: {
      fonts: {
        body: { value: 'var(--font-body, "Audiowide", cursive, -apple-system, BlinkMacSystemFont, sans-serif)' },
        heading: { value: 'var(--font-display, "Audiowide", cursive, -apple-system, BlinkMacSystemFont, sans-serif)' },
      },
    },
  },
});

export default function App({ Component, pageProps }: AppProps) {
  const endpoint = getActiveRpc();
  // Use empty array to enable wallet-standard auto-detection
  // This automatically detects all installed Solana wallets (Phantom, Solflare, Backpack, etc.)
  const wallets = useMemo(() => [], []);
  return (
    <>
      <Head>
        <meta property="og:type" content="website" />
        <meta property="og:title" content={headerText} />
        <meta property="og:description" content={publicConfig.siteDescription} />
        <meta property="og:url" content={mintPageUrl} />
        <meta property="og:image" content={publicConfig.socialPreviewImage} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta name="description" content={publicConfig.siteDescription} />
        {/* Twitter Card tags for image preview in shared tweets */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={headerText} />
        <meta name="twitter:description" content={publicConfig.siteDescription} />
        <meta name="twitter:image" content={publicConfig.socialPreviewImage} />
        {publicConfig.twitterHandle && (
          <meta name="twitter:site" content={publicConfig.twitterHandle} />
        )}
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{headerText}</title>
        <link rel="icon" href={publicConfig.favicon} />
        <link rel="apple-touch-icon" href={publicConfig.appleTouchIcon} />
        <link rel="icon" sizes="192x192" href={publicConfig.icon192} />
        <link rel="icon" sizes="512x512" href={publicConfig.icon512} />
        <style>{`
          /* Force background visibility */
          html {
            background: #08080c !important;
            min-height: 100vh;
            overflow-x: hidden;
          }
          body {
            background: transparent !important;
            min-height: 100vh;
            position: relative;
          }
          /* Ensure Chakra doesn't override */
          .chakra-ui-light, .chakra-ui-dark,
          [data-theme], [class*="chakra"] {
            background: transparent !important;
            background-color: transparent !important;
          }
          /* Override any body::before/after */
          body::before, body::after {
            display: none !important;
          }
          /* Video background styles */
          .video-background {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            object-fit: cover;
            z-index: -1;
            opacity: 1;
          }
        `}</style>
      </Head>
      <style jsx global>{`
        :root {
          --font-audiowide: ${audiowide.style.fontFamily};
          --font-display: ${configuredFont};
          --font-body: ${configuredFont};
          --font-mono: ${jetBrainsMono.style.fontFamily};
        }

        html,
        body {
          font-family: ${configuredFont};
        }
      `}</style>
      <ChakraProvider value={system}>
        <AppToaster />
        {publicConfig.backgroundVideo && (
          <video
            className="video-background"
            autoPlay
            loop
            muted
            playsInline
          >
            <source src={publicConfig.backgroundVideo} type="video/mp4" />
          </video>
        )}
        <ErrorBoundary>
          <WalletProvider wallets={wallets} autoConnect>
            <UmiProvider endpoint={endpoint}>
              <WalletModalProvider>
                <SolanaTimeProvider>
                  <Component {...pageProps} />
                </SolanaTimeProvider>
              </WalletModalProvider>
            </UmiProvider>
          </WalletProvider>
        </ErrorBoundary>
      </ChakraProvider>
    </>
  );
}
