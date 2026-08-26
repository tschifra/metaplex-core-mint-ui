// Modern Glass Card Component - Editorial Gallery Aesthetic
// Premium glassmorphism with refined shadows and subtle animations

import { Box, BoxProps } from '@chakra-ui/react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { forwardRef } from 'react';

type GlassVariant = 'default' | 'elevated' | 'accent' | 'success' | 'danger' | 'subtle';

interface GlassCardProps extends Omit<BoxProps, keyof HTMLMotionProps<'div'>> {
  variant?: GlassVariant;
  hoverEffect?: boolean;
  glowColor?: string;
  children: React.ReactNode;
}

const MotionBox = motion(Box);

const variants: Record<GlassVariant, {
  bg: string;
  border: string;
  shadow: string;
  hoverShadow: string;
}> = {
  default: {
    bg: 'rgba(15, 15, 25, 0.6)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    shadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
    hoverShadow: '0 16px 48px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
  },
  elevated: {
    bg: 'rgba(20, 20, 35, 0.8)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    shadow: '0 12px 40px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05)',
    hoverShadow: '0 24px 56px rgba(0, 0, 0, 0.6), 0 0 60px rgba(139, 92, 246, 0.15)',
  },
  accent: {
    bg: 'linear-gradient(135deg, rgba(139, 92, 246, 0.12) 0%, rgba(59, 130, 246, 0.08) 100%)',
    border: '1px solid rgba(139, 92, 246, 0.25)',
    shadow: '0 8px 32px rgba(139, 92, 246, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
    hoverShadow: '0 16px 48px rgba(139, 92, 246, 0.35), 0 0 80px rgba(139, 92, 246, 0.15)',
  },
  success: {
    bg: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(5, 150, 105, 0.08) 100%)',
    border: '1px solid rgba(16, 185, 129, 0.3)',
    shadow: '0 8px 32px rgba(16, 185, 129, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
    hoverShadow: '0 16px 48px rgba(16, 185, 129, 0.35), 0 0 80px rgba(16, 185, 129, 0.15)',
  },
  danger: {
    bg: 'linear-gradient(135deg, rgba(239, 68, 68, 0.12) 0%, rgba(220, 38, 38, 0.08) 100%)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    shadow: '0 8px 32px rgba(239, 68, 68, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
    hoverShadow: '0 16px 48px rgba(239, 68, 68, 0.35), 0 0 80px rgba(239, 68, 68, 0.15)',
  },
  subtle: {
    bg: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255, 255, 255, 0.04)',
    shadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
    hoverShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
  },
};

export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(({
  variant = 'default',
  hoverEffect = true,
  glowColor,
  children,
  ...props
}, ref) => {
  const v = variants[variant];

  return (
    <MotionBox
      ref={ref}
      position="relative"
      bg={v.bg}
      backdropFilter="blur(24px) saturate(180%)"
      border={v.border}
      borderRadius="20px"
      boxShadow={v.shadow}
      overflow="hidden"
      whileHover={hoverEffect ? {
        y: -4,
        boxShadow: v.hoverShadow,
        transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] }
      } : undefined}
      _before={{
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '1px',
        background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.15), transparent)',
        pointerEvents: 'none',
      }}
      _after={glowColor ? {
        content: '""',
        position: 'absolute',
        top: '-50%',
        left: '-50%',
        width: '200%',
        height: '200%',
        background: `radial-gradient(circle at center, ${glowColor} 0%, transparent 60%)`,
        opacity: 0.1,
        pointerEvents: 'none',
        zIndex: -1,
      } : undefined}
      {...props}
    >
      {children}
    </MotionBox>
  );
});

GlassCard.displayName = 'GlassCard';

export default GlassCard;
