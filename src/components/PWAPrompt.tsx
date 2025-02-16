'use client';

import React, { useState } from 'react';
import { Box, Button, Text } from '@chakra-ui/react';
import { DownloadIcon } from '@chakra-ui/icons';
import { usePWA, useOnlineStatus } from '@/hooks/usePWA';

export function PWAPrompt() {
  const { isInstallable, promptToInstall } = usePWA();
  const isOnline = useOnlineStatus();
  const [showInstallPrompt, setShowInstallPrompt] = useState(true);

  const handleClose = () => {
    setShowInstallPrompt(false);
  };

  if (!isOnline) {
    return (
      <Box
        position="fixed"
        bottom={4}
        right={4}
        left={4}
        zIndex={1000}
        bg="orange.500"
        color="white"
        p={4}
        borderRadius="md"
        boxShadow="lg"
        display="flex"
        alignItems="center"
        justifyContent="space-between"
      >
        <Text>
          オフラインモードです。一部の機能が制限される場合があります。
        </Text>
      </Box>
    );
  }

  if (isInstallable && showInstallPrompt) {
    return (
      <Box
        position="fixed"
        bottom={4}
        right={4}
        left={4}
        zIndex={1000}
        bg="white"
        p={4}
        borderRadius="md"
        boxShadow="lg"
        display="flex"
        alignItems="center"
        justifyContent="space-between"
      >
        <Box flex={1}>
          <Text fontWeight="bold" mb={1}>
            アプリをインストール
          </Text>
          <Text fontSize="sm" color="gray.600">
            ホーム画面に追加してより快適に使用できます
          </Text>
        </Box>
        <Box display="flex" gap={2}>
          <Button
            variant="outline"
            size="sm"
            onClick={handleClose}
          >
            後で
          </Button>
          <Button
            colorScheme="brand"
            size="sm"
            onClick={promptToInstall}
          >
            <DownloadIcon mr={2} />
            インストール
          </Button>
        </Box>
      </Box>
    );
  }

  return null;
}