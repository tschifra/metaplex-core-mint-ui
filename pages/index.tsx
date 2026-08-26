import {
  PublicKey,
  publicKey,
  Umi,
} from "@metaplex-foundation/umi";
import { DigitalAssetWithToken, JsonMetadata } from "@metaplex-foundation/mpl-token-metadata";
import dynamic from "next/dynamic";
import { Dispatch, SetStateAction, useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useUmi } from "../utils/useUmi";
import { fetchCandyMachine, safeFetchCandyGuard, CandyGuard, CandyMachine } from "@metaplex-foundation/mpl-core-candy-machine"
import styles from "../styles/Home.module.css";
import { guardChecker } from "../utils/checkAllowed";
import { Heading, Text, Skeleton, useDisclosure, Button, DialogRoot, DialogContent, DialogCloseTrigger, DialogBody, DialogHeader, DialogBackdrop, Image, Box, VStack, Flex, SimpleGrid } from '@chakra-ui/react';
// useWindowSize from react-use causes re-renders on iOS address bar show/hide
// Use a stable ref-based approach instead

// Modern UI Components
import {
  GlassCard,
  MintStats,
  WalletBalance as WalletBalanceDisplay,
} from '../components/ui';
import { SocialLinks } from '../components/ui/SocialLinks';
import { CollectionInfo } from '../components/ui/CollectionInfo';

import { ButtonList } from "../components/mintButton";
import { DasApiAssetAndAssetMintLimit, GuardReturn } from "../utils/checkerHelper";
import { image, headerText, workimage, socialLinks, collectionInfo } from "../settings";
import { useSolanaTime } from "@/utils/SolanaTimeContext";
import { useWalletBalance } from '../utils/useWalletBalance';
import { useWallet } from '@solana/wallet-adapter-react';
import { useMintSound } from '../utils/useMintSound';
import { parseFeatureEnabled } from '../utils/mintUiConfig';
import { getMintableGuardGroups } from '../utils/guardResolution';
import { resolveAssetUrl } from '../utils/assetMedia';
import { toaster } from '../utils/toaster';

const adminUiEnabled = parseFeatureEnabled(
  process.env.NEXT_PUBLIC_ADMIN_ENABLED,
  false,
  'NEXT_PUBLIC_ADMIN_ENABLED'
);

interface RecentMintAttribute {
  trait_type?: string;
  value?: string;
}

interface RecentMintContent {
  json_uri?: string;
  links?: { image?: string; animation_url?: string };
  files?: Array<{ uri?: string; mime?: string }>;
  metadata?: { name?: string; attributes?: RecentMintAttribute[] };
}

interface RecentMint {
  content?: RecentMintContent;
}

interface RecentMintSearchResponse {
  items?: RecentMint[];
}

interface OffChainMintMetadata {
  image?: string;
  animation_url?: string;
  attributes?: RecentMintAttribute[];
}

// Minted NFT metadata never changes — cache fetched JSON across gallery refreshes
const metadataJsonCache = new Map<string, OffChainMintMetadata>();

// Admin-only panel — loaded on demand so it stays out of the public bundle
const InitializeModal = dynamic(
  () => import("../components/initializeModal").then((mod) => mod.InitializeModal),
  { ssr: false }
);

const RecentMintsGallery = dynamic(
  () => import('../components/ui/RecentMintsGallery').then((mod) => mod.RecentMintsGallery),
  { ssr: false }
);

const NFTRevealModal = dynamic(
  () => import('../components/ui/NFTRevealModal').then((mod) => mod.NFTRevealModal),
  { ssr: false }
);

const Confetti = dynamic(() => import('react-confetti'), { ssr: false });

const WalletMultiButtonDynamic = dynamic(
  () => import("@solana/wallet-adapter-react-ui").then((mod) => mod.WalletMultiButton),
  {
    ssr: false,
    loading: () => <div style={{ minWidth: '150px', height: '40px' }}>Loading wallet...</div>
  }
);

// Stable global styles - defined outside component to prevent re-creation
const GlobalStyles = () => (
  <style jsx global>{`
    @keyframes shimmer {
      0% { left: -100%; }
      100% { left: 100%; }
    }
    @keyframes fadeIn {
      0% { opacity: 0; }
      100% { opacity: 1; }
    }
    @keyframes slideInScale {
      0% {
        opacity: 0;
        transform: scale(0.95);
      }
      100% {
        opacity: 1;
        transform: scale(1);
      }
    }
    @keyframes modalDramaticEntrance {
      0% {
        opacity: 0;
        transform: scale(0.3) rotateZ(-10deg);
        filter: blur(20px);
      }
      50% {
        opacity: 1;
        transform: scale(1.15) rotateZ(5deg);
        filter: blur(0);
      }
      70% { transform: scale(0.95) rotateZ(-2deg); }
      85% { transform: scale(1.05) rotateZ(1deg); }
      100% {
        opacity: 1;
        transform: scale(1) rotateZ(0);
        filter: blur(0);
      }
    }
    @keyframes pulse {
      0%, 100% {
        opacity: 1;
        box-shadow: 0 0 20px currentColor;
      }
      50% {
        opacity: 0.8;
        box-shadow: 0 0 30px currentColor;
      }
    }
    @keyframes float {
      0%, 100% {
        transform: translateY(0px);
      }
      50% {
        transform: translateY(-10px);
      }
    }
    body, html {
      background: #08080c;
      margin: 0;
      padding: 0;
      height: 100%;
      width: 100%;
      overflow: hidden;
      font-size: clamp(0.6rem, 2vw, 1rem);
      position: fixed;
      top: 0;
      left: 0;
      -webkit-overflow-scrolling: touch;
    }
    body::before {
      content: '';
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background:
        radial-gradient(ellipse at 20% 0%, rgba(139, 92, 246, 0.2) 0%, transparent 50%),
        radial-gradient(ellipse at 80% 0%, rgba(59, 130, 246, 0.15) 0%, transparent 50%),
        radial-gradient(ellipse at 50% 100%, rgba(16, 185, 129, 0.1) 0%, transparent 50%),
        radial-gradient(ellipse at 0% 50%, rgba(244, 63, 94, 0.08) 0%, transparent 50%),
        linear-gradient(180deg, #08080c 0%, #0f0f14 50%, #08080c 100%);
      pointer-events: none;
      z-index: 0;
    }
    #__next {
      height: 100%;
      width: 100%;
      overflow: hidden;
      position: fixed;
      top: 0;
      left: 0;
      z-index: 1;
    }
    * {
      box-sizing: border-box;
    }
    @media (max-width: 480px) {
      body, html {
        font-size: 0.5rem;
      }
    }
    @media (min-width: 481px) and (max-width: 768px) {
      body, html {
        font-size: 0.7rem;
      }
    }
    @media (min-width: 769px) and (max-width: 1024px) {
      body, html {
        font-size: 0.8rem;
      }
    }
    @media (min-width: 1025px) {
      body, html {
        font-size: 1rem;
      }
    }
    /* Respect reduced motion preferences */
    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
        scroll-behavior: auto !important;
      }
    }
    /* Focus visible styles for accessibility */
    :focus-visible {
      outline: 2px solid #8b5cf6;
      outline-offset: 2px;
    }
    /* Skip to content link for screen readers */
    .skip-link {
      position: absolute;
      top: -40px;
      left: 0;
      background: #8b5cf6;
      color: white;
      padding: 8px 16px;
      z-index: 100;
      transition: top 0.3s;
    }
    .skip-link:focus {
      top: 0;
    }
  `}</style>
);

