import React from 'react';
import {
  Container,
  VStack,
  Heading,
} from '@chakra-ui/react';
import { AuthGuard } from '@/components/AuthGuard';
import CreateTaskForm from './CreateTaskForm';

interface NewTaskPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function NewTaskPage({ params }: NewTaskPageProps) {
  const { id } = await params;
  return (
    <AuthGuard>
      <Container maxW="container.md" py={8}>
        <VStack spacing={8} align="stretch">
          <Heading size="lg">新規タスク</Heading>
          <CreateTaskForm projectId={id} />
        </VStack>
      </Container>
    </AuthGuard>
  );
}