import { JsonMetadata } from "@metaplex-foundation/mpl-token-metadata";
import { PublicKey } from "@metaplex-foundation/umi";
import { Box, Text, Separator, SimpleGrid, Image, Button, Flex } from "@chakra-ui/react";
import { useState, useEffect, type CSSProperties } from "react";
import { getCoreExplorerUrl } from "../utils/network";
import { mintPageUrl, twitterHashtags } from "../settings";

// Fix image URLs - add Arweave/IPFS prefix if needed
const fixImageUrl = (url: string | undefined): string => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  // Arweave hash (base58 string, may have ?ext=png suffix)
  if (/^[1-9A-HJ-NP-Za-km-z]{32,}/.test(url)) return `https://arweave.net/${url}`;
  // IPFS hash
  if (url.startsWith('Qm') || url.startsWith('bafy')) return `https://ipfs.io/ipfs/${url}`;
  return url;
};
import {
  AccordionRoot,
  AccordionItem,
  AccordionItemTrigger,
  AccordionItemContent,
  AccordionItemIndicator,
} from "@chakra-ui/react";

const deterministicValue = (seed: number): number => {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
};

// Particle component. Values are derived from the particle index so rerenders
// cannot unexpectedly move an already rendered particle.
const Particle = ({ delay, index }: { delay: number; index: number }) => {
  const angle = deterministicValue(index + 1) * Math.PI * 2;
  const distance = 150 + deterministicValue(index + 101) * 100;
  const tx = Math.cos(angle) * distance;
  const ty = Math.sin(angle) * distance;
  const size = 4 + deterministicValue(index + 201) * 8;
  const colors = ['rgba(78, 205, 196, 0.8)', 'rgba(255, 107, 107, 0.8)', 'rgba(255, 193, 7, 0.8)', 'rgba(156, 39, 176, 0.8)'];
  const color = colors[Math.floor(deterministicValue(index + 301) * colors.length)];

  return (
    <Box
      position="absolute"
      top="50%"
      left="50%"
      width={`${size}px`}
      height={`${size}px`}
      borderRadius="full"
      bg={color}
      style={{
        '--tx': `${tx}px`,
        '--ty': `${ty}px`,
        animation: `particle 1s ease-out ${delay}s forwards`,
      } as CSSProperties}
    />
  );
};

// Floating particle component
const FloatingParticle = ({ delay, index }: { delay: number; index: number }) => {
  const drift = (deterministicValue(index + 401) - 0.5) * 200;
  const size = 2 + deterministicValue(index + 501) * 4;
  const duration = 3 + deterministicValue(index + 601) * 4;
  const left = deterministicValue(index + 701) * 100;
  const colors = ['rgba(78, 205, 196, 0.6)', 'rgba(255, 107, 107, 0.6)', 'rgba(255, 193, 7, 0.6)'];
  const color = colors[Math.floor(deterministicValue(index + 801) * colors.length)];

  return (
    <Box
      position="absolute"
      bottom="0"
      left={`${left}%`}
      width={`${size}px`}
      height={`${size}px`}
      borderRadius="full"
      bg={color}
      style={{
        '--drift': `${drift}px`,
        animation: `floatParticle ${duration}s ease-in ${delay}s infinite`,
      } as CSSProperties}
    />
  );
};

interface TraitProps {
  heading: string;
  description: string;
}

interface TraitsProps {
  metadata: JsonMetadata;
}
const Trait = ({ heading, description, index }: TraitProps & { index: number }) => {
  return (
    <Box
      background="linear-gradient(135deg, rgba(78, 205, 196, 0.15), rgba(68, 160, 141, 0.15))"
      borderRadius="8px"
      p={2}
      border="1px solid rgba(78, 205, 196, 0.3)"
      transition="all 0.3s ease"
      _hover={{
        transform: "translateY(-3px) scale(1.05)",
        background: "linear-gradient(135deg, rgba(78, 205, 196, 0.25), rgba(68, 160, 141, 0.25))",
        boxShadow: "0 4px 12px rgba(78, 205, 196, 0.3)",
        border: "1px solid rgba(78, 205, 196, 0.5)"
      }}
      style={{
        animation: `attributeFadeIn 0.5s ease-out ${0.1 + index * 0.05}s backwards`
      }}
    >
      <Text
        fontSize="xs"
        color="rgba(255, 255, 255, 0.6)"
        textAlign="center"
        wordBreak="break-word"
      >
        {heading}
      </Text>
      <Text
        fontSize="sm"
        fontWeight="600"
        color="white"
        textAlign="center"
        wordBreak="break-word"
        mt={1}
      >
        {description}
      </Text>
    </Box>
  );
};

