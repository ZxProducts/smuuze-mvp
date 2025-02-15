'use client';

import React, { useState } from 'react';
import {
  Box,
  Button,
  Container,
  Input,
  Heading,
  Text,
} from '@chakra-ui/react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('メールアドレスとパスワードを入力してください。');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      await signIn(email, password);
    } catch (error) {
      setError('メールアドレスまたはパスワードが正しくありません。');
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
              disabled={loading}
            >
              {loading ? 'ログイン中...' : 'ログイン'}
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