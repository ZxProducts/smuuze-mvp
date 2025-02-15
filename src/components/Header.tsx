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
  VStack,
} from '@chakra-ui/react';
import { HamburgerIcon, CloseIcon } from '@chakra-ui/icons';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const menuItems = [
    { name: 'ダッシュボード', href: '/dashboard' },
    { name: 'プロジェクト', href: '/projects' },
    { name: 'タスク', href: '/tasks' },
    { name: 'タイムシート', href: '/timesheet' },
    { name: 'レポート', href: '/reports' },
  ];

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
            {/* プロフィールメニューは後で実装 */}
          </Stack>
        </Flex>

        {isOpen && (
          <Box pb={4} display={{ md: 'none' }}>
            <VStack align="stretch">
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
            </VStack>
          </Box>
        )}
      </Container>
    </Box>
  );
}