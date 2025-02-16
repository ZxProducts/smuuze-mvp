'use client';

import React, { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Box, Text } from '@chakra-ui/react';

// 認証が不要なパス
const publicPaths = ['/', '/auth/signin', '/auth/signup', '/auth/verify', '/auth/forgot-password'];

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading) {
      if (!user && !publicPaths.includes(pathname)) {
        // 未認証の場合、ログインページへリダイレクト
        router.push('/auth/signin');
      } else if (user && publicPaths.includes(pathname)) {
        // 認証済みの場合、publicPathsからダッシュボードへリダイレクト
        router.push('/dashboard');
      }
    }
  }, [user, loading, pathname, router]);

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
        <Text color="gray.500">読み込み中...</Text>
      </Box>
    );
  }

  // 認証チェックが完了し、適切なリダイレクトが行われた後にコンテンツを表示
  return <>{children}</>;
}