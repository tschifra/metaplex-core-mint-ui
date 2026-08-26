// Premium NFT Reveal Modal - Cinematic Reveal Experience
// One-of-a-kind reveal animation with golden light, particles, and dramatic unveiling

import {
  Box,
  VStack,
  HStack,
  Text,
  Image,
  SimpleGrid,
  Flex,
} from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import { PublicKey } from '@metaplex-foundation/umi';
import { JsonMetadata } from '@metaplex-foundation/mpl-token-metadata';
import { getCoreExplorerUrl } from '../../utils/network';
import { mintPageUrl, twitterHashtags } from '../../settings';
import { buildMintShareUrl, openExternalUrl, resolveAssetUrl } from '../../utils/assetMedia';
import { useAutoplayVideo } from '../../utils/useAutoplayVideo';

interface NFTData {
  mint: PublicKey;
  offChainMetadata: JsonMetadata | undefined;
}

interface NFTRevealModalProps {
  nfts: NFTData[] | undefined;
  isMinting: boolean;
  mintingStage?: string;
  workImage: string;
  onClose: () => void;
}

const MotionBox = motion.create(Box);
const MotionImage = motion.create(Image);
const MotionText = motion.create(Text);

const deterministicValue = (seed: number): number => {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
};

// Golden particle burst for reveal moment
const GoldenParticleBurst = ({ active }: { active: boolean }) => {
  if (!active) return null;

  const particles = Array.from({ length: 40 }, (_, i) => {
    const angle = (i / 40) * Math.PI * 2;
    const distance = 120 + deterministicValue(i + 1) * 180;
    const tx = Math.cos(angle) * distance;
    const ty = Math.sin(angle) * distance;
    const size = 4 + deterministicValue(i + 101) * 8;
    const colors = ['#FFD700', '#FFA500', '#FFEC8B', '#8b5cf6', '#10b981'];
    const color = colors[Math.floor(deterministicValue(i + 201) * colors.length)];
    const delay = deterministicValue(i + 301) * 0.3;

    return { tx, ty, size, color, delay };
  });

  return (
    <Box
      position="absolute"
      top="50%"
      left="50%"
      width="0"
      height="0"
      pointerEvents="none"
      zIndex={30}
    >
      {particles.map((p, i) => (
        <MotionBox
          key={i}
          position="absolute"
          width={`${p.size}px`}
          height={`${p.size}px`}
          borderRadius="full"
          bg={p.color}
          boxShadow={`0 0 ${p.size * 2}px ${p.color}`}
          initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
          animate={{
            x: p.tx,
            y: p.ty,
            scale: 0,
            opacity: 0,
          }}
          transition={{
            duration: 1.2,
            delay: p.delay,
            ease: [0.22, 1, 0.36, 1],
          }}
        />
      ))}
    </Box>
  );
};

// Sparkle field effect
const SparkleField = ({ active }: { active: boolean }) => {
  if (!active) return null;

  const sparkles = Array.from({ length: 24 }, (_, i) => ({
    x: 10 + deterministicValue(i + 401) * 80,
    y: 10 + deterministicValue(i + 501) * 80,
    delay: 0.5 + deterministicValue(i + 601) * 2,
    duration: 0.6 + deterministicValue(i + 701) * 0.8,
    size: 3 + deterministicValue(i + 801) * 5,
  }));

  return (
    <Box position="absolute" inset="0" pointerEvents="none" zIndex={25}>
      {sparkles.map((sparkle, i) => (
        <MotionBox
          key={i}
          position="absolute"
          left={`${sparkle.x}%`}
          top={`${sparkle.y}%`}
          width={`${sparkle.size}px`}
          height={`${sparkle.size}px`}
          bg="radial-gradient(circle, #FFD700, transparent)"
          borderRadius="full"
          boxShadow="0 0 12px rgba(255, 215, 0, 0.9)"
          initial={{ opacity: 0, scale: 0 }}
          animate={{
            opacity: [0, 1, 0],
            scale: [0, 1.5, 0],
            rotate: [0, 180],
          }}
          transition={{
            duration: sparkle.duration,
            delay: sparkle.delay,
            ease: 'easeInOut',
            repeat: 2,
          }}
        />
      ))}
    </Box>
  );
};

