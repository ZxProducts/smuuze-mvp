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

export default function SignUp() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password || !confirmPassword) {
      setError('すべての項目を入力してください。');
      return;
    }

    if (password !== confirmPassword) {
      setError('パスワードが一致しません。');
      return;
    }

    if (password.length < 8) {
      setError('パスワードは8文字以上で入力してください。');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      await signUp(email, password);
    } catch (error) {
      setError('アカウントの作成に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxW="container.sm" py={10}>
      <Box display="flex" flexDirection="column" gap={8}>
        <Box textAlign="center">
          <Heading size="xl" mb={2}>新規登録</Heading>
          <Text color="gray.600">
            すでにアカウントをお持ちの方は{' '}
            <Link href="/auth/signin" style={{ color: 'var(--chakra-colors-brand-500)' }}>
              ログイン
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
                placeholder="8文字以上で入力"
                required
                minLength={8}
              />
            </Box>

            <Box>
              <Text mb={2}>パスワード（確認）</Text>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="パスワードを再入力"
                required
                minLength={8}
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
              {loading ? '登録中...' : 'アカウントを作成'}
            </Button>
          </Box>
        </Box>

        <Box textAlign="center">
          <Text fontSize="sm" color="gray.600">
            登録することで、
            <Link href="/terms" style={{ color: 'var(--chakra-colors-brand-500)' }}>
              利用規約
            </Link>
            {' '}および{' '}
            <Link href="/privacy" style={{ color: 'var(--chakra-colors-brand-500)' }}>
              プライバシーポリシー
            </Link>
            {' '}に同意したものとみなされます。
          </Text>
        </Box>
      </Box>
    </Container>
  );
}