const useCandyMachine = (
  umi: Umi,
  candyMachineId: PublicKey | null,
  firstRun: boolean,
  setfirstRun: Dispatch<SetStateAction<boolean>>
) => {
  const [candyMachine, setCandyMachine] = useState<CandyMachine>();
  const [candyGuard, setCandyGuard] = useState<CandyGuard>();

  // Only fetch CM/CG on initial load (firstRun). After that, refreshCounters() handles updates.
  // Previously this depended on checkEligibility, which caused a re-fetch cycle every time
  // eligibility was re-checked (e.g. on wallet connect), creating new CM/CG refs and loops.
  useEffect(() => {
    (async () => {
      if (firstRun) {
        if (!candyMachineId) {
          setfirstRun(false);
          return;
        }

        let candyMachine;
        try {
          candyMachine = await fetchCandyMachine(umi, publicKey(candyMachineId));
        } catch (e) {
          toaster.create({
            id: "no-cm-found",
            title: "The configured Candy Machine is invalid",
            description: "Are you using the correct environment?",
            type: "error",
            duration: 999999,
          });
        }
        setCandyMachine(candyMachine);
        if (!candyMachine) {
          setfirstRun(false);
          return;
        }
        let candyGuard;
        try {
          candyGuard = await safeFetchCandyGuard(umi, candyMachine.mintAuthority);
        } catch (e) {
          toaster.create({
            id: "no-guard-found",
            title: "No Candy Guard found!",
            description: "Do you have one assigned?",
            type: "error",
            duration: 999999,
          });
        }
        if (!candyGuard) {
          setfirstRun(false);
          return;
        }

        setCandyGuard(candyGuard);

        setfirstRun(false);
      }
    })();
  }, [umi, candyMachineId, firstRun, setfirstRun]);

  return { candyMachine, setCandyMachine, candyGuard };
};

