'use client';

import { Suspense, use } from 'react';
import { Container, Spinner, Text } from '@chakra-ui/react';
import { useAuth } from '@/contexts/AuthContext';
import TeamDetailsContent from './TeamDetailsContent';

interface PageParams {
  id: string;
}

export default function TeamDetailsPage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const { user } = useAuth();
  const { id } = use(params);

  if (!user) {
    return null; // ミドルウェアでリダイレクトされるため、一時的に非表示
  }

  return (
    <Suspense
      fallback={
        <Container maxW="container.xl" py={8}>
          <Spinner />
          <Text ml={2}>読み込み中...</Text>
        </Container>
      }
    >
      <TeamDetailsContent teamId={id} />
    </Suspense>
  );
}