'use client';

import React from 'react';
import {
  Box,
  Container,
  Stack,
  Text,
  Flex,
  Link as ChakraLink,
} from '@chakra-ui/react';
import Link from 'next/link';

export function Footer() {
  return (
    <Box
      bg="gray.50"
      color="gray.700"
      borderTop="1px"
      borderStyle="solid"
      borderColor="gray.200"
    >
      <Container maxW="container.xl" py={4}>
        <Flex
          direction={{ base: 'column', md: 'row' }}
          align={{ base: 'center', md: 'center' }}
          justify="space-between"
          w="full"
        >
          <Text>© 2025 Smuuze. All rights reserved</Text>
          <Stack
            direction="row"
            align="center"
            mt={{ base: 4, md: 0 }}
          >
            <Link href="/terms" passHref legacyBehavior>
              <ChakraLink
                _hover={{
                  color: 'brand.500',
                  textDecoration: 'none',
                }}
              >
                利用規約
              </ChakraLink>
            </Link>
            <Link href="/privacy" passHref legacyBehavior>
              <ChakraLink
                _hover={{
                  color: 'brand.500',
                  textDecoration: 'none',
                }}
              >
                プライバシーポリシー
              </ChakraLink>
            </Link>
            <Link href="/contact" passHref legacyBehavior>
              <ChakraLink
                _hover={{
                  color: 'brand.500',
                  textDecoration: 'none',
                }}
              >
                お問い合わせ
              </ChakraLink>
            </Link>
          </Stack>
        </Flex>
      </Container>
    </Box>
  );
}