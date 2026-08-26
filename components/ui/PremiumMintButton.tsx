// Premium Mint Button Component - Editorial Gallery Aesthetic
// Stunning animated button with magnetic hover, liquid gradients, and haptic feedback

import { Box, Text, Flex, Spinner } from '@chakra-ui/react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useRef, MouseEvent, memo } from 'react';

interface PremiumMintButtonProps {
  price?: number;
  isSoldOut?: boolean;
  isEligible?: boolean;
  isLoading?: boolean;
  loadingText?: string;
  onClick?: () => void;
  children: React.ReactNode;
  title?: string;
  isConnected?: boolean;
  insufficientFunds?: boolean;
}

const MotionBox = motion.create(Box);
const MotionDiv = motion.div;

export const PremiumMintButton = memo(({
  price,
  isSoldOut = false,
  isEligible = true,
  isLoading = false,
  loadingText,
  onClick,
  children,
  title,
  isConnected = false,
  insufficientFunds = false,
}: PremiumMintButtonProps) => {
  const ref = useRef<HTMLDivElement>(null);

  // Magnetic effect values
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springConfig = { damping: 15, stiffness: 150 };
  const springX = useSpring(x, springConfig);
  const springY = useSpring(y, springConfig);

  // Gradient position based on mouse
  const gradientX = useTransform(springX, [-50, 50], [30, 70]);
  const gradientY = useTransform(springY, [-30, 30], [30, 70]);

  // Pre-compute the gradient position transforms (hooks must be called unconditionally)
  const gradientXPercent = useTransform(gradientX, (v) => `${v - 50}%`);
  const gradientYPercent = useTransform(gradientY, (v) => `${v - 50}%`);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!ref.current || isLoading) return;
    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    x.set((e.clientX - centerX) * 0.3);
    y.set((e.clientY - centerY) * 0.3);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  // Button is disabled if: not connected, not eligible, sold out, or insufficient funds
  const isDisabled = !isConnected || !isEligible || isSoldOut || insufficientFunds;
  const showPrice = price !== undefined && price > 0;

  // Dynamic colors based on state
  // Grey when not connected, orange/red when insufficient funds, red when sold out, green when connected & eligible
  const primaryColor = !isConnected ? '#6b7280' : insufficientFunds ? '#f97316' : isSoldOut ? '#ef4444' : '#10b981';
  const secondaryColor = !isConnected ? '#4b5563' : insufficientFunds ? '#ea580c' : isSoldOut ? '#dc2626' : '#059669';
  const glowColor = !isConnected ? 'rgba(107, 114, 128, 0.3)' : insufficientFunds ? 'rgba(249, 115, 22, 0.5)' : isSoldOut ? 'rgba(239, 68, 68, 0.5)' : 'rgba(16, 185, 129, 0.5)';

  return (
    <MotionBox
      position="relative"
      width="100%"
      style={{ x: springX, y: springY }}
    >
      {/* Glow effect behind button */}
      {!isDisabled && !isLoading && (
        <MotionBox
          position="absolute"
          top="50%"
          left="50%"
          width="100%"
          height="100%"
          borderRadius="18px"
          background={`radial-gradient(circle at center, ${glowColor} 0%, transparent 70%)`}
          style={{ x: '-50%', y: '-50%' }}
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.5, 0.8, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      )}

      {/* "Ready to mint" pulse ring - only when eligible and not loading */}
      {!isDisabled && !isLoading && isEligible && (
        <MotionBox
          position="absolute"
          top="50%"
          left="50%"
          width="calc(100% + 8px)"
          height="calc(100% + 8px)"
          borderRadius="22px"
          border={`2px solid ${primaryColor}`}
          style={{ x: '-50%', y: '-50%' }}
          animate={{
            scale: [1, 1.08, 1],
            opacity: [0.6, 0, 0.6],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeOut',
          }}
          pointerEvents="none"
        />
      )}

      <MotionDiv
        ref={ref}
        role="button"
        tabIndex={isDisabled ? -1 : 0}
        title={title}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={isDisabled || isLoading ? undefined : onClick}
        whileTap={!isDisabled && !isLoading ? { scale: 0.98 } : undefined}
        style={{
          position: 'relative',
          width: '100%',
          height: '60px',
          borderRadius: '18px',
          overflow: 'hidden',
          border: 'none',
          cursor: isDisabled ? 'not-allowed' : 'pointer',
          background: isDisabled
            ? 'rgba(255, 255, 255, 0.05)'
            : `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
          boxShadow: isDisabled
            ? 'none'
            : `0 10px 40px ${glowColor}, inset 0 1px 0 rgba(255, 255, 255, 0.2)`,
          transition: 'all 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          touchAction: 'manipulation',
          WebkitTapHighlightColor: 'transparent',
        }}
        whileHover={!isDisabled ? {
          boxShadow: `0 16px 56px ${glowColor}, inset 0 1px 0 rgba(255, 255, 255, 0.3)`,
        } : undefined}
      >
        {/* Animated gradient overlay */}
        {!isDisabled && !isLoading && (
          <MotionBox
            position="absolute"
            top="0"
            left="0"
            right="0"
            bottom="0"
            background={`radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.25) 0%, transparent 60%)`}
            style={{
              x: gradientXPercent,
              y: gradientYPercent,
            }}
            pointerEvents="none"
          />
        )}

        {/* Shine sweep effect */}
        {!isDisabled && !isLoading && (
          <MotionBox
            position="absolute"
            top="0"
            width="100%"
            height="100%"
            background="linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.2) 50%, transparent 100%)"
            animate={{
              left: ['-100%', '200%'],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              repeatDelay: 2,
              ease: 'easeInOut',
            }}
            pointerEvents="none"
          />
        )}

        {/* Button content */}
        <Flex
          position="relative"
          zIndex={1}
          align="center"
          justify="center"
          gap={3}
          width="100%"
        >
          {isLoading ? (
            <>
              <Spinner size="sm" color="white" />
              <Text
                fontSize={{ base: "md", md: "lg" }}
                fontWeight="700"
                color="white"
                letterSpacing="0.02em"
              >
                {loadingText || 'Processing...'}
              </Text>
            </>
          ) : (
            <>
              {/* Show sparkle only when connected, eligible, and not sold out */}
              {isConnected && !isSoldOut && isEligible && (
                <MotionBox
                  animate={{
                    scale: [1, 1.15, 1],
                    rotate: [0, 5, -5, 0],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                >
                  <Text fontSize={{ base: "lg", md: "xl" }}>✨</Text>
                </MotionBox>
              )}
              <Text
                fontSize={{ base: "md", md: "lg" }}
                fontWeight="800"
                color={isDisabled ? 'rgba(255, 255, 255, 0.4)' : 'white'}
                letterSpacing="0.03em"
                textTransform="uppercase"
              >
                {!isConnected ? 'Connect Wallet' : insufficientFunds ? '⚠️ Top Up Wallet' : isSoldOut ? 'Sold Out' : children}
              </Text>
              {/* Always show price when available (even when not connected) */}
              {showPrice && !isSoldOut && (
                <Box
                  px={3}
                  py={1}
                  borderRadius="full"
                  bg="rgba(0, 0, 0, 0.2)"
                  backdropFilter="blur(8px)"
                >
                  <Text
                    fontSize={{ base: "sm", md: "md" }}
                    fontWeight="700"
                    color={isDisabled ? 'rgba(255, 255, 255, 0.5)' : 'white'}
                  >
                    {price.toFixed(2)} SOL
                  </Text>
                </Box>
              )}
            </>
          )}
        </Flex>

        {/* Ripple ring effect on hover */}
        {!isDisabled && !isLoading && (
          <MotionBox
            position="absolute"
            top="50%"
            left="50%"
            width="0"
            height="0"
            borderRadius="50%"
            border={`2px solid ${primaryColor}`}
            opacity={0}
            style={{ x: '-50%', y: '-50%' }}
            whileHover={{
              width: ['0%', '150%'],
              height: ['0%', '200%'],
              opacity: [0.5, 0],
              transition: { duration: 0.8, repeat: Infinity }
            }}
            pointerEvents="none"
          />
        )}
      </MotionDiv>
    </MotionBox>
  );
});

PremiumMintButton.displayName = 'PremiumMintButton';
