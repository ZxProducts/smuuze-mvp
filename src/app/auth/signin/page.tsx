'use client';

import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Container,
  Input,
  Heading,
  Text,
  useToast,
} from '@chakra-ui/react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const { user } = useAuth();
  const redirectPath = searchParams?.get('redirect') || '/dashboard';

  // ユーザーが既にログインしている場合はリダイレクト
  useEffect(() => {
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('メールアドレスとパスワードを入力してください。');
      return;
    }
  
    if (email === undefined || password === undefined) {
      setError('メールアドレスとパスワードが不正です。');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'サインインに失敗しました。');
      }

      // サインイン成功時の通知
      toast({
        title: 'サインインしました',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      // サインイン成功時はリダイレクトパスへ移動
      router.push(redirectPath);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'サインインに失敗しました。');
      toast({
        title: 'エラー',
        description: error instanceof Error ? error.message : 'サインインに失敗しました。',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxW="container.sm" py={10}>
      <Box display="flex" flexDirection="column" gap={8}>
        <Box textAlign="center">
          <Heading size="xl" mb={2}>ログイン</Heading>
          <Text color="gray.600">
            アカウントをお持ちでない場合は{' '}
            <Link href="/auth/signup" style={{ color: 'var(--chakra-colors-brand-500)' }}>
              新規登録
            </Link>
          </Text>
        </Box>

        <Box
          as="form"
          onSubmit={handleSubmit}
          bg="white"
          p={8}
          borderRadius="lg"
          boxShadow="sm"
        >
          <Box display="flex" flexDirection="column" gap={4}>
            <Box>
              <Text mb={2}>メールアドレス</Text>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your-email@example.com"
                required
              />
            </Box>

            <Box>
              <Text mb={2}>パスワード</Text>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="********"
                required
              />
            </Box>

            {error && (
              <Text color="red.500" fontSize="sm">
                {error}
              </Text>
            )}

            <Button
              type="submit"
              colorScheme="brand"
              size="lg"
              width="full"
              isLoading={loading}
              loadingText="ログイン中..."
            >
              ログイン
            </Button>
          </Box>
        </Box>

        <Box textAlign="center">
          <Link href="/auth/forgot-password" style={{ color: 'var(--chakra-colors-gray-600)' }}>
            パスワードをお忘れの方はこちら
          </Link>
        </Box>
      </Box>
    </Container>
  );
}