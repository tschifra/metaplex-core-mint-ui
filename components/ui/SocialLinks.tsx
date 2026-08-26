// Social Links Component - Premium hover effects with brand colors
// Adds trust & community indicators to the mint page

import { Flex, Link, Text, Box } from '@chakra-ui/react';
import { motion } from 'framer-motion';

const MotionBox = motion(Box);
const MotionLink = motion(Link);

interface SocialLinksProps {
  discord?: string;
  twitter?: string;
  website?: string;
  compact?: boolean;
}

// Social platform icons with brand colors
const socialConfig = {
  discord: {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
      </svg>
    ),
    color: '#5865F2',
    hoverColor: '#7289DA',
    label: 'Discord',
  },
  twitter: {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    ),
    color: '#000000',
    hoverColor: '#1DA1F2',
    label: 'X',
  },
  website: {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
      </svg>
    ),
    color: '#8b5cf6',
    hoverColor: '#a78bfa',
    label: 'Website',
  },
};

const SocialButton = ({
  href,
  platform,
  compact
}: {
  href: string;
  platform: keyof typeof socialConfig;
  compact?: boolean;
}) => {
  const config = socialConfig[platform];

  return (
    <MotionLink
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={config.label}
      title={config.label}
      display="flex"
      alignItems="center"
      gap={compact ? 0 : 1.5}
      px={compact ? 2 : 3}
      py={compact ? 1.5 : 2}
      borderRadius="full"
      bg="rgba(255, 255, 255, 0.03)"
      border="1px solid rgba(255, 255, 255, 0.08)"
      color="rgba(255, 255, 255, 0.7)"
      fontSize="xs"
      fontWeight="600"
      textDecoration="none"
      whileHover={{
        scale: 1.05,
        backgroundColor: `${config.color}20`,
        borderColor: `${config.color}40`,
        color: config.hoverColor,
      }}
      whileTap={{ scale: 0.95 }}
      transition={{ duration: 0.2 }}
      _hover={{ textDecoration: 'none' }}
    >
      <MotionBox
        display="flex"
        alignItems="center"
        justifyContent="center"
        whileHover={{ rotate: [0, -10, 10, 0] }}
        transition={{ duration: 0.3 }}
      >
        {config.icon}
      </MotionBox>
      {!compact && (
        <Text display={{ base: "none", sm: "block" }}>
          {config.label}
        </Text>
      )}
    </MotionLink>
  );
};

export const SocialLinks = ({
  discord,
  twitter,
  website,
  compact = false
}: SocialLinksProps) => {
  const hasLinks = discord || twitter || website;

  if (!hasLinks) return null;

  return (
    <Flex
      align="center"
      gap={compact ? 1 : 2}
      flexWrap="nowrap"
      justify="center"
    >
      {discord && <SocialButton href={discord} platform="discord" compact={compact} />}
      {website && <SocialButton href={website} platform="website" compact={compact} />}
      {twitter && <SocialButton href={twitter} platform="twitter" compact={compact} />}
    </Flex>
  );
};

export default SocialLinks;
