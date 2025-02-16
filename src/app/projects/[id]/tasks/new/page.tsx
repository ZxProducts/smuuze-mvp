'use client';

import React, { useState, useEffect } from 'react';
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
  Select,
  Text,
} from '@chakra-ui/react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { AuthGuard } from '@/components/AuthGuard';
import { TaskPriority, TaskStatus, TaskInsert, Profile } from '@/types/database.types';
import { PostgrestResponse } from '@supabase/supabase-js';

interface NewTaskPageProps {
  params: {
    id: string;
  };
}

interface TeamMemberProfile {
  id: string;
  full_name: string;
  email: string;
}

type DatabaseTeamMember = {
  user_id: string;
  team_id: string;
  profiles: {
    id: string;
    full_name: string;
    email: string;
  };
};

export default function NewTaskPage({ params }: NewTaskPageProps) {
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [teamMembers, setTeamMembers] = useState<TeamMemberProfile[]>([]);

  // チームメンバー情報の取得
  useEffect(() => {
    async function fetchTeamMembers() {
      if (!params.id) return;

      try {
        // プロジェクトのチームIDを取得
        const { data: project, error: projectError } = await supabase
          .from('projects')
          .select('team_id')
          .eq('id', params.id)
          .single();

        if (projectError) throw projectError;

        // チームメンバーを取得
        const { data, error: membersError } = await supabase
          .from('team_members')
          .select(`
            user_id,
            team_id,
            profiles (
              id,
              full_name,
              email
            )
          `)
          .eq('team_id', project.team_id) as PostgrestResponse<DatabaseTeamMember>;

        if (membersError) throw membersError;

        if (!data) return;
        
        // データを整形
        const formattedMembers = data
          .filter(member => member.profiles && member.profiles.full_name)
          .map(member => ({
            id: member.profiles.id,
            full_name: member.profiles.full_name,
            email: member.profiles.email,
          }));

        setTeamMembers(formattedMembers);
      } catch (error) {
        console.error('Error fetching team members:', error);
        toast({
          title: 'チームメンバーの取得に失敗しました',
          status: 'error',
          duration: 5000,
        });
      }
    }

    fetchTeamMembers();
  }, [params.id, toast]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const priority = formData.get('priority') as TaskPriority;
    const assigneeId = formData.get('assigneeId') as string;
    const dueDate = formData.get('dueDate') as string;

    // バリデーション
    const newErrors: { [key: string]: string } = {};
    if (!title.trim()) {
      newErrors.title = 'タスク名は必須です';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);

    try {
      if (!user) throw new Error('認証エラー');

      // プロジェクト情報を取得
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('team_id')
        .eq('id', params.id)
        .single();

      if (projectError) throw projectError;

      // タスクを作成
      const taskData: TaskInsert = {
        title,
        description: description || null,
        project_id: params.id,
        team_id: projectData.team_id,
        status: 'not_started',
        priority,
        assignee_id: assigneeId || null,
        due_date: dueDate || null,
      };

      const { error: taskError } = await supabase
        .from('tasks')
        .insert([taskData]);

      if (taskError) throw taskError;

      toast({
        title: 'タスクを作成しました',
        status: 'success',
        duration: 5000,
      });

      router.push(`/projects/${params.id}`);
    } catch (error) {
      console.error('Error creating task:', error);
      toast({
        title: 'タスクの作成に失敗しました',
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
          <Heading size="lg">新規タスク</Heading>
          
          <Box as="form" onSubmit={handleSubmit}>
            <VStack spacing={4} align="stretch">
              <FormControl isRequired isInvalid={!!errors.title}>
                <FormLabel>タスク名</FormLabel>
                <Input name="title" placeholder="タスク名を入力" />
                <FormErrorMessage>{errors.title}</FormErrorMessage>
              </FormControl>

              <FormControl>
                <FormLabel>説明</FormLabel>
                <Textarea
                  name="description"
                  placeholder="タスクの説明を入力"
                  rows={4}
                />
              </FormControl>

              <FormControl>
                <FormLabel>優先度</FormLabel>
                <Select name="priority" defaultValue="medium">
                  <option value="low">低</option>
                  <option value="medium">中</option>
                  <option value="high">高</option>
                </Select>
              </FormControl>

              <FormControl>
                <FormLabel>担当者</FormLabel>
                <Select name="assigneeId" placeholder="担当者を選択">
                  {teamMembers.map(member => (
                    <option key={member.id} value={member.id}>
                      {member.full_name}
                    </option>
                  ))}
                </Select>
              </FormControl>

              <FormControl>
                <FormLabel>期限</FormLabel>
                <Input name="dueDate" type="date" />
              </FormControl>

              <Button
                type="submit"
                colorScheme="brand"
                isLoading={isLoading}
                loadingText="作成中..."
                size="lg"
                width="full"
              >
                タスクを作成
              </Button>
            </VStack>
          </Box>
        </VStack>
      </Container>
    </AuthGuard>
  );
}