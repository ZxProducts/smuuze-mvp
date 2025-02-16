'use client';

import React, { useState } from 'react';
import {
  Box,
  Container,
  VStack,
  Heading,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  Button,
  useToast,
  FormErrorMessage,
} from '@chakra-ui/react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { AuthGuard } from '@/components/AuthGuard';
import { ProjectInsert } from '@/types/database.types';

export default function NewProjectPage() {
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const startDate = formData.get('startDate') as string;
    const endDate = formData.get('endDate') as string;

    // バリデーション
    const newErrors: { [key: string]: string } = {};
    if (!name.trim()) {
      newErrors.name = 'プロジェクト名は必須です';
    }
    if (!startDate) {
      newErrors.startDate = '開始日は必須です';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);

    try {
      if (!user) throw new Error('認証エラー');

      // まずチームを作成
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .insert([{
          name: `${name}のチーム`,
          owner_id: user.id
        }])
        .select()
        .single();

      if (teamError) throw teamError;

      // プロジェクトを作成
      const projectData: ProjectInsert = {
        name,
        description: description || null,
        team_id: teamData.id,
        owner_id: user.id,
        start_date: startDate,
        end_date: endDate || null,
      };

      const { error: projectError } = await supabase
        .from('projects')
        .insert([projectData]);

      if (projectError) throw projectError;

      toast({
        title: 'プロジェクトを作成しました',
        status: 'success',
        duration: 5000,
      });

      router.push('/dashboard');
    } catch (error) {
      console.error('Error creating project:', error);
      toast({
        title: 'プロジェクトの作成に失敗しました',
        status: 'error',
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthGuard>
      <Container maxW="container.md" py={8}>
        <VStack spacing={8} align="stretch">
          <Heading size="lg">新規プロジェクト</Heading>
          
          <Box as="form" onSubmit={handleSubmit}>
            <VStack spacing={4} align="stretch">
              <FormControl isRequired isInvalid={!!errors.name}>
                <FormLabel>プロジェクト名</FormLabel>
                <Input name="name" placeholder="プロジェクト名を入力" />
                <FormErrorMessage>{errors.name}</FormErrorMessage>
              </FormControl>

              <FormControl>
                <FormLabel>説明</FormLabel>
                <Textarea
                  name="description"
                  placeholder="プロジェクトの説明を入力"
                  rows={4}
                />
              </FormControl>

              <FormControl isRequired isInvalid={!!errors.startDate}>
                <FormLabel>開始日</FormLabel>
                <Input name="startDate" type="date" />
                <FormErrorMessage>{errors.startDate}</FormErrorMessage>
              </FormControl>

              <FormControl>
                <FormLabel>終了日（任意）</FormLabel>
                <Input name="endDate" type="date" />
              </FormControl>

              <Button
                type="submit"
                colorScheme="brand"
                isLoading={isLoading}
                loadingText="作成中..."
                size="lg"
                width="full"
              >
                プロジェクトを作成
              </Button>
            </VStack>
          </Box>
        </VStack>
      </Container>
    </AuthGuard>
  );
}