// Ring pulse effect
const RingPulse = ({ active }: { active: boolean }) => {
  if (!active) return null;

  return (
    <>
      {[0, 0.3, 0.6].map((delay, i) => (
        <MotionBox
          key={i}
          position="absolute"
          top="50%"
          left="50%"
          width="100%"
          height="100%"
          borderRadius="20px"
          border="3px solid"
          borderColor="rgba(255, 215, 0, 0.6)"
          style={{ x: '-50%', y: '-50%' }}
          initial={{ scale: 1, opacity: 0.8 }}
          animate={{
            scale: [1, 1.4, 1.8],
            opacity: [0.8, 0.3, 0],
          }}
          transition={{
            duration: 1.5,
            delay: delay,
            ease: 'easeOut',
          }}
          pointerEvents="none"
        />
      ))}
    </>
  );
};

// Premium NFT card with dramatic reveal
const NFTCard = ({
  nft,
  startAnimation = true,
}: {
  nft: NFTData;
  startAnimation?: boolean;
}) => {
  const [revealStage, setRevealStage] = useState<'hidden' | 'revealing' | 'revealed'>('hidden');
  const [showParticles, setShowParticles] = useState(false);
  const [showSparkles, setShowSparkles] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const metadataPending = !nft.offChainMetadata;
  const metadata: JsonMetadata = nft.offChainMetadata ?? {
    name: 'Mint confirmed',
  };
  const videoUrl = resolveAssetUrl(metadata?.animation_url);
  const imageUrl = resolveAssetUrl(metadata?.image);
  const isVideo = !videoFailed && !!videoUrl;

  useEffect(() => {
    // Only start animation when explicitly told to (when card becomes visible)
    if (!startAnimation) return;

    // Dramatic reveal sequence with slight delay for crossfade
    const timer1 = setTimeout(() => {
      setRevealStage('revealing');
      setShowParticles(true);
    }, 400); // Delay to allow parent fade-in to complete

    const timer2 = setTimeout(() => {
      setShowSparkles(true);
    }, 900);

    const timer3 = setTimeout(() => {
      setRevealStage('revealed');
    }, 2100);

    const timer4 = setTimeout(() => {
      setShowParticles(false);
    }, 1600);

    const timer5 = setTimeout(() => {
      setShowSparkles(false);
    }, 4100);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
      clearTimeout(timer5);
    };
  }, [startAnimation]);

  useAutoplayVideo(videoRef, isVideo && startAnimation);

  // Display URL: video if available, otherwise image
  const displayUrl = isVideo ? videoUrl : imageUrl;
  const attributes = metadata.attributes?.filter((a) => a.trait_type && a.value) || [];

  const shareToTwitter = () => {
    openExternalUrl(buildMintShareUrl(metadata, mintPageUrl, twitterHashtags));
  };

  return (
    <MotionBox
      position="relative"
      width="100%"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Desktop: Side-by-side layout | Mobile: Stacked */}
      <Flex
        direction={{ base: 'column', md: 'row' }}
        gap={{ base: 5, md: 6 }}
        align={{ base: 'center', md: 'flex-start' }}
        width="100%"
      >
        {/* Left: NFT Image with dramatic reveal */}
        <Box
          position="relative"
          flexShrink={0}
          width={{ base: '100%', md: '380px' }}
          maxW={{ base: '320px', md: '380px' }}
        >
          {/* Golden glow background */}
          <MotionBox
            position="absolute"
            top="50%"
            left="50%"
            width="110%"
            height="110%"
            borderRadius="24px"
            background="radial-gradient(circle, rgba(255, 215, 0, 0.4) 0%, rgba(255, 165, 0, 0.2) 40%, transparent 70%)"
            style={{ x: '-50%', y: '-50%' }}
            initial={{ scale: 0, opacity: 0 }}
            animate={revealStage !== 'hidden' ? {
              scale: [0, 1.5, 1.2],
              opacity: [0, 1, 0.6],
            } : {}}
            transition={{
              duration: 1.5,
              ease: [0.22, 1, 0.36, 1],
            }}
            pointerEvents="none"
          />

          {/* Pulsing glow effect */}
          {revealStage === 'revealed' && (
            <MotionBox
              position="absolute"
              top="50%"
              left="50%"
              width="95%"
              height="95%"
              borderRadius="18px"
              background="radial-gradient(circle, rgba(139, 92, 246, 0.3) 0%, transparent 70%)"
              style={{ x: '-50%', y: '-50%' }}
              animate={{
                scale: [1, 1.1, 1],
                opacity: [0.4, 0.7, 0.4],
              }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              pointerEvents="none"
            />
          )}

          {/* Particle burst */}
          <GoldenParticleBurst active={showParticles} />

          {/* Ring pulse */}
          <RingPulse active={showParticles} />

          {/* Sparkle field */}
          <SparkleField active={showSparkles} />

          {/* Image container */}
          <MotionBox
            position="relative"
            width="100%"
            aspectRatio="1"
            borderRadius="16px"
            overflow="hidden"
            border="2px solid"
            borderColor={revealStage === 'revealed' ? 'rgba(255, 215, 0, 0.5)' : 'rgba(255, 255, 255, 0.1)'}
            boxShadow={revealStage === 'revealed'
              ? '0 12px 40px rgba(0, 0, 0, 0.5), 0 0 60px rgba(255, 215, 0, 0.25), inset 0 0 30px rgba(255, 215, 0, 0.1)'
              : '0 8px 32px rgba(0, 0, 0, 0.4)'
            }
            bg="rgba(0, 0, 0, 0.4)"
            initial={{ scale: 0.88, opacity: 0 }}
            animate={{
              scale: revealStage === 'revealed' ? 1 : revealStage === 'revealing' ? 0.95 : 0.88,
              opacity: revealStage === 'hidden' ? 0 : 1,
            }}
            transition={{
              duration: 0.8,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            {/* Light burst overlay */}
            <MotionBox
              position="absolute"
              inset="0"
              background="radial-gradient(circle at center, rgba(255, 215, 0, 0.9), rgba(255, 255, 255, 0.5), transparent 70%)"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={revealStage === 'revealing' ? {
                opacity: [0, 1, 0],
                scale: [0.5, 2, 2.5],
              } : {}}
              transition={{
                duration: 1.2,
                ease: 'easeOut',
              }}
              pointerEvents="none"
              zIndex={5}
            />

            {/* Holographic shimmer */}
            <MotionBox
              position="absolute"
              top="0"
              left="-100%"
              width="60%"
              height="100%"
              background="linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), rgba(255, 215, 0, 0.2), transparent)"
              initial={{ left: '-100%' }}
              animate={revealStage !== 'hidden' ? { left: '200%' } : {}}
              transition={{
                duration: 1.5,
                delay: 0.8,
                ease: 'easeInOut',
              }}
              zIndex={4}
              pointerEvents="none"
            />

            {/* Scanline reveal effect */}
            <MotionBox
              position="absolute"
              left="0"
              right="0"
              height="4px"
              background="linear-gradient(90deg, transparent, rgba(255, 215, 0, 0.8), rgba(255, 255, 255, 0.9), rgba(255, 215, 0, 0.8), transparent)"
              boxShadow="0 0 20px rgba(255, 215, 0, 0.8), 0 0 40px rgba(255, 215, 0, 0.4)"
              initial={{ top: '0%', opacity: 0 }}
              animate={revealStage === 'revealing' ? {
                top: ['0%', '100%'],
                opacity: [0, 1, 1, 0],
              } : {}}
              transition={{
                duration: 1.8,
                delay: 0.3,
                ease: 'easeInOut',
              }}
              zIndex={6}
              pointerEvents="none"
            />

            {/* The NFT image/video with dramatic reveal */}
            {isVideo ? (
              <MotionBox
                position="absolute"
                top="0"
                left="0"
                width="100%"
                height="100%"
                initial={{
                  filter: 'blur(30px) brightness(2) saturate(0)',
                  scale: 1.2,
                  opacity: 0,
                }}
                animate={revealStage !== 'hidden' ? {
                  filter: 'blur(0px) brightness(1) saturate(1)',
                  scale: 1,
                  opacity: 1,
                } : {}}
                transition={{
                  duration: 2,
                  delay: 0.2,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                <video
                  ref={videoRef}
                  src={videoUrl}
                  poster={imageUrl || undefined}
                  autoPlay
                  loop
                  muted
                  playsInline
                  onError={() => setVideoFailed(true)}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                  }}
                />
              </MotionBox>
            ) : displayUrl ? (
              <MotionImage
                src={displayUrl}
                alt={metadata.name || 'NFT'}
                width="100%"
                height="100%"
                objectFit="contain"
                initial={{
                  filter: 'blur(30px) brightness(2) saturate(0)',
                  scale: 1.2,
                  opacity: 0,
                }}
                animate={revealStage !== 'hidden' ? {
                  filter: 'blur(0px) brightness(1) saturate(1)',
                  scale: 1,
                  opacity: 1,
                } : {}}
                transition={{
                  duration: 2,
                  delay: 0.2,
                  ease: [0.22, 1, 0.36, 1],
                }}
              />
            ) : (
              <Flex
                width="100%"
                height="100%"
                align="center"
                justify="center"
                bg="rgba(139, 92, 246, 0.1)"
              >
                <Text fontSize="4xl">🖼️</Text>
              </Flex>
            )}

            {/* Second shimmer pass */}
            {revealStage === 'revealed' && (
              <MotionBox
                position="absolute"
                top="0"
                left="-100%"
                width="50%"
                height="100%"
                background="linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent)"
                animate={{ left: ['−100%', '200%'] }}
                transition={{
                  duration: 2.5,
                  repeat: Infinity,
                  repeatDelay: 3,
                  ease: 'easeInOut',
                }}
                zIndex={3}
                pointerEvents="none"
              />
            )}
          </MotionBox>
        </Box>

        {/* Right: NFT Info & Attributes */}
        <VStack
          flex="1"
          gap={{ base: 3, md: 4 }}
          align={{ base: 'center', md: 'flex-start' }}
          width="100%"
          minW="0"
        >
          {/* NFT Name with golden shimmer */}
          <MotionBox
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.5, duration: 0.6 }}
          >
            <Text
              fontSize={{ base: '1.5rem', md: '1.85rem' }}
              fontWeight="800"
              color="white"
              textAlign={{ base: 'center', md: 'left' }}
              lineHeight="1.2"
              letterSpacing="-0.02em"
              textShadow="0 0 30px rgba(255, 215, 0, 0.3)"
            >
              {metadata.name}
            </Text>
          </MotionBox>

          {metadataPending && (
            <Text
              fontSize="sm"
              color="rgba(255, 255, 255, 0.65)"
              textAlign={{ base: 'center', md: 'left' }}
            >
              Metadata is still propagating. You can already verify the confirmed mint in Explorer.
            </Text>
          )}

          {/* Description */}
          {metadata.description && (
            <MotionBox
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.7, duration: 0.5 }}
            >
              <Text
                fontSize={{ base: '11px', md: '12px' }}
                color="rgba(255, 255, 255, 0.7)"
                textAlign={{ base: 'center', md: 'left' }}
                lineHeight="1.45"
              >
                {metadata.description}
              </Text>
            </MotionBox>
          )}

          {/* Separator */}
          <MotionBox
            height="1px"
            width={{ base: '60%', md: '100%' }}
            bg="linear-gradient(90deg, rgba(255, 215, 0, 0.4), rgba(139, 92, 246, 0.3), transparent)"
            my={1}
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            transition={{ delay: 1.8, duration: 0.6 }}
            style={{ transformOrigin: 'left' }}
          />

          {/* Attributes - 2 column grid */}
          {attributes.length > 0 && (
            <MotionBox
              width="100%"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.9, duration: 0.5 }}
            >
              <Text
                fontSize="11px"
                fontWeight="700"
                color="rgba(255, 255, 255, 0.4)"
                textTransform="uppercase"
                letterSpacing="0.12em"
                mb={2.5}
                textAlign={{ base: 'center', md: 'left' }}
              >
                Traits ({attributes.length})
              </Text>
              <SimpleGrid columns={2} gap={2.5}>
                {attributes.map((attr, i) => (
                  <MotionBox
                    key={attr.trait_type}
                    p={3}
                    bg="linear-gradient(135deg, rgba(139, 92, 246, 0.08) 0%, rgba(99, 102, 241, 0.05) 100%)"
                    border="1px solid rgba(139, 92, 246, 0.18)"
                    borderRadius="12px"
                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ delay: 2.1 + i * 0.06, duration: 0.4 }}
                    _hover={{
                      bg: 'rgba(139, 92, 246, 0.15)',
                      borderColor: 'rgba(139, 92, 246, 0.35)',
                      transform: 'translateY(-2px)',
                    }}
                    style={{ transition: 'all 0.2s ease' }}
                  >
                    <Text
                      fontSize="10px"
                      color="rgba(255, 255, 255, 0.5)"
                      textTransform="uppercase"
                      letterSpacing="0.05em"
                      lineHeight="1.3"
                      mb={1}
                    >
                      {attr.trait_type}
                    </Text>
                    <Text
                      fontSize={{ base: 'sm', md: 'md' }}
                      fontWeight="700"
                      color="white"
                      lineHeight="1.4"
                      wordBreak="break-word"
                    >
                      {attr.value}
                    </Text>
                  </MotionBox>
                ))}
              </SimpleGrid>
            </MotionBox>
          )}

          {/* Action buttons */}
          <MotionBox
            width="100%"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 2.5, duration: 0.5 }}
            pt={2}
          >
            <HStack
              gap={3}
              justify={{ base: 'center', md: 'flex-start' }}
              flexWrap="wrap"
            >
              {!metadataPending && (
                <button
                  onClick={shareToTwitter}
                  onTouchEnd={(e) => { e.preventDefault(); shareToTwitter(); }}
                  style={{
                    background: 'linear-gradient(135deg, #1d9bf0 0%, #0d8bd9 100%)',
                    color: 'white',
                    padding: '12px 20px',
                    height: '44px',
                    borderRadius: '12px',
                    fontWeight: 700,
                    fontSize: '16px',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    boxShadow: '0 4px 20px rgba(29, 155, 240, 0.4)',
                    cursor: 'pointer',
                    transition: 'all 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
                    touchAction: 'manipulation',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
                    e.currentTarget.style.boxShadow = '0 8px 30px rgba(29, 155, 240, 0.5)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = 'translateY(0) scale(1)';
                    e.currentTarget.style.boxShadow = '0 4px 20px rgba(29, 155, 240, 0.4)';
                  }}
                >
                  𝕏 Share
                </button>
              )}
              <button
                onClick={() => openExternalUrl(getCoreExplorerUrl(nft.mint.toString()))}
                onTouchEnd={(e) => { e.preventDefault(); openExternalUrl(getCoreExplorerUrl(nft.mint.toString())); }}
                style={{
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: 'white',
                  padding: '12px 20px',
                  height: '44px',
                  borderRadius: '12px',
                  fontWeight: 700,
                  fontSize: '16px',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  boxShadow: '0 4px 20px rgba(16, 185, 129, 0.4)',
                  cursor: 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
                  touchAction: 'manipulation',
                  WebkitTapHighlightColor: 'transparent',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
                  e.currentTarget.style.boxShadow = '0 8px 30px rgba(16, 185, 129, 0.5)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0) scale(1)';
                  e.currentTarget.style.boxShadow = '0 4px 20px rgba(16, 185, 129, 0.4)';
                }}
              >
                🔍 Explorer
              </button>
            </HStack>
          </MotionBox>
        </VStack>
      </Flex>
    </MotionBox>
  );
};

