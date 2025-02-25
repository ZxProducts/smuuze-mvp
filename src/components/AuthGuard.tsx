'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Box, Spinner } from '@chakra-ui/react';

// 認証が不要なパス
const PUBLIC_PATHS = ['/', '/auth/signin', '/auth/signup', '/auth/verify', '/auth/forgot-password'];

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();

  // 未認証状態で認証が必要なページにアクセスした場合
  if (!user && !PUBLIC_PATHS.includes(pathname || '')) {
    // ミドルウェアがリダイレクトを処理するため、
    // ここではローディング表示のみ行う
    return (
      <Box
        height="100vh"
        width="100%"
        display="flex"
        alignItems="center"
        justifyContent="center"
        bg="white"
      >
        <Spinner
          thickness="4px"
          speed="0.65s"
          emptyColor="gray.200"
          color="brand.500"
          size="xl"
        />
      </Box>
    );
  }

  // 認証済み状態で公開ページにアクセスした場合
  if (user && PUBLIC_PATHS.includes(pathname || '')) {
    // ミドルウェアがリダイレクトを処理
    return null;
  }

  // 認証が不要なパスの場合は、常にコンテンツを表示
  if (PUBLIC_PATHS.includes(pathname || '')) {
    return <>{children}</>;
  }

  // 認証済みユーザーの場合、または認証チェック中の場合
  if (loading) {
    return (
      <Box
        height="100vh"
        width="100%"
        display="flex"
        alignItems="center"
        justifyContent="center"
        bg="white"
      >
        <Spinner
          thickness="4px"
          speed="0.65s"
          emptyColor="gray.200"
          color="brand.500"
          size="xl"
        />
      </Box>
    );
  }

  // 認証済みユーザーの場合はコンテンツを表示
  return <>{children}</>;
}