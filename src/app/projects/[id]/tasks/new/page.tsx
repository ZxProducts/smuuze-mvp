import React from 'react';
import {
  Container,
  VStack,
  Heading,
} from '@chakra-ui/react';
import { AuthGuard } from '@/components/AuthGuard';
import CreateTaskForm from './CreateTaskForm';

interface NewTaskPageProps {
  params: {
    id: string;
  };
}

export default function NewTaskPage({ params }: NewTaskPageProps) {
  return (
    <AuthGuard>
      <Container maxW="container.md" py={8}>
        <VStack spacing={8} align="stretch">
          <Heading size="lg">新規タスク</Heading>
          <CreateTaskForm projectId={params.id} />
        </VStack>
      </Container>
    </AuthGuard>
  );
}