// Collection Info Component - Shows collection description and creator info
// Builds trust and provides context about the NFT project

import { Box, VStack, Text, Flex, Image } from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { memo, useState } from 'react';
import { GlassCard } from './GlassCard';

const MotionDiv = motion.div;

interface CollectionInfoProps {
  description?: string;
  creatorName?: string;
  creatorImage?: string;
  isVerified?: boolean;
  maxLines?: number;
}

export const CollectionInfo = memo(({
  description,
  creatorName,
  creatorImage,
  isVerified = false,
  maxLines = 2,
}: CollectionInfoProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!description && !creatorName) return null;

  return (
    <GlassCard variant="subtle" p={{ base: 3, md: 3.5 }} hoverEffect={false}>
      <VStack gap={2.5} align="stretch">
        {/* Creator row */}
        {creatorName && (
          <Flex align="center" gap={2}>
            {/* Simple avatar box */}
            <Box
              width="32px"
              height="32px"
              borderRadius="full"
              bg="linear-gradient(135deg, #8b5cf6, #6366f1)"
              display="flex"
              alignItems="center"
              justifyContent="center"
              flexShrink={0}
              overflow="hidden"
            >
              {creatorImage ? (
                <Image
                  src={creatorImage}
                  alt={creatorName}
                  width="100%"
                  height="100%"
                  objectFit="cover"
                />
              ) : (
                <Text fontSize="sm" fontWeight="700" color="white">
                  {creatorName.charAt(0).toUpperCase()}
                </Text>
              )}
            </Box>
            <VStack gap={0} align="flex-start">
              <Flex align="center" gap={1}>
                <Text fontSize="xs" color="rgba(255, 255, 255, 0.5)">
                  Created by
                </Text>
                {isVerified && (
                  <MotionDiv
                    whileHover={{ scale: 1.2, rotate: 10 }}
                    title="Verified Creator"
                    style={{ display: 'inline-flex' }}
                  >
                    <Box
                      as="span"
                      display="inline-flex"
                      alignItems="center"
                      justifyContent="center"
                      width="14px"
                      height="14px"
                      borderRadius="full"
                      bg="linear-gradient(135deg, #10b981, #059669)"
                      fontSize="8px"
                    >
                      ✓
                    </Box>
                  </MotionDiv>
                )}
              </Flex>
              <Text fontSize="sm" fontWeight="700" color="white">
                {creatorName}
              </Text>
            </VStack>
          </Flex>
        )}

        {/* Description */}
        {description && (
          <Box position="relative">
            <Text
              fontSize="xs"
              color="rgba(255, 255, 255, 0.6)"
              lineHeight="1.6"
              css={!isExpanded ? {
                display: '-webkit-box',
                WebkitLineClamp: maxLines,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              } : {}}
            >
              {description}
            </Text>

            {description.length > 100 && (
              <Text
                as="button"
                fontSize="xs"
                fontWeight="600"
                color="#8b5cf6"
                mt={1}
                onClick={() => setIsExpanded(!isExpanded)}
                _hover={{ color: '#a78bfa' }}
                transition="color 0.2s"
              >
                {isExpanded ? 'Show less' : 'Read more'}
              </Text>
            )}
          </Box>
        )}
      </VStack>
    </GlassCard>
  );
});

CollectionInfo.displayName = 'CollectionInfo';

export default CollectionInfo;
