'use client';

import React from 'react';
import {
  Box,
  Container,
  Heading,
  Text,
  Button,
  VStack,
} from '@chakra-ui/react';
import { WarningIcon } from '@chakra-ui/icons';
import { useRouter } from 'next/navigation';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <ErrorView error={this.state.error} />;
    }

    return this.props.children;
  }
}

function ErrorView({ error }: { error: Error | null }) {
  const router = useRouter();

  return (
    <Container maxW="container.md" py={12}>
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        gap={6}
      >
        <WarningIcon w={12} h={12} color="red.500" />
        <Box textAlign="center">
          <Heading size="lg" mb={2}>
            エラーが発生しました
          </Heading>
          <Text color="gray.600" mb={6}>
            申し訳ありません。予期しないエラーが発生しました。
          </Text>
          {error && process.env.NODE_ENV === 'development' && (
            <Box
              p={4}
              bg="gray.50"
              borderRadius="md"
              mb={6}
              maxH="200px"
              overflow="auto"
            >
              <Text
                as="pre"
                fontFamily="monospace"
                fontSize="sm"
                whiteSpace="pre-wrap"
              >
                {error.message}
                {'\n'}
                {error.stack}
              </Text>
            </Box>
          )}
          <Box display="flex" gap={4} justifyContent="center">
            <Button
              colorScheme="brand"
              onClick={() => {
                router.push('/');
              }}
            >
              ホームに戻る
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                window.location.reload();
              }}
            >
              ページを再読み込み
            </Button>
          </Box>
        </Box>
      </Box>
    </Container>
  );
}

// Higher Order Component for class components
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>
) {
  return function WithErrorBoundary(props: P) {
    return (
      <ErrorBoundary>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}

// Hook for functional components
export function useErrorBoundary() {
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    if (error) {
      console.error('Error caught by hook:', error);
    }
  }, [error]);

  const showError = React.useCallback((error: Error) => {
    setError(error);
  }, []);

  const clearError = React.useCallback(() => {
    setError(null);
  }, []);

  if (error) {
    return <ErrorView error={error} />;
  }

  return {
    showError,
    clearError,
  };
}