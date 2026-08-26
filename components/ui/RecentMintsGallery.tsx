// Modern Recent Mints Gallery - Editorial Gallery Aesthetic
// Premium carousel with hover previews and smooth animations

import { Box, Flex, VStack, Text, Image } from '@chakra-ui/react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { GlassCard } from './GlassCard';

interface NFTMint {
  content?: {
    links?: { image?: string; animation_url?: string };
    files?: { uri?: string; mime?: string }[];
    metadata?: {
      name?: string;
      attributes?: { trait_type?: string; value?: string }[];
    };
  };
}

interface RecentMintsGalleryProps {
  mints: NFTMint[];
  loading?: boolean;
  onMintClick: (mint: NFTMint) => void;
}

const MotionBox = motion(Box);
const MotionImage = motion(Image);

// Single mint card with hover preview
// Fix image URLs - add Arweave prefix if needed
const fixImageUrl = (url: string | undefined): string => {
  if (!url) return '';
  // Already a full URL
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  // Arweave hash (base58 string)
  if (/^[1-9A-HJ-NP-Za-km-z]{32,}/.test(url)) {
    return `https://arweave.net/${url}`;
  }
  // IPFS hash
  if (url.startsWith('Qm') || url.startsWith('bafy')) {
    return `https://ipfs.io/ipfs/${url}`;
  }
  return url;
};

// Detect mobile for video optimization
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return isMobile;
};

