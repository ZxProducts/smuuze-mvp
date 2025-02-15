'use client';

import React, { useCallback } from 'react';
import {
  Box,
  Container,
  Heading,
  Text,
  Button,
  VStack,
  HStack,
  SimpleGrid,
  Icon,
} from '@chakra-ui/react';
import { TimeIcon, CheckIcon, CalendarIcon } from '@chakra-ui/icons';
import Link from 'next/link';

export default function Home() {
  const showComingSoon = useCallback(() => {
    alert('開発中の機能です。近日公開予定です。');
  }, []);

  const features = [
    {
      icon: TimeIcon,
      title: 'タイムトラッキング',
      description: 'プロジェクトやタスクごとの作業時間を簡単に記録',
    },
    {
      icon: CheckIcon,
      title: 'タスク管理',
      description: 'プロジェクトのタスクを効率的に管理',
    },
    {
      icon: CalendarIcon,
      title: 'レポート生成',
      description: '詳細な作業記録とレポートを自動生成',
    },
  ];

  return (
    <Container maxW="container.xl" py={8}>
      <Box display="flex" flexDirection="column" gap={12}>
        {/* ヒーローセクション */}
        <Box textAlign="center" py={10}>
          <Heading
            as="h1"
            size="2xl"
            bgGradient="linear(to-r, brand.500, blue.600)"
            backgroundClip="text"
            mb={4}
          >
            シンプルで直感的な
            <br />
            タイムトラッキング
          </Heading>
          <Text fontSize="xl" color="gray.600" mb={8}>
            プロジェクト管理とタイムトラッキングを
            <br />
            スマートに統合
          </Text>
          <Box display="flex" gap={4} justifyContent="center">
            <Link href="/signup" passHref>
              <Button
                size="lg"
                colorScheme="brand"
                onClick={showComingSoon}
              >
                無料で始める
              </Button>
            </Link>
            <Link href="/features" passHref>
              <Button
                size="lg"
                variant="outline"
                onClick={showComingSoon}
              >
                機能詳細
              </Button>
            </Link>
          </Box>
        </Box>

        {/* 特徴セクション */}
        <SimpleGrid columns={{ base: 1, md: 3 }} gap={8}>
          {features.map((feature, index) => (
            <Box
              key={index}
              borderWidth="1px"
              borderRadius="lg"
              p={6}
              height="100%"
              _hover={{
                shadow: 'md',
                transform: 'translateY(-2px)',
                transition: 'all 0.2s',
              }}
            >
              <Box display="flex" flexDirection="column" gap={4}>
                <Icon as={feature.icon} w={8} h={8} color="brand.500" />
                <Heading size="md">{feature.title}</Heading>
                <Text color="gray.600">{feature.description}</Text>
              </Box>
            </Box>
          ))}
        </SimpleGrid>

        {/* CTAセクション */}
        <Box
          bg="brand.50"
          p={8}
          borderRadius="lg"
          textAlign="center"
          mt={12}
        >
          <Heading as="h2" size="lg" mb={4}>
            さあ、始めましょう
          </Heading>
          <Text fontSize="lg" mb={6}>
            効率的な時間管理で、プロジェクトの成功をサポートします
          </Text>
          <Button
            size="lg"
            colorScheme="brand"
            onClick={showComingSoon}
          >
            無料アカウントを作成
          </Button>
        </Box>
      </Box>
    </Container>
  );
}