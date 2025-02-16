'use client';

import React from 'react';
import {
  Box,
  Container,
  Heading,
  Text,
  Button,
  Icon,
} from '@chakra-ui/react';
import { EmailIcon } from '@chakra-ui/icons';
import Link from 'next/link';

export default function VerifyEmail() {
  return (
    <Container maxW="container.sm" py={10}>
      <Box
        bg="white"
        p={8}
        borderRadius="lg"
        boxShadow="sm"
        textAlign="center"
      >
        <Box
          width="80px"
          height="80px"
          borderRadius="full"
          bg="brand.50"
          display="flex"
          alignItems="center"
          justifyContent="center"
          margin="0 auto"
          mb={6}
        >
          <Icon as={EmailIcon} w={8} h={8} color="brand.500" />
        </Box>

        <Heading size="lg" mb={4}>
          メールを確認してください
        </Heading>

        <Text color="gray.600" mb={6}>
          登録されたメールアドレスに確認メールを送信しました。
          <br />
          メール内のリンクをクリックして、登録を完了してください。
        </Text>

        <Box display="flex" flexDirection="column" gap={4}>
          <Text fontSize="sm" color="gray.500">
            メールが届かない場合は、迷惑メールフォルダをご確認ください。
          </Text>

          <Link href="/auth/signin">
            <Button variant="ghost" color="brand.500">
              ログインページに戻る
            </Button>
          </Link>
        </Box>
      </Box>
    </Container>
  );
}