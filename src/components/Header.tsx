'use client';

import React, { useState } from 'react';
import {
  Box,
  Flex,
  IconButton,
  Button,
  Stack,
  useBreakpointValue,
  Container,
  Text,
} from '@chakra-ui/react';
import { HamburgerIcon, CloseIcon, TimeIcon } from '@chakra-ui/icons';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useTimeEntry } from '@/contexts/TimeEntryContext';
import { TaskMenu } from './TaskMenu';

// アクティブなタイムエントリを表示するコンポーネント
function ActiveTimeEntryDisplay() {
  try {
    const { activeEntry } = useTimeEntry();

    if (!activeEntry) return null;

    return (
      <Flex align="center" gap={2} bg="green.50" px={3} py={2} rounded="md">
        <TimeIcon color="green.500" />
        <Text fontSize="sm" color="gray.700">
          {activeEntry.task?.title}
        </Text>
      </Flex>
    );
  } catch (error) {
    console.error('TimeEntry error:', error);
    return null;
  }
}

// タイムエントリ関連のコンポーネントをまとめたコンポーネント
function TimeEntryComponents() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <>
      <ActiveTimeEntryDisplay />
      <TaskMenu />
    </>
  );
}

export function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  const publicMenuItems = [
    { name: 'ホーム', href: '/' },
    { name: 'サービス紹介', href: '/features' },
    { name: '料金プラン', href: '/pricing' },
  ];

  const privateMenuItems = [
    { name: 'ダッシュボード', href: '/dashboard' },
    { name: 'プロジェクト', href: '/projects' },
    { name: 'タイムシート', href: '/timesheet' },
    { name: 'レポート', href: '/reports' },
    { name: 'チーム管理', href: '/teams' },
  ];
  
  const menuItems = user ? [
    ...privateMenuItems,
    { name: 'マイタスク', href: '/tasks' },
  ] : publicMenuItems;
  
  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <Box
      as="nav"
      bg="white"
      borderBottom="1px"
      borderStyle="solid"
      borderColor="gray.200"
      position="sticky"
      top={0}
      zIndex={1000}
      shadow="sm"
    >
      <Container maxW="container.xl">
        <Flex
          minH="60px"
          py={{ base: 2 }}
          px={{ base: 4 }}
          align="center"
        >
          <Flex
            flex={{ base: 1, md: 'auto' }}
            ml={{ base: -2 }}
            display={{ base: 'flex', md: 'none' }}
          >
            <IconButton
              onClick={() => setIsOpen(!isOpen)}
              aria-label="メニューを開く"
              variant="ghost"
            >
              {isOpen ? <CloseIcon /> : <HamburgerIcon />}
            </IconButton>
          </Flex>

          <Flex flex={{ base: 1 }} justify={{ base: 'center', md: 'start' }}>
            <Link href="/" passHref>
              <Box
                textAlign={useBreakpointValue({ base: 'center', md: 'left' })}
                fontFamily="heading"
                color="gray.800"
                fontWeight="bold"
                fontSize="xl"
                cursor="pointer"
              >
                Smuuze
              </Box>
            </Link>

            <Flex display={{ base: 'none', md: 'flex' }} ml={10}>
              <Stack direction="row" align="center">
                {menuItems.map((item) => (
                  <Link key={item.href} href={item.href}>
                    <Button
                      variant="ghost"
                      p={2}
                      fontSize="sm"
                      fontWeight={pathname === item.href ? 'bold' : 'normal'}
                      color={pathname === item.href ? 'brand.500' : 'gray.600'}
                      _hover={{
                        textDecoration: 'none',
                        color: 'brand.500',
                      }}
                    >
                      {item.name}
                    </Button>
                  </Link>
                ))}
              </Stack>
            </Flex>
          </Flex>

          <Stack
            flex={{ base: 1, md: 0 }}
            justify="flex-end"
            direction="row"
            align="center"
          >
            {user ? (
              <Box display="flex" alignItems="center" gap={2}>
                <Link href="/profile">
                  <Button variant="ghost">
                    プロフィール
                  </Button>
                </Link>
                <TimeEntryComponents />
                <Button
                  variant="outline"
                  onClick={handleSignOut}
                >
                  ログアウト
                </Button>
              </Box>
            ) : (
              <>
                <Link href="/auth/signin">
                  <Button variant="ghost">ログイン</Button>
                </Link>
                <Link href="/auth/signup">
                  <Button
                    display={{ base: 'none', md: 'inline-flex' }}
                    colorScheme="brand"
                  >
                    無料で始める
                  </Button>
                </Link>
              </>
            )}
          </Stack>
        </Flex>

        {isOpen && (
          <Box pb={4} display={{ md: 'none' }}>
            <Stack>
              {menuItems.map((item) => (
                <Link key={item.href} href={item.href}>
                  <Button
                    w="full"
                    variant="ghost"
                    justifyContent="flex-start"
                    color={pathname === item.href ? 'brand.500' : 'gray.600'}
                    fontWeight={pathname === item.href ? 'bold' : 'normal'}
                  >
                    {item.name}
                  </Button>
                </Link>
              ))}
              {!user && (
                <Link href="/auth/signup">
                  <Button
                    w="full"
                    colorScheme="brand"
                  >
                    無料で始める
                  </Button>
                </Link>
              )}
              {user && (
                <>
                  <Link href="/profile">
                    <Button
                      w="full"
                      variant="ghost"
                    >
                      プロフィール
                    </Button>
                  </Link>
                  <Box w="full">
                    <TimeEntryComponents />
                  </Box>
                  <Button
                    w="full"
                    variant="outline"
                    onClick={handleSignOut}
                  >
                    ログアウト
                  </Button>
                </>
              )}
            </Stack>
          </Box>
        )}
      </Container>
    </Box>
  );
}