const Traits = ({ metadata }: TraitsProps) => {
  if (metadata === undefined || metadata.attributes === undefined) {
    return <></>;
  }

  //find all attributes with trait_type and value
  const traits = metadata.attributes.filter(
    (a) => a.trait_type !== undefined && a.value !== undefined
  );
  const traitList = traits.map((t, index) => (
    <Trait
      key={t.trait_type}
      heading={t.trait_type ?? ""}
      description={t.value ?? ""}
      index={index}
    />
  ));

  return (
    <>
      <Separator marginTop={{ base: "12px", md: "20px" }} borderColor="rgba(78, 205, 196, 0.3)" />
      <Text fontWeight="bold" color="white" fontSize={{ base: "sm", md: "md" }} mt={{ base: 2, md: 4 }} mb={2}>✨ Attributes</Text>
      <SimpleGrid columns={{ base: 2, md: 3 }} gap={{ base: 2, md: 3 }}>
        {traitList}
      </SimpleGrid>
    </>
  );
};

export default function Card({
  metadata,
  mint,
}: {
  metadata: JsonMetadata | undefined;
  mint?: PublicKey;
}) {
  const [showParticles, setShowParticles] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    const animationFrame = window.requestAnimationFrame(() => setHasAnimated(true));
    const timer = window.setTimeout(() => setShowParticles(true), 800);
    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.clearTimeout(timer);
    };
  }, []);

  // Get the images from the metadata if animation_url is present use this
  if (!metadata) {
    return <></>;
  }
  const rawImageUrl = metadata.animation_url ?? metadata.image;
  const imageUrl = fixImageUrl(rawImageUrl);
  const fallbackImageUrl = fixImageUrl(metadata.image);
  const isVideo = imageUrl?.match(/\.(mp4|webm|mov)(\?|$)/i) ||
    (metadata.animation_url && !metadata.animation_url.match(/\.(gif|png|jpg|jpeg|webp|svg)(\?|$)/i));

  const shareToTwitter = () => {
    const nftName = metadata.name || "My NFT";

    // Get PNG image URL (prefer image over animation_url for Twitter)
    let imageForTwitter = fixImageUrl(metadata.image || "");

    // If it's an Arweave URL, ensure it has ?ext=png for proper Twitter preview
    if (imageForTwitter && !imageForTwitter.includes("?ext=")) {
      imageForTwitter = `${imageForTwitter}?ext=png`;
    }

    // Build hashtags string
    const hashtags = twitterHashtags.map(tag => `#${tag}`).join(" ");

    // Build tweet text with image URL
    const tweetText = `Just minted ${nftName}! 🎉\n\n${imageForTwitter}\n\nMint is Live at: ${mintPageUrl}\n\n${hashtags}`;

    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
    window.open(twitterUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <Box position="relative" width="full" overflow="visible" p={{ base: 2, md: 4 }}>
      {/* Floating ambient particles */}
      {[...Array(20)].map((_, i) => (
        <FloatingParticle key={`float-${i}`} delay={i * 0.2} index={i} />
      ))}

      {/* NFT Image with reveal animation */}
      <Box
        width="100%"
        maxW={{ base: "100%", md: "500px" }}
        mx="auto"
        position="relative"
        style={{
          animation: hasAnimated
            ? 'glowPulse 3s ease-in-out infinite'
            : 'nftReveal 1.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards, glowPulse 3s ease-in-out infinite 1.5s',
          transformStyle: 'preserve-3d',
        }}
      >

        {/* Particle burst */}
        {showParticles && (
          <Box position="absolute" top="50%" left="50%" zIndex={10} pointerEvents="none">
            {[...Array(50)].map((_, i) => (
              <Particle key={i} delay={i * 0.015} index={i} />
            ))}
          </Box>
        )}

        {/* Enhanced shimmer effect overlay */}
        <Box
          position="absolute"
          top="0"
          left="0"
          right="0"
          bottom="0"
          background="linear-gradient(110deg,
            transparent 0%,
            transparent 40%,
            rgba(255,255,255,0.15) 50%,
            transparent 60%,
            transparent 100%)"
          backgroundSize="200% 100%"
          style={{
            animation: 'shimmer 3s infinite',
            animationDelay: '1.5s',
          }}
          pointerEvents="none"
          zIndex={2}
          borderRadius="12px"
        />

        {imageUrl && isVideo ? (
          <video
            src={imageUrl}
            poster={fallbackImageUrl || undefined}
            autoPlay
            loop
            muted
            playsInline
            style={{
              width: "100%",
              maxHeight: "400px",
              objectFit: "contain",
              position: "relative",
              zIndex: 1,
              borderRadius: "12px",
            }}
          />
        ) : imageUrl ? (
          <Image
            src={imageUrl}
            alt={metadata.name || "NFT Image"}
            width="100%"
            height="auto"
            objectFit="contain"
            maxH="400px"
            position="relative"
            zIndex={1}
          />
        ) : (
          <Box
            width="100%"
            height="400px"
            bg="rgba(60, 60, 80, 0.5)"
            display="flex"
            alignItems="center"
            justifyContent="center"
            position="relative"
            zIndex={1}
          >
            <Text color="rgba(255, 255, 255, 0.6)">No image available</Text>
          </Box>
        )}
      </Box>

      {/* Title with slide-in animation */}
      <Text
        fontWeight="bold"
        marginTop={{ base: "12px", md: "20px" }}
        color="white"
        fontSize={{ base: "lg", md: "xl" }}
        textAlign="center"
        px={{ base: 2, md: 0 }}
        style={{
          animation: 'titleSlideIn 0.6s ease-out 1.3s backwards',
        }}
      >
        {metadata.name}
      </Text>

      <Text
        color="rgba(255, 255, 255, 0.8)"
        fontSize={{ base: "sm", md: "md" }}
        mt={2}
        textAlign="center"
        px={{ base: 2, md: 0 }}
        style={{
          animation: 'titleSlideIn 0.6s ease-out 1.5s backwards',
        }}
      >
        {metadata.description}
      </Text>

      {/* Buttons with slide-in from sides */}
      <Flex
        justifyContent="center"
        mt={4}
        gap={{ base: 2, md: 3 }}
        flexDirection={{ base: "column", sm: "row" }}
        width="100%"
        px={{ base: 2, md: 0 }}
      >
        <Button
          onClick={shareToTwitter}
          bg="linear-gradient(135deg, #1DA1F2 0%, #0d8bd9 100%)"
          color="white"
          size={{ base: "sm", md: "md" }}
          px={{ base: 4, md: 6 }}
          py={2}
          borderRadius="12px"
          fontWeight="bold"
          fontSize={{ base: "xs", md: "sm" }}
          width={{ base: "100%", sm: "auto" }}
          position="relative"
          overflow="hidden"
          _hover={{
            transform: "translateY(-3px) scale(1.05)",
            boxShadow: "0 10px 30px rgba(29, 161, 242, 0.6), 0 0 40px rgba(29, 161, 242, 0.3)"
          }}
          _active={{
            transform: "translateY(-1px) scale(1.02)"
          }}
          transition="all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)"
          style={{
            animation: 'buttonSlideLeft 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) 1.8s backwards',
          }}
        >
          🐦 Share on Twitter
        </Button>
        {mint && (
          <Button
            onClick={() => window.open(getCoreExplorerUrl(mint.toString()), '_blank', 'noopener,noreferrer')}
            bg="linear-gradient(135deg, rgba(138, 43, 226, 0.8) 0%, rgba(75, 0, 130, 0.8) 100%)"
            color="white"
            size={{ base: "sm", md: "md" }}
            px={{ base: 4, md: 6 }}
            py={2}
            borderRadius="12px"
            fontWeight="bold"
            fontSize={{ base: "xs", md: "sm" }}
            width={{ base: "100%", sm: "auto" }}
            position="relative"
            overflow="hidden"
            _hover={{
              transform: "translateY(-3px) scale(1.05)",
              boxShadow: "0 10px 30px rgba(138, 43, 226, 0.6), 0 0 40px rgba(138, 43, 226, 0.3)"
            }}
            _active={{
              transform: "translateY(-1px) scale(1.02)"
            }}
            transition="all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)"
            style={{
              animation: 'buttonSlideRight 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) 1.8s backwards',
            }}
          >
            🔍 View on Explorer
          </Button>
        )}
      </Flex>

      <Box
        style={{
          animation: 'titleSlideIn 0.6s ease-out 1.9s backwards',
        }}
      >
        <Traits metadata={metadata} />
      </Box>
    </Box>
  );
}