// Minting progress display
const MintingProgress = ({
  stage,
  workImage,
}: {
  stage: string;
  workImage: string;
}) => (
  <VStack gap={{ base: 4, md: 6 }} py={{ base: 4, md: 8 }} px={4} width="100%" maxW="500px" mx="auto">
    {/* Animated work image */}
    <MotionBox
      width="100%"
      maxW={{ base: "280px", md: "340px" }}
      animate={{
        scale: [1, 1.03, 1],
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    >
      <Box
        position="relative"
        borderRadius="16px"
        overflow="hidden"
        boxShadow="0 12px 40px rgba(0, 0, 0, 0.5), 0 0 60px rgba(139, 92, 246, 0.25)"
      >
        <Image
          key="work-image-stable"
          src={workImage}
          alt="Minting in progress"
          width="100%"
          height="auto"
        />
        {/* Pulsing border */}
        <MotionBox
          position="absolute"
          top="0"
          left="0"
          right="0"
          bottom="0"
          borderRadius="16px"
          border="3px solid"
          borderColor="rgba(139, 92, 246, 0.5)"
          animate={{
            borderColor: ['rgba(139, 92, 246, 0.3)', 'rgba(255, 215, 0, 0.6)', 'rgba(139, 92, 246, 0.3)'],
            boxShadow: [
              'inset 0 0 20px rgba(139, 92, 246, 0.2)',
              'inset 0 0 30px rgba(255, 215, 0, 0.3)',
              'inset 0 0 20px rgba(139, 92, 246, 0.2)',
            ],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
          }}
          pointerEvents="none"
        />
      </Box>
    </MotionBox>

    {/* Progress text */}
    <VStack gap={4} width="100%">
      <MotionText
        fontSize={{ base: 'xl', md: '2xl' }}
        fontWeight="700"
        color="white"
        textAlign="center"
        animate={{
          opacity: [0.7, 1, 0.7],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
        }}
      >
        Minting your NFT...
      </MotionText>

      {stage && (
        <Box
          p={4}
          borderRadius="14px"
          bg="rgba(139, 92, 246, 0.1)"
          border="1px solid rgba(139, 92, 246, 0.25)"
          width="100%"
          maxW="380px"
        >
          <Text
            fontSize="md"
            fontWeight="600"
            color="rgba(139, 92, 246, 0.9)"
            textAlign="center"
          >
            {stage}
          </Text>
        </Box>
      )}

      {/* Progress dots */}
      <HStack gap={2.5} justify="center" mt={2}>
        {[0, 1, 2].map((i) => (
          <MotionBox
            key={i}
            width="10px"
            height="10px"
            borderRadius="full"
            bg="#8b5cf6"
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.4, 1, 0.4],
            }}
            transition={{
              duration: 0.8,
              repeat: Infinity,
              delay: i * 0.15,
            }}
          />
        ))}
      </HStack>
    </VStack>
  </VStack>
);

