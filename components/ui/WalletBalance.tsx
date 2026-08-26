// Modern Wallet Balance Component - Editorial Gallery Aesthetic
// Refined balance display with animated SOL icon

import { Box, Flex, Text } from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { memo } from 'react';
import { GlassCard } from './GlassCard';

interface WalletBalanceProps {
  balance: number | null;
  loading?: boolean;
}

const MotionBox = motion(Box);

// Animated SOL logo
const SolanaLogo = () => (
  <MotionBox
    width="20px"
    height="20px"
    display="flex"
    alignItems="center"
    justifyContent="center"
    animate={{
      rotateY: [0, 360],
    }}
    transition={{
      duration: 8,
      repeat: Infinity,
      ease: 'linear',
    }}
  >
    <svg viewBox="0 0 397 311" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
      <defs>
        <linearGradient id="solGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#9945FF" />
          <stop offset="50%" stopColor="#14F195" />
          <stop offset="100%" stopColor="#00D1FF" />
        </linearGradient>
      </defs>
      <path d="M64.6 237.9c2.4-2.4 5.7-3.8 9.2-3.8h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1l62.7-62.7z" fill="url(#solGradient)"/>
      <path d="M64.6 3.8C67.1 1.4 70.4 0 73.8 0h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1L64.6 3.8z" fill="url(#solGradient)"/>
      <path d="M333.1 120.1c-2.4-2.4-5.7-3.8-9.2-3.8H6.5c-5.8 0-8.7 7-4.6 11.1l62.7 62.7c2.4 2.4 5.7 3.8 9.2 3.8h317.4c5.8 0 8.7-7 4.6-11.1l-62.7-62.7z" fill="url(#solGradient)"/>
    </svg>
  </MotionBox>
);

export const WalletBalance = memo(({ balance, loading = false }: WalletBalanceProps) => {
  const formattedBalance = typeof balance === 'number' && !isNaN(balance)
    ? balance.toFixed(4)
    : '—.——';

  return (
    <GlassCard variant="subtle" p={{ base: 2, md: 2.5 }} hoverEffect={false}>
      <Flex align="center" justify="center" gap={2}>
        <SolanaLogo />
        <Flex align="baseline" gap={1}>
          <Box>
            <Text
              fontSize={{ base: "lg", md: "xl" }}
              fontWeight="700"
              color="white"
              fontVariantNumeric="tabular-nums"
              letterSpacing="-0.02em"
            >
              {loading ? '—.——' : formattedBalance}
            </Text>
          </Box>
          <Text
            fontSize={{ base: "xs", md: "sm" }}
            fontWeight="600"
            color="rgba(255, 255, 255, 0.5)"
          >
            SOL
          </Text>
        </Flex>
      </Flex>
    </GlassCard>
  );
});

WalletBalance.displayName = 'WalletBalance';