const MintCard = ({
  mint,
  index,
  onClick,
}: {
  mint: NFTMint;
  index: number;
  onClick: () => void;
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const isMobile = useIsMobile();
  // Prefer animation_url (MP4 video) over static image for animated NFTs
  const animationUrl = mint.content?.links?.animation_url;
  const staticImageUrl = mint.content?.links?.image || mint.content?.files?.[0]?.uri || '';
  const rawMediaUrl = animationUrl || staticImageUrl;
  const mediaUrl = fixImageUrl(rawMediaUrl);
  const posterUrl = fixImageUrl(staticImageUrl);
  const isVideo = mediaUrl?.match(/\.(mp4|webm|mov)(\?|$)/i) ||
    (animationUrl && !animationUrl.match(/\.(gif|png|jpg|jpeg|webp|svg)(\?|$)/i));
  const name = mint.content?.metadata?.name || `NFT #${index + 1}`;

  return (
    <MotionBox
      position="relative"
      flex="0 0 auto"
      width={{ base: "100px", sm: "120px", md: "140px", lg: "160px" }}
      cursor="pointer"
      onClick={onClick}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      whileHover={{ y: -6, transition: { duration: 0.2 } }}
      style={{ touchAction: 'pan-x' }}
    >
      <Box
        position="relative"
        borderRadius="14px"
        overflow="hidden"
        bg="rgba(15, 15, 25, 0.8)"
        border="1px solid"
        borderColor={isHovered ? 'rgba(139, 92, 246, 0.5)' : 'rgba(255, 255, 255, 0.1)'}
        boxShadow={isHovered
          ? '0 12px 40px rgba(139, 92, 246, 0.3), 0 0 0 1px rgba(139, 92, 246, 0.2)'
          : '0 4px 20px rgba(0, 0, 0, 0.4)'
        }
        transition="all 0.3s cubic-bezier(0.22, 1, 0.36, 1)"
      >
        {/* Image container */}
        <Box
          position="relative"
          width="100%"
          paddingBottom="100%"
          overflow="hidden"
        >
          {mediaUrl && isVideo ? (
            isMobile && posterUrl ? (
              // On mobile: show poster image to save bandwidth/battery
              <MotionImage
                src={posterUrl}
                alt={name}
                position="absolute"
                top="0"
                left="0"
                width="100%"
                height="100%"
                objectFit="cover"
                loading="lazy"
                animate={{
                  scale: isHovered ? 1.08 : 1,
                }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              />
            ) : (
              // On desktop: autoplay video
              <motion.video
                src={mediaUrl}
                poster={posterUrl || undefined}
                autoPlay
                loop
                muted
                playsInline
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
                animate={{
                  scale: isHovered ? 1.08 : 1,
                }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              />
            )
          ) : mediaUrl ? (
            <MotionImage
              src={mediaUrl}
              alt={name}
              position="absolute"
              top="0"
              left="0"
              width="100%"
              height="100%"
              objectFit="cover"
              animate={{
                scale: isHovered ? 1.08 : 1,
              }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            />
          ) : (
            <Box
              position="absolute"
              top="0"
              left="0"
              width="100%"
              height="100%"
              bg="linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(59, 130, 246, 0.2))"
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              <Text fontSize="2xl">🖼️</Text>
            </Box>
          )}

          {/* Gradient overlay */}
          <Box
            position="absolute"
            bottom="0"
            left="0"
            right="0"
            height="50%"
            background="linear-gradient(to top, rgba(0, 0, 0, 0.7), transparent)"
            pointerEvents="none"
          />

          {/* Hover shine effect */}
          <AnimatePresence>
            {isHovered && (
              <MotionBox
                position="absolute"
                top="0"
                left="-100%"
                width="100%"
                height="100%"
                background="linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent)"
                initial={{ left: '-100%' }}
                animate={{ left: '200%' }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6, ease: 'easeInOut' }}
                pointerEvents="none"
              />
            )}
          </AnimatePresence>
        </Box>

        {/* Info section */}
        <VStack p={{ base: 1.5, md: 2 }} gap={0.5} align="stretch">
          <Text
            fontSize={{ base: "2xs", sm: "xs", md: "xs" }}
            fontWeight="700"
            color="white"
            lineClamp={1}
          >
            {name}
          </Text>
          <Flex align="center" gap={1}>
            <MotionBox
              width="4px"
              height="4px"
              borderRadius="full"
              bg="#10b981"
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.7, 1, 0.7],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
            <Text fontSize={{ base: "2xs", md: "2xs" }} color="rgba(16, 185, 129, 0.9)" fontWeight="500">
              Just minted
            </Text>
          </Flex>
        </VStack>
      </Box>
    </MotionBox>
  );
};

export const RecentMintsGallery = ({
  mints,
  loading = false,
  onMintClick,
}: RecentMintsGalleryProps) => {
  if (mints.length === 0 && !loading) return null;

  return (
    <Box width="100%" maxW="1000px" mx="auto" mt={{ base: 1, md: 1.5 }}>
      <GlassCard
        variant="subtle"
        p={{ base: 2, md: 3 }}
        hoverEffect={false}
        overflow="visible"
      >
        <VStack gap={{ base: 2, md: 2.5 }} align="stretch">
          {/* Header */}
          <Flex align="center" justify="space-between" px={1}>
            <Flex align="center" gap={1}>
              <Text fontSize={{ base: "xs", md: "sm" }}>🔥</Text>
              <Text
                fontSize={{ base: "xs", md: "sm" }}
                fontWeight="600"
                color="white"
              >
                Recent Mints
              </Text>
            </Flex>
            <Text
              fontSize={{ base: "2xs", md: "2xs" }}
              color="rgba(255, 255, 255, 0.35)"
              fontWeight="500"
            >
              {mints.length} shown
            </Text>
          </Flex>

        {/* Gallery */}
        {loading ? (
          <Flex gap={2} overflowX="hidden" px={1}>
            {[...Array(6)].map((_, i) => (
              <Box
                key={i}
                flex="0 0 auto"
                width={{ base: "100px", sm: "120px", md: "140px" }}
                paddingBottom={{ base: "100px", sm: "120px", md: "140px" }}
                borderRadius="14px"
                bg="rgba(255, 255, 255, 0.03)"
                position="relative"
                overflow="hidden"
              >
                <MotionBox
                  position="absolute"
                  top="0"
                  left="-100%"
                  width="100%"
                  height="100%"
                  background="linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.08), transparent)"
                  animate={{ left: ['100%'] }}
                  transition={{
                    duration: 1.2,
                    repeat: Infinity,
                    ease: 'linear',
                    delay: i * 0.1,
                  }}
                />
              </Box>
            ))}
          </Flex>
        ) : (
          <Box position="relative">
            <Flex
              gap={{ base: 1.5, sm: 2, md: 2 }}
              overflowX="auto"
              pb={1.5}
              px={1}
              style={{
                WebkitOverflowScrolling: 'touch',
                touchAction: 'pan-x',
              }}
              css={{
                scrollbarWidth: 'thin',
                scrollbarColor: 'rgba(139, 92, 246, 0.3) transparent',
                scrollSnapType: 'x proximity',
                '&::-webkit-scrollbar': {
                  height: '6px',
                },
                '&::-webkit-scrollbar-track': {
                  background: 'transparent',
                  borderRadius: '6px',
                },
                '&::-webkit-scrollbar-thumb': {
                  background: 'rgba(139, 92, 246, 0.4)',
                  borderRadius: '6px',
                },
                '&::-webkit-scrollbar-thumb:hover': {
                  background: 'rgba(139, 92, 246, 0.6)',
                },
              }}
            >
              {mints.slice(0, 10).map((mint, idx) => (
                <MintCard
                  key={idx}
                  mint={mint}
                  index={idx}
                  onClick={() => onMintClick(mint)}
                />
              ))}
            </Flex>

            {/* Scroll hint - fade gradient on right */}
            {mints.length > 4 && (
              <MotionBox
                position="absolute"
                right="0"
                top="0"
                bottom="1.5"
                width="60px"
                background="linear-gradient(to left, rgba(15, 15, 25, 0.95), transparent)"
                pointerEvents="none"
                display="flex"
                alignItems="center"
                justifyContent="flex-end"
                pr={2}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <MotionBox
                  animate={{ x: [0, 5, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <Text fontSize="lg" color="rgba(255, 255, 255, 0.3)">→</Text>
                </MotionBox>
              </MotionBox>
            )}
          </Box>
        )}
        </VStack>
      </GlassCard>
    </Box>
  );
};

export default RecentMintsGallery;
