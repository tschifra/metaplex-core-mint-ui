import React, { Component, ReactNode } from 'react';
import { Box, Button, Heading, Text, VStack } from '@chakra-ui/react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(_error: Error, _errorInfo: React.ErrorInfo): void {
    // You could send this to an error reporting service like Sentry
    // For now, we just store it in state
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Box
          minH="100vh"
          display="flex"
          alignItems="center"
          justifyContent="center"
          bg="#08080c"
          p={4}
        >
          <VStack
            gap={4}
            p={8}
            borderRadius="20px"
            bg="rgba(15, 15, 25, 0.95)"
            border="1px solid rgba(239, 68, 68, 0.3)"
            boxShadow="0 25px 60px -12px rgba(0, 0, 0, 0.6)"
            maxW="500px"
            textAlign="center"
          >
            <Heading
              size="lg"
              color="white"
              bgGradient="linear(to-r, #ef4444, #f97316)"
              bgClip="text"
            >
              Something went wrong
            </Heading>
            <Text color="rgba(255, 255, 255, 0.7)" fontSize="md">
              An unexpected error occurred. Please try again.
            </Text>
            {this.state.error && (
              <Box
                p={3}
                borderRadius="10px"
                bg="rgba(239, 68, 68, 0.1)"
                border="1px solid rgba(239, 68, 68, 0.2)"
                width="100%"
              >
                <Text
                  color="rgba(239, 68, 68, 0.8)"
                  fontSize="sm"
                  fontFamily="monospace"
                >
                  {this.state.error.message}
                </Text>
              </Box>
            )}
            <Button
              onClick={this.handleRetry}
              bg="linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)"
              color="white"
              borderRadius="12px"
              px={6}
              py={3}
              fontWeight="600"
              _hover={{
                transform: 'translateY(-2px)',
                boxShadow: '0 8px 30px rgba(139, 92, 246, 0.4)',
              }}
              transition="all 0.3s ease"
            >
              Try Again
            </Button>
            <Button
              onClick={() => window.location.reload()}
              variant="ghost"
              color="rgba(255, 255, 255, 0.5)"
              fontSize="sm"
              _hover={{ color: 'white' }}
            >
              Reload Page
            </Button>
          </VStack>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