type Props = {
  nfts:
    | { mint: PublicKey; offChainMetadata: JsonMetadata | undefined }[]
    | undefined;
};

export const ShowNft = ({ nfts }: Props) => {
  if (nfts === undefined || nfts.length === 0) {
    return <></>;
  }

  // For single NFT, show full card without accordion
  if (nfts.length === 1) {
    return (
      <Box width="100%" maxW="600px" mx="auto">
        <Card metadata={nfts[0].offChainMetadata} mint={nfts[0].mint} />
      </Box>
    );
  }

  // For multiple NFTs, show in grid with accordions
  const cards = nfts.map((nft, index) => (
    <AccordionItem
      key={nft.mint + "Accordion"}
      value={nft.mint}
      bg="rgba(40, 40, 60, 0.4)"
      borderRadius="12px"
      border="2px solid"
      borderColor="rgba(78, 205, 196, 0.3)"
      mb={3}
    >
      <AccordionItemTrigger
        color="white"
        bg="rgba(50, 50, 70, 0.6)"
        _hover={{ bg: "rgba(60, 60, 80, 0.8)" }}
        borderRadius="12px"
        p={4}
      >
        <Box as="span" flex="1" textAlign="left" fontWeight="700" fontSize="lg">
          {nft.offChainMetadata?.name || `NFT #${index + 1}`}
        </Box>
        <AccordionItemIndicator />
      </AccordionItemTrigger>
      <AccordionItemContent pb={4}>
        <Card metadata={nft.offChainMetadata} mint={nft.mint} key={nft.mint} />
      </AccordionItemContent>
    </AccordionItem>
  ));

  return (
    <Box width="100%">
      <AccordionRoot defaultValue={nfts.map(n => n.mint)} multiple>
        <SimpleGrid columns={{ base: 1, md: nfts.length > 2 ? 2 : 1 }} gap={4} width="100%">
          {cards}
        </SimpleGrid>
      </AccordionRoot>
    </Box>
  );
};