// Multi-NFT grid card
const MultiNFTCard = ({
  nft,
  index,
}: {
  nft: NFTData;
  index: number;
}) => {
  const [videoFailed, setVideoFailed] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const metadataPending = !nft.offChainMetadata;
  const metadata: JsonMetadata = nft.offChainMetadata ?? {
    name: 'Mint confirmed',
  };
  const videoUrl = resolveAssetUrl(metadata?.animation_url);
  const imageUrl = resolveAssetUrl(metadata?.image);
  const isVideo = !videoFailed && !!videoUrl;

  useAutoplayVideo(videoRef, isVideo);

  // Display URL: video if available, otherwise image
  const displayUrl = isVideo ? videoUrl : imageUrl;

  const shareToTwitter = () => {
    openExternalUrl(buildMintShareUrl(metadata, mintPageUrl, twitterHashtags));
  };

  return (
    <MotionBox
      initial={{ opacity: 0, scale: 0.8, rotateY: -45 }}
      animate={{ opacity: 1, scale: 1, rotateY: 0 }}
      transition={{
        duration: 0.8,
        delay: 0.5 + index * 0.15,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      <VStack
        p={3}
        bg="rgba(15, 15, 25, 0.6)"
        backdropFilter="blur(16px)"
        borderRadius="14px"
        border="1px solid rgba(255, 255, 255, 0.08)"
        gap={2}
      >
        <Box
          width="100%"
          aspectRatio="1"
          maxW="160px"
          borderRadius="10px"
          overflow="hidden"
          border="1px solid rgba(255, 255, 255, 0.08)"
        >
          {isVideo ? (
            <MotionBox
              width="100%"
              height="100%"
              initial={{ filter: 'blur(20px)', scale: 1.1 }}
              animate={{ filter: 'blur(0px)', scale: 1 }}
              transition={{ duration: 1, delay: 0.8 + index * 0.15 }}
            >
              <video
                ref={videoRef}
                src={videoUrl}
                poster={imageUrl || undefined}
                autoPlay
                loop
                muted
                playsInline
                onError={() => setVideoFailed(true)}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                }}
              />
            </MotionBox>
          ) : displayUrl ? (
            <MotionImage
              src={displayUrl}
              alt={metadata.name || 'NFT'}
              width="100%"
              height="100%"
              objectFit="contain"
              initial={{ filter: 'blur(20px)', scale: 1.1 }}
              animate={{ filter: 'blur(0px)', scale: 1 }}
              transition={{ duration: 1, delay: 0.8 + index * 0.15 }}
            />
          ) : (
            <Flex
              width="100%"
              height="100%"
              align="center"
              justify="center"
              bg="rgba(139, 92, 246, 0.1)"
            >
              <Text fontSize="2xl">🖼️</Text>
            </Flex>
          )}
        </Box>

        <Text
          fontSize="sm"
          fontWeight="700"
          color="white"
          textAlign="center"
          css={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          width="100%"
        >
          {metadata.name}
        </Text>

        <HStack gap={1.5} width="100%">
          {!metadataPending && (
            <button
              onClick={shareToTwitter}
              onTouchEnd={(e) => { e.preventDefault(); shareToTwitter(); }}
              style={{
                flex: 1,
                background: 'linear-gradient(135deg, #1d9bf0 0%, #0d8bd9 100%)',
                color: 'white',
                padding: '8px 12px',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '12px',
                border: 'none',
                boxShadow: '0 2px 10px rgba(29, 155, 240, 0.3)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                touchAction: 'manipulation',
                WebkitTapHighlightColor: 'transparent',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              𝕏
            </button>
          )}
          <button
            onClick={() => openExternalUrl(getCoreExplorerUrl(nft.mint.toString()))}
            onTouchEnd={(e) => { e.preventDefault(); openExternalUrl(getCoreExplorerUrl(nft.mint.toString())); }}
            style={{
              flex: 1,
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: 'white',
              padding: '8px 12px',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '12px',
              border: 'none',
              boxShadow: '0 2px 10px rgba(16, 185, 129, 0.3)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              touchAction: 'manipulation',
              WebkitTapHighlightColor: 'transparent',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            🔍
          </button>
        </HStack>
      </VStack>
    </MotionBox>
  );
};

export const NFTRevealModal = ({
  nfts,
  isMinting,
  mintingStage = '',
  workImage,
}: NFTRevealModalProps) => {
  const hasNFTs = nfts && nfts.length > 0;
  const isSingleNFT = hasNFTs && nfts.length === 1;
  const showReveal = !isMinting && hasNFTs;

  return (
    <Box position="relative" width="100%" minH="400px">
      {/* Minting progress - relative when active so it drives container height, absolute when fading out */}
      <MotionBox
        position={showReveal ? "absolute" : "relative"}
        top="0"
        left="0"
        width="100%"
        zIndex={showReveal ? 0 : 1}
        initial={false}
        animate={{
          opacity: isMinting ? 1 : 0,
          scale: isMinting ? 1 : 0.95,
        }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        style={{ pointerEvents: isMinting ? 'auto' : 'none' }}
      >
        <MintingProgress stage={mintingStage} workImage={workImage} />
      </MotionBox>

      {/* NFT reveal - relative when active so it drives container height, absolute when hidden */}
      {hasNFTs && (
        <MotionBox
          position={showReveal ? "relative" : "absolute"}
          width="100%"
          zIndex={showReveal ? 1 : 0}
          initial={{ opacity: 0, scale: 1.02 }}
          animate={{
            opacity: showReveal ? 1 : 0,
            scale: showReveal ? 1 : 1.02,
          }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: showReveal ? 0.2 : 0 }}
          style={{ pointerEvents: showReveal ? 'auto' : 'none' }}
        >
          {isSingleNFT ? (
            <NFTCard nft={nfts[0]} startAnimation={showReveal} />
          ) : (
            <SimpleGrid
              columns={{ base: 2, md: nfts.length > 3 ? 3 : nfts.length }}
              gap={3}
              width="100%"
            >
              {nfts.map((nft, i) => (
                <MultiNFTCard key={nft.mint.toString()} nft={nft} index={i} />
              ))}
            </SimpleGrid>
          )}
        </MotionBox>
      )}

      {/* When neither minting nor showing reveal, keep minimum height with minting progress */}
      {!hasNFTs && !isMinting && (
        <Box height="400px" />
      )}
    </Box>
  );
};