export default function Home() {
  const umi = useUmi();
  const solanaTime = useSolanaTime();
  const { open: isShowNftOpen, onOpen: onShowNftOpen, onClose: onShowNftClose } = useDisclosure();
  const { open: isInitializerOpen, onOpen: onInitializerOpen, onClose: onInitializerClose } = useDisclosure();
  const [mintsCreated, setMintsCreated] = useState<{ mint: PublicKey, offChainMetadata: JsonMetadata | undefined }[] | undefined>();
  const [loading, setLoading] = useState(true);

  const [ownedTokens, setOwnedTokens] = useState<DigitalAssetWithToken[]>();
  const [ownedCoreAssets, setOwnedCoreAssets] = useState<DasApiAssetAndAssetMintLimit[]>();

  const [guards, setGuards] = useState<GuardReturn[]>([
    { label: "startDefault", allowed: false, maxAmount: 0 },
  ]);
  const [firstRun, setFirstRun] = useState(true);
  const [checkEligibility, setCheckEligibility] = useState<boolean>(true);
  const [isMinting, setIsMinting] = useState(false); // Track if currently minting
  const [showConfetti, setShowConfetti] = useState(false); // Control confetti
  const [mintingStage, setMintingStage] = useState<string>(""); // Track minting stage
  const [hasPlayedSuccess, setHasPlayedSuccess] = useState(false); // Prevent duplicate success animations

  // DAS API state
  const [recentMints, setRecentMints] = useState<RecentMint[]>([]);
  const [collectionStats, setCollectionStats] = useState<{ total: number; name: string } | null>(null);
  const [loadingRecentMints, setLoadingRecentMints] = useState(false);

  // Recent mint preview modal
  const { open: isRecentMintOpen, onOpen: onRecentMintOpen, onClose: onRecentMintClose } = useDisclosure();
  const [selectedRecentMint, setSelectedRecentMint] = useState<RecentMint | null>(null);

  // Capture the viewport once for confetti. Listening to every resize makes the
  // whole page re-render when mobile browser chrome expands or collapses.
  const [{ width, height }, setConfettiViewport] = useState({ width: 1200, height: 800 });
  useEffect(() => {
    setConfettiViewport({ width: window.innerWidth, height: window.innerHeight });
  }, []);
  const { playSuccess } = useMintSound();

  const wallet = useWallet();

  const walletPublicKey = wallet.publicKey?.toString();
  const umiWithWallet = umi;

  const { balance: walletBalance, refresh: refreshWalletBalance } = useWalletBalance(umiWithWallet);

  const candyMachineId = useMemo<PublicKey | null>(() => {
    const cmId = process.env.NEXT_PUBLIC_CANDY_MACHINE_ID;
    return cmId ? publicKey(cmId) : null;
  }, []);

  const { candyMachine, setCandyMachine, candyGuard } = useCandyMachine(umi, candyMachineId, firstRun, setFirstRun);
  const [mintServiceStatus, setMintServiceStatus] = useState<"not-required" | "checking" | "ready" | "unavailable">("not-required");

  useEffect(() => {
    if (!firstRun && (!candyMachine || !candyGuard)) {
      setLoading(false);
    }
  }, [candyGuard, candyMachine, firstRun]);

  useEffect(() => {
    const requiresBackendSigner = Boolean(candyGuard &&
      getMintableGuardGroups(candyGuard).some(
        (group) => group.guards.thirdPartySigner.__option === "Some"
      ));

    if (!requiresBackendSigner) {
      setMintServiceStatus("not-required");
      return;
    }

    let cancelled = false;
    const checkHealth = async () => {
      if (!cancelled) setMintServiceStatus((current) => current === "ready" ? current : "checking");
      try {
        const response = await fetch("/api/mint/health", { cache: "no-store" });
        const result = await response.json().catch(() => ({}));
        if (!cancelled) setMintServiceStatus(response.ok && result.ok === true ? "ready" : "unavailable");
      } catch {
        if (!cancelled) setMintServiceStatus("unavailable");
      }
    };

    checkHealth();
    const interval = window.setInterval(checkHealth, 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [candyGuard]);

  // Show error toast for missing candy machine config (only once on mount)
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_CANDY_MACHINE_ID) {
      setLoading(false);
      toaster.create({
        id: 'no-cm',
        title: 'No candy machine configured!',
        description: "Set NEXT_PUBLIC_CANDY_MACHINE_ID for this deployment.",
        type: 'error',
        duration: 999999,
      });
    }
  }, []);

  // Re-check eligibility when wallet connects/disconnects
  // IMPORTANT: Do NOT depend on candyMachine/candyGuard here - that creates an infinite
  // re-fetch cycle (useCandyMachine re-fetches → new CM ref → this effect fires →
  // checkEligibility=true → useCandyMachine re-fetches again → loop).
  // We only read candyMachine/candyGuard in the body to guard against the initial load case.
  useEffect(() => {
    if (candyMachine && candyGuard) {
      setCheckEligibility(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallet.connected, walletPublicKey]);

  useEffect(() => {
    const checkEligibilityFunc = async () => {
      if (!candyMachine || !candyGuard || !checkEligibility || isShowNftOpen) {
        return;
      }
      setFirstRun(false);

      try {
        // Use umiWithWallet to check for holder tokens when wallet is connected
        const { guardReturn, ownedNfts, ownedCoreAssets } = await guardChecker(
          umiWithWallet, candyGuard, candyMachine, solanaTime
        );

        // Batch all state updates together
        // Update all states at once to minimize re-renders
        setOwnedTokens(ownedNfts);
        setGuards(guardReturn);
        setOwnedCoreAssets(ownedCoreAssets || []);
      } catch (e) {
        console.error("Eligibility check failed:", e);
        // Don't leave the UI in a broken state - set reasonable defaults
        // The guards stay in their previous state, but we still allow the UI to render
      } finally {
        setLoading(false);
        setCheckEligibility(false); // Always reset flag, even on error
      }
    };

    checkEligibilityFunc();
    // On purpose: not check for candyMachine, candyGuard, solanaTime
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [umiWithWallet, checkEligibility, firstRun]);

  // Full refresh - used after minting or when user explicitly triggers
  const refreshCounters = useCallback(async () => {
    if (candyMachine) {
      try {
        const updatedCandyMachine = await fetchCandyMachine(umi, candyMachine.publicKey);
        setCandyMachine(updatedCandyMachine);
      } catch {
        toaster.create({
          id: "refresh-error",
          title: "Failed to refresh",
          description: "Could not fetch latest candy machine state",
          type: "warning",
          duration: 3000,
        });
      }
    }
    setCheckEligibility(true);
  }, [umi, candyMachine, setCandyMachine, setCheckEligibility]);

  // Light refresh - only updates counter without triggering full re-render
  const refreshCounterOnly = useCallback(async () => {
    if (candyMachine) {
      try {
        const updatedCandyMachine = await fetchCandyMachine(umi, candyMachine.publicKey);
        // Only update if itemsRedeemed changed to avoid unnecessary re-renders
        if (updatedCandyMachine.itemsRedeemed !== candyMachine.itemsRedeemed) {
          setCandyMachine(updatedCandyMachine);
        }
      } catch {
        // Silent fail for background refresh - non-critical operation
      }
    }
  }, [umi, candyMachine, setCandyMachine]);

  // Auto-refresh counter every 15 seconds (light refresh, no full eligibility check)
  useEffect(() => {
    const interval = setInterval(() => {
      // Extra safeguard: also check if any modal/dialog is actually open in the DOM
      const anyDialogOpen = document.querySelector('[role="dialog"]') !== null;

      if (candyMachine && !isShowNftOpen && !isInitializerOpen && !isMinting && !isRecentMintOpen && !anyDialogOpen) {
        refreshCounterOnly();
      }
    }, 15000); // Refresh every 15 seconds (less aggressive)

    return () => clearInterval(interval);
  }, [candyMachine, refreshCounterOnly, isShowNftOpen, isInitializerOpen, isMinting, isRecentMintOpen]);

  // Refresh wallet eligibility when returning from a wallet or funding flow.
  // Balance and holder assets can change without the wallet connection itself
  // changing, so the connection-only eligibility effect would otherwise stay
  // stale until a full page reload.
  useEffect(() => {
    const handlePageReturn = () => {
      // Extra safeguard: also check if any modal/dialog is actually open in the DOM
      const anyDialogOpen = document.querySelector('[role="dialog"]') !== null;

      if (!document.hidden && candyMachine && !isInitializerOpen && !isShowNftOpen && !isMinting && !isRecentMintOpen && !anyDialogOpen) {
        refreshCounterOnly();
        if (wallet.connected) {
          void refreshWalletBalance();
          setCheckEligibility(true);
        }
      }
    };

    document.addEventListener('visibilitychange', handlePageReturn);
    window.addEventListener('focus', handlePageReturn);
    return () => {
      document.removeEventListener('visibilitychange', handlePageReturn);
      window.removeEventListener('focus', handlePageReturn);
    };
  }, [candyMachine, refreshCounterOnly, refreshWalletBalance, wallet.connected, isInitializerOpen, isShowNftOpen, isMinting, isRecentMintOpen]);


  // Optimized: Fetch both recent mints and collection stats in a single DAS call
  const hasLoadedMintsRef = useRef(false);
  const fetchCollectionData = useCallback(async () => {
    if (!candyMachine) {
      setRecentMints([]);
      setCollectionStats(null);
      return;
    }

    // Only show skeletons on the first load — later refreshes keep the current
    // gallery visible and swap in new data when it's ready
    if (!hasLoadedMintsRef.current) {
      setLoadingRecentMints(true);
    }

    try {
      const collectionMint = candyMachine.collectionMint;

      // Use raw DAS RPC searchAssets for recent mints — lighter than mpl-core-das
      // wrapper which does extra deriveAssetPluginsWithFetch processing we don't need
      const assetList = await umiWithWallet.rpc.call<RecentMintSearchResponse, Record<string, unknown>>('searchAssets', {
        grouping: ['collection', collectionMint.toString()],
        sortBy: { sortBy: 'created', sortDirection: 'desc' },
        limit: 10,
        page: 1,
        burnt: false,
      });

      const items = assetList?.items || [];
      // gateway.irys.xyz now 302-redirects metadata to a CDN, which Helius's
      // indexer doesn't follow — DAS returns assets with empty links/attributes.
      // Hydrate those directly from json_uri; browsers follow the redirect fine.
      const hydrated = await Promise.all(
        items.map(async (item) => {
          const content = item.content || {};
          const hasImage = content.links?.image || content.files?.[0]?.uri;
          const hasAttributes = (content.metadata?.attributes?.length ?? 0) > 0;
          if ((hasImage && hasAttributes) || !content.json_uri) return item;
          try {
            let json = metadataJsonCache.get(content.json_uri);
            if (!json) {
              const res = await fetch(content.json_uri, { signal: AbortSignal.timeout(10000) });
              if (!res.ok) return item;
              json = await res.json() as OffChainMintMetadata;
              metadataJsonCache.set(content.json_uri, json);
            }
            return {
              ...item,
              content: {
                ...content,
                links: {
                  ...content.links,
                  image: content.links?.image || json.image,
                  animation_url: content.links?.animation_url || json.animation_url,
                },
                files: content.files?.length
                  ? content.files
                  : json.image ? [{ uri: json.image }] : [],
                metadata: {
                  ...content.metadata,
                  attributes: hasAttributes ? content.metadata?.attributes : json.attributes,
                },
              },
            };
          } catch {
            return item;
          }
        })
      );

      // Map to the shape RecentMintsGallery expects
      const mapped: RecentMint[] = hydrated.map((item) => ({
        content: {
          links: {
            image: item.content?.links?.image,
            animation_url: item.content?.links?.animation_url,
          },
          files: item.content?.files,
          metadata: {
            name: item.content?.metadata?.name,
            attributes: item.content?.metadata?.attributes,
          },
        },
      }));

      setRecentMints(mapped);
      hasLoadedMintsRef.current = true;

      // Use candy machine's own counters for stats (no extra RPC call)
      const total = Number(candyMachine.itemsRedeemed);
      const name = mapped.length > 0
        ? mapped[0]?.content?.metadata?.name?.split('#')?.[0]?.trim() || 'Collection'
        : 'Collection';
      setCollectionStats({ total, name });
    } catch (error: unknown) {
      // Silently handle "no assets found" - this is normal for empty collections
      if (error instanceof Error && error.message.includes('No assets found')) {
        setRecentMints([]);
        setCollectionStats({ total: 0, name: 'Collection' });
      } else if (!hasLoadedMintsRef.current) {
        setRecentMints([]);
        setCollectionStats(null);
      }
      // On transient errors after a successful load, keep showing the last data
    } finally {
      setLoadingRecentMints(false);
    }
  }, [candyMachine, umiWithWallet]);

  const handleShowNftClose = useCallback(() => {
    setShowConfetti(false); // Stop confetti when closing
    setHasPlayedSuccess(false); // Reset for next mint
    onShowNftClose();
    refreshCounters();
    // Refresh wallet balance to show updated SOL amount
    refreshWalletBalance();
    // Refresh collection data to show the newly minted NFT in recent mints.
    // Re-fetch once more a few seconds later — DAS often hasn't indexed the
    // fresh mint on the first try.
    fetchCollectionData();
    setTimeout(fetchCollectionData, 6000);
  }, [onShowNftClose, refreshCounters, refreshWalletBalance, fetchCollectionData]);

  // Fetch all DAS data when candy machine or wallet changes (but not during minting)
  useEffect(() => {
    if (candyMachine && !isMinting && !isShowNftOpen && !isRecentMintOpen) {
      fetchCollectionData();
    }
  }, [candyMachine, wallet.connected, fetchCollectionData, isMinting, isShowNftOpen, isRecentMintOpen]);

  // Refresh recent mints when itemsRedeemed changes (new mint detected via existing 15s poll)
  const itemsRedeemed = candyMachine?.itemsRedeemed;
  const prevItemsRedeemed = useRef(itemsRedeemed);
  useEffect(() => {
    if (itemsRedeemed === undefined) return;
    const current = itemsRedeemed;
    if (prevItemsRedeemed.current !== undefined && current !== prevItemsRedeemed.current) {
      // New mint detected — refresh collection data
      if (!isMinting && !isShowNftOpen && !isRecentMintOpen) {
        fetchCollectionData();
      }
    }
    prevItemsRedeemed.current = current;
  }, [itemsRedeemed, fetchCollectionData, isMinting, isShowNftOpen, isRecentMintOpen]);

  // Trigger confetti and sound when mint succeeds
  useEffect(() => {
    if (isShowNftOpen && !isMinting && mintsCreated && mintsCreated.length > 0 && !hasPlayedSuccess) {
      setShowConfetti(true);
      setHasPlayedSuccess(true);
      playSuccess(); // Play success sound
      // Stop confetti after 5 seconds
      const timer = setTimeout(() => setShowConfetti(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [isShowNftOpen, isMinting, mintsCreated, playSuccess, hasPlayedSuccess]);

  // Auto-close modal if minting stopped but no NFTs were created (bot tax/failure)
  useEffect(() => {
    if (isShowNftOpen && !isMinting && (!mintsCreated || mintsCreated.length === 0)) {
      // Small delay to allow error toast to be visible
      const timer = setTimeout(() => {
        onShowNftClose();
        refreshWalletBalance(); // Refresh balance after failed mint (bot tax still charged)
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isShowNftOpen, isMinting, mintsCreated, onShowNftClose, refreshWalletBalance]);

  // Memoize computed values to prevent re-calculation on every render
  const availableNFTs = useMemo(
    () => candyMachine ? Number(candyMachine.data.itemsAvailable) - Number(candyMachine.itemsRedeemed) : 0,
    [candyMachine]
  );
  const totalNFTs = useMemo(
    () => candyMachine ? Number(candyMachine.data.itemsAvailable) : 0,
    [candyMachine]
  );

  // Keep this as a render helper instead of a nested React component. A component
  // declared inside Home receives a new identity on every state update, which
  // would unmount and remount the open mint dialog whenever its stage changes.
  const renderPageContent = (currentImage: string) => {
    return (
      <>
        <GlobalStyles />
        <Flex
          direction="column"
          minHeight="auto"
          width="100%"
          maxWidth="1200px"
          mx="auto"
          alignItems="center"
          justifyContent="flex-start"
          padding={{ base: "0.5rem 0.75rem 0.5rem", md: "0.3rem 1.5rem 0.5rem" }}
          gap={{ base: 2, md: 2 }}
        >
          {/* Title - Modern Gradient */}
          <Heading
            size={{ base: 'sm', md: 'md' }}
            textAlign="center"
            fontSize={{ base: "1.2rem", md: "1.5rem" }}
            fontWeight="900"
            letterSpacing="-0.02em"
            mb={{ base: 2, md: 3 }}
            mt={{ base: 0, md: "-2px" }}
            bgGradient="linear(to-r, #a78bfa, #8b5cf6, #6366f1, #8b5cf6, #a78bfa)"
            bgClip="text"
            backgroundSize="200% auto"
            style={{
              animation: 'text-shine 4s linear infinite',
            }}
            css={{
              '@keyframes text-shine': {
                '0%': { backgroundPosition: '0% 50%' },
                '100%': { backgroundPosition: '200% 50%' },
              },
            }}
          >
            {headerText}
          </Heading>

          {/* Main Content Grid - Image Left, Cards Right */}
          <Flex
            direction={{ base: "column", lg: "row" }}
            width="100%"
            maxWidth={{ base: "100%", lg: "850px" }}
            mx="auto"
            gap={{ base: 2, md: 3, lg: 3 }}
            align={{ base: "center", lg: "flex-start" }}
            justify="center"
          >
            {/* Image - Left - Modern Glass Container */}
            <Box
              flex={{ base: "1", lg: "0 0 300px" }}
              display="flex"
              justifyContent="center"
              alignItems="flex-start"
              width={{ base: "100%", lg: "auto" }}
            >
              <GlassCard
                variant="elevated"
                p={0}
                hoverEffect={true}
                width="100%"
                maxWidth={{ base: "200px", sm: "240px", md: "280px", lg: "300px" }}
                overflow="hidden"
                position="relative"
              >
                <Box
                  width="100%"
                  height={{ base: "200px", sm: "240px", md: "280px", lg: "300px" }}
                  position="relative"
                  overflow="hidden"
                >
                  <Image
                    width="100%"
                    height="100%"
                    objectFit="contain"
                    alt="project Image"
                    src={currentImage}
                    key={currentImage}
                    transition="transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)"
                    _hover={{ transform: 'scale(1.02)' }}
                  />
                  {/* Shimmer overlay */}
                  <Box
                    position="absolute"
                    top="0"
                    left="-100%"
                    width="100%"
                    height="100%"
                    background="linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent)"
                    animation="shimmerSlide 4s infinite"
                    pointerEvents="none"
                    css={{
                      '@keyframes shimmerSlide': {
                        '0%': { left: '-100%' },
                        '50%': { left: '100%' },
                        '100%': { left: '100%' },
                      },
                    }}
                  />
                </Box>
              </GlassCard>
            </Box>

            {/* Right side - NFT Counter + Wallet Balance + Mint Section stacked */}
            <Flex
              direction="column"
              flex={{ base: "1", lg: "0 0 320px" }}
              gap={{ base: 1.5, md: 2 }}
              align="stretch"
              width={{ base: "100%", lg: "auto" }}
              maxWidth={{ base: "320px", lg: "320px" }}
            >
              {/* NFT Counter - Modern Component */}
              <MintStats
                available={availableNFTs}
                total={totalNFTs}
                loading={loading}
              />

              {/* Wallet Balance - only show when connected */}
              {wallet.connected && (
                <WalletBalanceDisplay balance={walletBalance} />
              )}

              {/* Mint Button Card - Modern Component (only show when connected) */}
              <GlassCard variant="accent" p={{ base: 3, md: 3.5 }} hoverEffect={false}>
            {loading ? (
              <VStack gap={{ base: 2, md: 2 }}>
                <Skeleton height={{ base: "35px", md: "40px" }} width="100%" borderRadius="12px" />
                <Skeleton height={{ base: "35px", md: "40px" }} width="100%" borderRadius="12px" />
              </VStack>
            ) : (
              <ButtonList
                guardList={guards}
                candyMachine={candyMachine}
                candyGuard={candyGuard}
                umi={umi}
                ownedTokens={ownedTokens}
                setGuardList={setGuards}
                setMintsCreated={setMintsCreated}
                onOpen={onShowNftOpen}
                setCheckEligibility={setCheckEligibility}
                ownedCoreAssets={ownedCoreAssets}
                availableNFTs={availableNFTs}
                setIsMinting={setIsMinting}
                setMintingStage={setMintingStage}
                isConnected={wallet.connected}
                walletBalance={walletBalance}
                mintServiceStatus={mintServiceStatus}
              />
            )}
              </GlassCard>
            </Flex>
          </Flex>

          {collectionInfo.showInfo && (
            <Box width="100%" maxWidth="650px" mx="auto" mt={{ base: 2, md: 3 }}>
              <CollectionInfo
                description={collectionInfo.description}
                creatorName={collectionInfo.creatorName}
                creatorImage={collectionInfo.creatorImage}
                isVerified={collectionInfo.isVerified}
              />
            </Box>
          )}

          {/* Recent Mints - Modern Component */}
          <Box mt={wallet.connected ? { base: -1, md: -1 } : { base: 0, md: 0 }}>
            <RecentMintsGallery
              mints={recentMints}
              loading={loadingRecentMints}
              onMintClick={(nft) => {
                setSelectedRecentMint(nft);
                onRecentMintOpen();
              }}
            />
          </Box>

        </Flex>

        <DialogRoot open={isShowNftOpen} onOpenChange={(e) => !e.open && handleShowNftClose()}>
          {showConfetti && (
            <Confetti
              width={width}
              height={height}
              recycle={false}
              numberOfPieces={600}
              gravity={0.25}
              colors={['#8b5cf6', '#a78bfa', '#10b981', '#34d399', '#f59e0b', '#f43f5e', '#06b6d4']}
              style={{ position: 'fixed', top: 0, left: 0, zIndex: 9999, pointerEvents: 'none' }}
            />
          )}
          <DialogBackdrop
            position="fixed"
            top="0"
            left="0"
            right="0"
            bottom="0"
            zIndex={1400}
            onClick={() => { if (!isMinting) handleShowNftClose(); }}
            onTouchEnd={(e) => { if (!isMinting) { e.preventDefault(); handleShowNftClose(); } }}
            style={{
              background: 'rgba(0, 0, 0, 0.88)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              cursor: isMinting ? 'default' : 'pointer',
              touchAction: 'manipulation',
            }}
          />
          <DialogContent
            width={{ base: "92%", md: "820px" }}
            maxW={{ base: "92%", md: "900px" }}
            maxH={{ base: "92%", md: "92%" }}
            bg="linear-gradient(145deg, rgba(10, 10, 16, 0.98), rgba(18, 18, 28, 0.98))"
            backdropFilter="blur(32px)"
            border="1px solid rgba(139, 92, 246, 0.25)"
            borderRadius={{ base: "18px", md: "22px" }}
            boxShadow="0 32px 64px -12px rgba(0, 0, 0, 0.7), 0 0 100px rgba(139, 92, 246, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.05)"
            position="fixed"
            top="0"
            left="0"
            right="0"
            bottom="0"
            margin="auto"
            zIndex={1500}
            overflowX="hidden"
            overflowY="auto"
            p={{ base: 4, md: 5 }}
            style={{
              animation: 'slideInScale 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards',
              WebkitOverflowScrolling: 'touch',
            }}
            css={{
              '&::-webkit-scrollbar': { width: '4px' },
              '&::-webkit-scrollbar-track': { background: 'transparent' },
              '&::-webkit-scrollbar-thumb': { background: 'rgba(139, 92, 246, 0.3)', borderRadius: '2px' },
            }}
          >
            <DialogHeader
              color="white"
              fontSize={{ base: "1.1rem", md: "1.3rem" }}
              fontWeight="800"
              textAlign="center"
              mb={2}
              pb={2}
              display="flex"
              justifyContent="center"
              width="100%"
              letterSpacing="-0.01em"
              borderBottom="1px solid rgba(139, 92, 246, 0.15)"
              position="relative"
              minHeight="2em"
            >
              {/* Minting text - fades out */}
              <Box
                as="span"
                position="absolute"
                left="50%"
                transform="translateX(-50%)"
                opacity={isMinting ? 1 : 0}
                transition="opacity 0.4s ease-out"
              >
                ⏳ Minting...
              </Box>
              {/* Success text - fades in */}
              <Box
                as="span"
                position="absolute"
                left="50%"
                transform="translateX(-50%)"
                opacity={isMinting ? 0 : 1}
                transition="opacity 0.5s ease-in 0.2s"
              >
                🎉 {mintsCreated && mintsCreated.length > 1 ? `${mintsCreated.length} NFTs Minted!` : 'Your Minted NFT'}
              </Box>
            </DialogHeader>
            <button
              onClick={() => { if (!isMinting) handleShowNftClose(); }}
              onTouchEnd={(e) => { if (!isMinting) { e.preventDefault(); handleShowNftClose(); } }}
              style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                width: '44px',
                height: '44px',
                minWidth: '44px',
                minHeight: '44px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                color: 'white',
                border: '2px solid rgba(255, 255, 255, 0.25)',
                boxShadow: '0 4px 15px rgba(239, 68, 68, 0.5)',
                cursor: 'pointer',
                fontSize: '20px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 100,
                opacity: isMinting ? 0 : 1,
                pointerEvents: isMinting ? 'none' : 'auto',
                transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                WebkitTapHighlightColor: 'rgba(239, 68, 68, 0.3)',
                touchAction: 'manipulation',
                userSelect: 'none',
                WebkitUserSelect: 'none',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'scale(1.1) rotate(90deg)';
                e.currentTarget.style.boxShadow = '0 6px 25px rgba(239, 68, 68, 0.6)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'scale(1) rotate(0deg)';
                e.currentTarget.style.boxShadow = '0 4px 15px rgba(239, 68, 68, 0.5)';
              }}
            >
              ✕
            </button>
            <DialogBody p={0} pt={1}>
              <NFTRevealModal
                nfts={mintsCreated}
                isMinting={isMinting}
                mintingStage={mintingStage}
                workImage={workimage}
                onClose={handleShowNftClose}
              />
            </DialogBody>
          </DialogContent>
        </DialogRoot>

        {/* Recent Mint Preview Modal - Side-by-side layout */}
        <DialogRoot open={isRecentMintOpen} onOpenChange={(e) => !e.open && onRecentMintClose()}>
          <DialogBackdrop
            bg="rgba(0, 0, 0, 0.9)"
            backdropFilter="blur(20px)"
            position="fixed"
            top="0"
            left="0"
            right="0"
            bottom="0"
            zIndex={1400}
          />
          {/* Transparent close overlay for reliable mobile tap-to-close */}
          {isRecentMintOpen && (
            <div
              onClick={() => onRecentMintClose()}
              onPointerUp={() => onRecentMintClose()}
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 1450,
                background: 'transparent',
                touchAction: 'manipulation',
                cursor: 'pointer',
              }}
            />
          )}
          <DialogContent
            width={{ base: "92%", md: "90%", lg: "85%" }}
            maxW={{ base: "92%", md: "900px", lg: "1000px" }}
            maxH={{ base: "85%", md: "85%" }}
            bg="linear-gradient(135deg, rgba(12, 12, 18, 0.98), rgba(20, 20, 30, 0.98))"
            backdropFilter="blur(24px)"
            border="1px solid rgba(139, 92, 246, 0.25)"
            borderRadius={{ base: "16px", md: "20px" }}
            boxShadow="0 30px 80px -15px rgba(0, 0, 0, 0.7), 0 0 120px rgba(139, 92, 246, 0.15)"
            position="fixed"
            top="0"
            left="0"
            right="0"
            bottom="0"
            margin="auto"
            zIndex={1500}
            overflowX="hidden"
            overflowY={{ base: "auto", md: "hidden" }}
            p={0}
            style={{
              animation: 'modalDramaticEntrance 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
              WebkitOverflowScrolling: 'touch',
            }}
            css={{
              '&::-webkit-scrollbar': { width: '4px' },
              '&::-webkit-scrollbar-track': { background: 'transparent' },
              '&::-webkit-scrollbar-thumb': { background: 'rgba(139, 92, 246, 0.3)', borderRadius: '2px' },
            }}
          >
            <button
              onClick={() => onRecentMintClose()}
              onTouchEnd={() => onRecentMintClose()}
              aria-label="Close"
              style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                width: '44px',
                height: '44px',
                minWidth: '44px',
                minHeight: '44px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                color: 'white',
                border: '2px solid rgba(255, 255, 255, 0.25)',
                boxShadow: '0 4px 15px rgba(239, 68, 68, 0.5)',
                cursor: 'pointer',
                fontSize: '20px',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 100,
                transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                WebkitTapHighlightColor: 'rgba(239, 68, 68, 0.3)',
                touchAction: 'manipulation',
                userSelect: 'none',
                WebkitUserSelect: 'none',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'scale(1.1) rotate(90deg)';
                e.currentTarget.style.boxShadow = '0 6px 25px rgba(239, 68, 68, 0.6)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'scale(1) rotate(0deg)';
                e.currentTarget.style.boxShadow = '0 4px 15px rgba(239, 68, 68, 0.5)';
              }}
            >
              ✕
            </button>
            <DialogBody p={0}>
              {selectedRecentMint && (
                <Flex
                  direction={{ base: "column", md: "row" }}
                  width="100%"
                  height={{ base: "auto", md: "auto" }}
                  maxH={{ base: "none", md: "80vh" }}
                >
                  {/* Left - Large Image/Video */}
                  <Box
                    flex={{ base: "none", md: "1" }}
                    width={{ base: "100%", md: "55%" }}
                    height={{ base: "40vh", md: "auto" }}
                    minH={{ base: "200px", md: "400px" }}
                    maxH={{ base: "40vh", md: "80vh" }}
                    position="relative"
                    bg="rgba(0, 0, 0, 0.3)"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    overflow="hidden"
                  >
                    {(() => {
                      const animUrl = selectedRecentMint.content?.links?.animation_url;
                      const imgUrl = selectedRecentMint.content?.links?.image || selectedRecentMint.content?.files?.[0]?.uri;
                      const mediaUrl = resolveAssetUrl(animUrl || imgUrl);
                      const posterUrl = resolveAssetUrl(imgUrl);
                      // Treat as video if animation_url exists (regardless of extension)
                      const isVideo = !!animUrl || mediaUrl?.match(/\.(mp4|webm|mov)(\?|$)/i);

                      return isVideo ? (
                        <video
                          src={mediaUrl}
                          poster={posterUrl || undefined}
                          autoPlay
                          loop
                          muted
                          playsInline
                          onError={(e) => {
                            // If video fails, replace with poster image
                            const target = e.currentTarget;
                            if (posterUrl && target.parentElement) {
                              const img = document.createElement('img');
                              img.src = posterUrl;
                              img.alt = selectedRecentMint.content?.metadata?.name || 'NFT';
                              img.style.cssText = 'width:100%;height:100%;object-fit:contain;padding:8px;';
                              target.parentElement.replaceChild(img, target);
                            }
                          }}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain',
                            padding: '8px',
                          }}
                        />
                      ) : (
                        <Image
                          src={mediaUrl}
                          alt={selectedRecentMint.content?.metadata?.name || 'NFT'}
                          width="100%"
                          height="100%"
                          objectFit="contain"
                          p={{ base: 2, md: 4 }}
                        />
                      );
                    })()}
                    {/* Subtle gradient overlay */}
                    <Box
                      position="absolute"
                      bottom="0"
                      left="0"
                      right="0"
                      height="60px"
                      background="linear-gradient(to top, rgba(12, 12, 18, 0.8), transparent)"
                      display={{ base: "block", md: "none" }}
                      pointerEvents="none"
                    />
                  </Box>

                  {/* Right - Info & Traits */}
                  <VStack
                    flex={{ base: "1", md: "0 0 45%" }}
                    width={{ base: "100%", md: "45%" }}
                    p={{ base: 4, md: 5 }}
                    pb={{ base: 6, md: 5 }}
                    gap={{ base: 3, md: 4 }}
                    align="stretch"
                    overflowY={{ base: "visible", md: "auto" }}
                    maxH={{ base: "none", md: "80vh" }}
                    css={{
                      '&::-webkit-scrollbar': {
                        width: '6px',
                      },
                      '&::-webkit-scrollbar-track': {
                        background: 'transparent',
                      },
                      '&::-webkit-scrollbar-thumb': {
                        background: 'rgba(139, 92, 246, 0.3)',
                        borderRadius: '3px',
                      },
                    }}
                  >
                    {/* NFT Name */}
                    <VStack gap={1} align={{ base: "center", md: "flex-start" }}>
                      <Text
                        fontSize={{ base: "xs", md: "xs" }}
                        fontWeight="600"
                        color="rgba(139, 92, 246, 0.8)"
                        textTransform="uppercase"
                        letterSpacing="0.15em"
                      >
                        Recent Mint
                      </Text>
                      <Text
                        fontSize={{ base: "xl", md: "2xl" }}
                        fontWeight="800"
                        color="white"
                        textAlign={{ base: "center", md: "left" }}
                        lineHeight="1.2"
                      >
                        {(() => {
                          const nftName = selectedRecentMint.content?.metadata?.name || 'Unknown NFT';
                          const collectionName = collectionStats?.name || '';
                          if (nftName.match(/^#?\d+$/)) {
                            const number = nftName.replace('#', '');
                            return collectionName
                              ? `${collectionName} #${number}`
                              : nftName;
                          }
                          return nftName;
                        })()}
                      </Text>
                    </VStack>

                    {/* Divider */}
                    <Box
                      height="1px"
                      width="100%"
                      bg="linear-gradient(90deg, rgba(139, 92, 246, 0.3), rgba(139, 92, 246, 0.1), transparent)"
                    />

                    {/* Attributes Grid */}
                    {selectedRecentMint.content?.metadata?.attributes && selectedRecentMint.content?.metadata?.attributes.length > 0 && (
                      <VStack gap={2} align="stretch" width="100%">
                        <Text
                          fontSize="xs"
                          fontWeight="700"
                          color="rgba(255, 255, 255, 0.4)"
                          textTransform="uppercase"
                          letterSpacing="0.12em"
                        >
                          Traits ({selectedRecentMint.content.metadata.attributes.length})
                        </Text>
                        <SimpleGrid columns={{ base: 2, md: 2 }} gap={2}>
                          {selectedRecentMint.content.metadata.attributes.map((attr, idx) => (
                            <Box
                              key={idx}
                              p={{ base: 2, md: 2.5 }}
                              borderRadius="10px"
                              bg="rgba(139, 92, 246, 0.08)"
                              border="1px solid rgba(139, 92, 246, 0.15)"
                              transition="all 0.2s ease"
                              _hover={{
                                bg: "rgba(139, 92, 246, 0.15)",
                                borderColor: "rgba(139, 92, 246, 0.3)",
                              }}
                            >
                              <Text
                                fontSize="2xs"
                                color="rgba(255, 255, 255, 0.45)"
                                textTransform="uppercase"
                                letterSpacing="0.05em"
                                mb={0.5}
                              >
                                {attr.trait_type}
                              </Text>
                              <Text
                                fontSize="sm"
                                color="white"
                                fontWeight="600"
                                lineHeight="1.2"
                              >
                                {attr.value}
                              </Text>
                            </Box>
                          ))}
                        </SimpleGrid>
                      </VStack>
                    )}

                    {/* No attributes message */}
                    {(!selectedRecentMint.content?.metadata?.attributes || selectedRecentMint.content?.metadata?.attributes.length === 0) && (
                      <Box
                        p={4}
                        borderRadius="12px"
                        bg="rgba(255, 255, 255, 0.03)"
                        border="1px solid rgba(255, 255, 255, 0.06)"
                        textAlign="center"
                      >
                        <Text fontSize="sm" color="rgba(255, 255, 255, 0.4)">
                          No traits available for this NFT
                        </Text>
                      </Box>
                    )}
                  </VStack>
                </Flex>
              )}
            </DialogBody>
          </DialogContent>
        </DialogRoot>
      </>
    );
  };

  return (
    <main style={{
      height: '100%',
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'flex-start',
      alignItems: 'center',
      overflow: 'auto',
      overscrollBehavior: 'none',
      WebkitOverflowScrolling: 'touch',
    }}>
      <Box
        display="grid"
        gridTemplateColumns={{ base: "minmax(72px, 1fr) auto minmax(72px, 1fr)", md: "1fr auto 1fr" }}
        alignItems="center"
        marginTop={{ base: "8px", md: "10px" }}
        marginBottom={{ base: "6px", md: "8px" }}
        flex="0 0 auto"
        width="100%"
        px={{ base: 2, md: 6 }}
        maxW="1200px"
        minHeight={{ base: "40px", md: "44px" }}
      >
        {/* Left - Project links */}
        <Box display="flex" alignItems="center" justifyContent="flex-start" minWidth="0">
          <SocialLinks {...socialLinks} compact />
        </Box>

        {/* Center - Wallet Connect */}
        <Box
          display="flex"
          alignItems="center"
          justifyContent="center"
          minWidth={{ base: "120px", md: "200px" }}
          minHeight="48px"
        >
          <div className={`${styles.wallet} wallet-button`} style={{ whiteSpace: 'nowrap' }}>
            <WalletMultiButtonDynamic />
          </div>
        </Box>

        {/* Right - Owner controls */}
        <Box display="flex" alignItems="center" justifyContent="flex-end" minWidth="0">
          {adminUiEnabled && wallet.connected && candyMachine && umiWithWallet.identity.publicKey && umiWithWallet.identity.publicKey.toString() === candyMachine.authority.toString() && (
            <Button
              onClick={onInitializerOpen}
              aria-label="Open admin panel"
              bg="linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)"
              color="white"
              borderRadius="14px"
              fontWeight="700"
              fontSize={{ base: "0.75rem", md: "0.85rem" }}
              height={{ base: "42px", md: "44px" }}
              px={{ base: 2, sm: 4, md: 5 }}
              gap={1}
              border="1px solid rgba(139, 92, 246, 0.4)"
              backdropFilter="blur(12px)"
              boxShadow="0 4px 20px rgba(139, 92, 246, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)"
              position="relative"
              overflow="hidden"
              _before={{
                content: '""',
                position: "absolute",
                top: 0,
                left: "-100%",
                width: "100%",
                height: "100%",
                background: "linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent)",
                transition: "left 0.5s ease",
              }}
              _hover={{
                transform: "translateY(-2px)",
                boxShadow: "0 8px 30px rgba(139, 92, 246, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.15)",
                bg: "linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)",
                _before: {
                  left: "100%",
                },
              }}
              _active={{
                transform: "translateY(0px)",
                boxShadow: "0 2px 10px rgba(139, 92, 246, 0.3)",
              }}
              transition="all 0.3s cubic-bezier(0.22, 1, 0.36, 1)"
            >
              <Box as="span">⚙️</Box>
              <Box as="span" display={{ base: "none", sm: "inline" }}>Admin</Box>
            </Button>
          )}
        </Box>
      </Box>

      {/* Admin Modal */}
      {adminUiEnabled && wallet.connected && candyMachine && umiWithWallet.identity.publicKey && umiWithWallet.identity.publicKey.toString() === candyMachine.authority.toString() && (
        <DialogRoot open={isInitializerOpen} onOpenChange={(e) => !e.open && onInitializerClose()}>
          <DialogBackdrop
            bg="rgba(0, 0, 0, 0.85)"
            backdropFilter="blur(15px)"
            position="fixed"
            top="0"
            left="0"
            right="0"
            bottom="0"
            zIndex={1400}
          />
          <DialogContent
            maxW="650px"
            width={{ base: "95%", md: "600px" }}
            bg="linear-gradient(135deg, rgba(15, 15, 25, 0.98), rgba(25, 25, 40, 0.98))"
            backdropFilter="blur(24px)"
            border="1px solid rgba(139, 92, 246, 0.3)"
            borderRadius="20px"
            boxShadow="0 25px 60px -12px rgba(0, 0, 0, 0.6), 0 0 80px rgba(139, 92, 246, 0.15)"
            position="fixed"
            top="0"
            left="0"
            right="0"
            bottom="0"
            margin="auto"
            zIndex={1500}
            p={{ base: 4, md: 6 }}
            maxH="90%"
            overflowY="auto"
            css={{
              '&::-webkit-scrollbar': {
                width: '6px',
              },
              '&::-webkit-scrollbar-track': {
                background: 'rgba(0, 0, 0, 0.2)',
                borderRadius: '3px',
              },
              '&::-webkit-scrollbar-thumb': {
                background: 'rgba(139, 92, 246, 0.5)',
                borderRadius: '3px',
              },
              '&::-webkit-scrollbar-thumb:hover': {
                background: 'rgba(139, 92, 246, 0.7)',
              },
            }}
          >
            <DialogHeader
              color="white"
              fontSize={{ base: "1.1rem", md: "1.3rem" }}
              fontWeight="800"
              letterSpacing="-0.01em"
              pb={4}
              borderBottom="1px solid rgba(139, 92, 246, 0.2)"
              mb={4}
            >
              <Box display="flex" alignItems="center" gap={2}>
                <Box
                  as="span"
                  bg="linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)"
                  p={2}
                  borderRadius="10px"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                >
                  ⚙️
                </Box>
                Admin Panel
              </Box>
            </DialogHeader>
            <DialogCloseTrigger
              color="rgba(255, 255, 255, 0.7)"
              top={4}
              right={4}
              _hover={{
                color: "white",
                bg: "rgba(139, 92, 246, 0.2)",
                transform: "scale(1.1)",
              }}
              transition="all 0.2s ease"
              borderRadius="8px"
            />
            <DialogBody p={0}>
              <InitializeModal umi={umiWithWallet} candyMachine={candyMachine} candyGuard={candyGuard} />
            </DialogBody>
          </DialogContent>
        </DialogRoot>
      )}

      <div className={styles.center} style={{ flex: '1 1 auto', height: '100%', width: '100%' }}>
        {renderPageContent(image)}
      </div>
    </main>
  );
}

// Force dynamic rendering to avoid static generation issues with wallet adapters
export const getServerSideProps = async () => {
  return { props: {} };
};
