// Modern Mint Stats Component - Editorial Gallery Aesthetic
// Premium counter display with animated numbers and refined progress

import { Box, VStack, Flex, Text } from '@chakra-ui/react';
import { motion } from 'framer-motion';
import CountUp from 'react-countup';
import { memo } from 'react';
import { GlassCard } from './GlassCard';

interface MintStatsProps {
  available: number;
  total: number;
  loading?: boolean;
}

const MotionBox = motion.create(Box);

// Custom progress bar - no entrance animation, just smooth updates
const AnimatedProgress = ({ value, isSoldOut }: { value: number; isSoldOut: boolean }) => {
  const gradientColor = isSoldOut
    ? 'linear-gradient(90deg, #ef4444 0%, #f87171 50%, #ef4444 100%)'
    : 'linear-gradient(90deg, #8b5cf6 0%, #a78bfa 50%, #8b5cf6 100%)';

  return (
    <Box
      width="100%"
      height="6px"
      borderRadius="full"
      bg="rgba(255, 255, 255, 0.06)"
      overflow="hidden"
      position="relative"
    >
      <Box
        height="100%"
        borderRadius="full"
        background={gradientColor}
        backgroundSize="200% 100%"
        width={`${value}%`}
        transition="width 0.5s ease-out"
        style={{
          boxShadow: isSoldOut
            ? '0 0 20px rgba(239, 68, 68, 0.5)'
            : '0 0 20px rgba(139, 92, 246, 0.5)',
        }}
      />
    </Box>
  );
};

// Pulsing dot indicator
const StatusDot = ({ isSoldOut }: { isSoldOut: boolean }) => (
  <MotionBox
    width="10px"
    height="10px"
    borderRadius="full"
    bg={isSoldOut ? '#ef4444' : '#10b981'}
    animate={{
      scale: [1, 1.2, 1],
      boxShadow: isSoldOut
        ? ['0 0 0 0 rgba(239, 68, 68, 0.4)', '0 0 0 8px rgba(239, 68, 68, 0)', '0 0 0 0 rgba(239, 68, 68, 0)']
        : ['0 0 0 0 rgba(16, 185, 129, 0.4)', '0 0 0 8px rgba(16, 185, 129, 0)', '0 0 0 0 rgba(16, 185, 129, 0)']
    }}
    transition={{ duration: 2, repeat: Infinity }}
  />
);

export const MintStats = memo(({ available, total, loading = false }: MintStatsProps) => {
  const progress = total > 0 ? ((total - available) / total) * 100 : 0;
  const isSoldOut = available === 0 && total > 0;

  return (
    <GlassCard
      variant={isSoldOut ? 'danger' : 'accent'}
      p={{ base: 3, md: 3.5 }}
      hoverEffect={false}
    >
      <VStack gap={2.5} width="100%">
        {/* Header row with status */}
        <Flex align="center" justify="space-between" width="100%">
          <Flex align="center" gap={2}>
            <StatusDot isSoldOut={isSoldOut} />
            <Text
              fontSize={{ base: "xs", md: "sm" }}
              fontWeight="600"
              letterSpacing="0.1em"
              textTransform="uppercase"
              color={isSoldOut ? 'rgba(239, 68, 68, 0.9)' : 'rgba(139, 92, 246, 0.9)'}
            >
              {loading ? "Loading..." : isSoldOut ? "Sold Out" : "Available Now"}
            </Text>
          </Flex>

          {/* Percentage indicator */}
          {!loading && (
            <Text
              fontSize={{ base: "xs", md: "sm" }}
              fontWeight="500"
              color="rgba(255, 255, 255, 0.5)"
            >
              {Math.round(progress)}% minted
            </Text>
          )}
        </Flex>

        {/* Main counter display */}
        <Flex align="baseline" justify="center" width="100%" gap={1.5}>
          <Text
            fontSize={{ base: "2.5rem", md: "3rem" }}
            fontWeight="800"
            lineHeight="1"
            color="white"
            fontVariantNumeric="tabular-nums"
            style={{
              textShadow: isSoldOut
                ? '0 0 30px rgba(239, 68, 68, 0.4)'
                : '0 0 30px rgba(139, 92, 246, 0.4)',
            }}
          >
            {loading ? "—" : (
              <CountUp
                end={available}
                duration={1}
                preserveValue
                useEasing
              />
            )}
          </Text>
          <VStack gap={0} align="flex-start">
            <Text
              fontSize={{ base: "md", md: "lg" }}
              fontWeight="500"
              color="rgba(255, 255, 255, 0.4)"
            >
              / {loading ? "—" : total}
            </Text>
            <Text
              fontSize={{ base: "2xs", md: "xs" }}
              fontWeight="500"
              color="rgba(255, 255, 255, 0.3)"
              letterSpacing="0.05em"
            >
              remaining
            </Text>
          </VStack>
        </Flex>

        {/* Progress bar */}
        {!loading && <AnimatedProgress value={progress} isSoldOut={isSoldOut} />}
      </VStack>
    </GlassCard>
  );
});

MintStats.displayName = 'MintStats';
