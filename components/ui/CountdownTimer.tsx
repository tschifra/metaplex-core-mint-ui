// Modern Countdown Timer Component - Editorial Gallery Aesthetic
// Refined countdown display with flip-clock style animation

import { Box, Flex, Text, VStack } from '@chakra-ui/react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState, Dispatch, SetStateAction, memo } from 'react';

interface CountdownTimerProps {
  targetTime: bigint;
  currentTime: bigint;
  variant?: 'starting' | 'ending';
  setCheckEligibility?: Dispatch<SetStateAction<boolean>>;
}

const MotionBox = motion(Box);

// Individual time unit display
const TimeUnit = ({ value, label }: { value: number; label: string }) => (
  <VStack gap={0}>
    <Box
      position="relative"
      width={{ base: "64px", md: "72px" }}
      height={{ base: "60px", md: "68px" }}
      borderRadius="12px"
      bg="rgba(0, 0, 0, 0.4)"
      border="1px solid rgba(255, 255, 255, 0.1)"
      overflow="hidden"
      boxShadow="inset 0 2px 4px rgba(0, 0, 0, 0.3)"
    >
      {/* Center line */}
      <Box
        position="absolute"
        top="50%"
        left="0"
        right="0"
        height="1px"
        bg="rgba(0, 0, 0, 0.3)"
        zIndex={1}
      />

      {/* Number display */}
      <AnimatePresence mode="wait">
        <MotionBox
          key={value}
          display="flex"
          alignItems="center"
          justifyContent="center"
          width="100%"
          height="100%"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          <Text
            fontSize={{ base: "1.75rem", md: "2rem" }}
            fontWeight="800"
            color="white"
            fontVariantNumeric="tabular-nums"
            textShadow="0 2px 4px rgba(0, 0, 0, 0.3)"
          >
            {value.toString().padStart(2, '0')}
          </Text>
        </MotionBox>
      </AnimatePresence>

      {/* Shine effect */}
      <Box
        position="absolute"
        top="0"
        left="0"
        right="0"
        height="50%"
        bg="linear-gradient(180deg, rgba(255, 255, 255, 0.1) 0%, transparent 100%)"
        pointerEvents="none"
      />
    </Box>
    <Text
      fontSize={{ base: "xs", md: "xs" }}
      fontWeight="600"
      color="rgba(255, 255, 255, 0.4)"
      textTransform="uppercase"
      letterSpacing="0.1em"
      mt={1}
    >
      {label}
    </Text>
  </VStack>
);

// Separator between units
const Separator = () => (
  <VStack gap={3} px={1}>
    <MotionBox
      width="4px"
      height="4px"
      borderRadius="full"
      bg="rgba(139, 92, 246, 0.8)"
      animate={{
        opacity: [0.4, 1, 0.4],
        scale: [1, 1.2, 1],
      }}
      transition={{
        duration: 1,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    />
    <MotionBox
      width="4px"
      height="4px"
      borderRadius="full"
      bg="rgba(139, 92, 246, 0.8)"
      animate={{
        opacity: [1, 0.4, 1],
        scale: [1, 1.2, 1],
      }}
      transition={{
        duration: 1,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    />
  </VStack>
);

export const CountdownTimer = memo(({
  targetTime,
  currentTime,
  variant = 'starting',
  setCheckEligibility,
}: CountdownTimerProps) => {
  const [remainingTime, setRemainingTime] = useState<bigint>(targetTime - currentTime);

  useEffect(() => {
    const interval = setInterval(() => {
      setRemainingTime((prev) => {
        const newTime = prev - BigInt(1);
        if (newTime <= BigInt(0)) {
          setCheckEligibility?.(true);
          return BigInt(0);
        }
        return newTime;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [setCheckEligibility]);

  // Calculate time units
  const seconds = Number(remainingTime % BigInt(60));
  const minutes = Number((remainingTime / BigInt(60)) % BigInt(60));
  const hours = Number((remainingTime / BigInt(3600)) % BigInt(24));
  const days = Number(remainingTime / BigInt(86400));

  const isEnding = variant === 'ending';
  const isUrgent = remainingTime < BigInt(3600); // Less than 1 hour

  return (
    <Box
      p={{ base: 3, md: 4 }}
      borderRadius="16px"
      bg={isEnding
        ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(220, 38, 38, 0.1) 100%)'
        : 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(99, 102, 241, 0.1) 100%)'
      }
      border={`1px solid ${isEnding ? 'rgba(239, 68, 68, 0.3)' : 'rgba(139, 92, 246, 0.3)'}`}
      backdropFilter="blur(12px)"
      position="relative"
      overflow="hidden"
    >
      {/* Urgent pulse effect */}
      {isUrgent && (
        <MotionBox
          position="absolute"
          top="0"
          left="0"
          right="0"
          bottom="0"
          borderRadius="16px"
          border="2px solid"
          borderColor={isEnding ? 'rgba(239, 68, 68, 0.5)' : 'rgba(139, 92, 246, 0.5)'}
          animate={{
            opacity: [0.3, 0.8, 0.3],
            scale: [1, 1.02, 1],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          pointerEvents="none"
        />
      )}

      <VStack gap={3}>
        {/* Header */}
        <Flex align="center" gap={2}>
          <Text fontSize={{ base: "sm", md: "md" }}>
            {isEnding ? '⏰' : '🚀'}
          </Text>
          <Text
            fontSize={{ base: "xs", md: "sm" }}
            fontWeight="700"
            color="white"
            textTransform="uppercase"
            letterSpacing="0.1em"
          >
            {isEnding ? 'Ending in' : 'Starting in'}
          </Text>
        </Flex>

        {/* Timer display */}
        <Flex align="center" gap={{ base: 1, md: 2 }}>
          {days > 0 && (
            <>
              <TimeUnit value={days} label="days" />
              <Separator />
            </>
          )}
          <TimeUnit value={hours} label="hours" />
          <Separator />
          <TimeUnit value={minutes} label="mins" />
          <Separator />
          <TimeUnit value={seconds} label="secs" />
        </Flex>
      </VStack>
    </Box>
  );
});

CountdownTimer.displayName = 'CountdownTimer';

export default CountdownTimer;
