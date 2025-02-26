'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  Button,
  useToast,
  FormErrorMessage,
  Select,
} from '@chakra-ui/react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase/supabase';
import { TaskInsert, DatabaseTeamMemberResponse, TaskAssigneeInsert } from '@/types/database.types';
import { PostgrestResponse } from '@supabase/supabase-js';

interface TeamMemberProfile {
  id: string;
  full_name: string;
}

interface CreateTaskFormProps {
  projectId: string;
}

export default function CreateTaskForm({ projectId }: CreateTaskFormProps) {
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [teamMembers, setTeamMembers] = useState<TeamMemberProfile[]>([]);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);

  useEffect(() => {
    async function fetchTeamMembers() {
      if (!projectId) return;

      try {
        const { data: project, error: projectError } = await supabase
          .from('projects')
          .select('team_id')
          .eq('id', projectId)
          .single();

        if (projectError) throw projectError;

        const { data, error: membersError } = await supabase
          .from('team_members')
          .select(`
            user_id,
            team_id,
            profiles:user_id (
              id,
              full_name
            )
          `)
          .eq('team_id', project.team_id) as PostgrestResponse<DatabaseTeamMemberResponse>;

        if (membersError) throw membersError;

        if (!data) return;
        
        const formattedMembers = data
          .filter(member => member.profiles)
          .map(member => ({
            id: member.user_id,
            full_name: member.profiles.full_name,
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
  }, [projectId, toast]);

  const handleAssigneeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const options = event.target.options;
    const selectedValues = [];
    for (let i = 0; i < options.length; i++) {
      if (options[i].selected) {
        selectedValues.push(options[i].value);
      }
    }
    setSelectedAssignees(selectedValues);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const dueDate = formData.get('dueDate') as string;

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

      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('team_id')
        .eq('id', projectId)
        .single();

      if (projectError) throw projectError;

      const taskData: TaskInsert = {
        title,
        description: description || null,
        project_id: projectId,
        team_id: projectData.team_id,
        status: 'not_started',
        due_date: dueDate || null
      };

      // タスクを作成
      const { data: taskResult, error: taskError } = await supabase
        .from('tasks')
        .insert([taskData])
        .select('id')
        .single();

      if (taskError) throw taskError;

      // 担当者を登録
      if (selectedAssignees.length > 0) {
        const assigneeData: TaskAssigneeInsert[] = selectedAssignees.map(userId => ({
          task_id: taskResult.id,
          user_id: userId
        }));

        const { error: assigneeError } = await supabase
          .from('task_assignees')
          .insert(assigneeData);

        if (assigneeError) throw assigneeError;
      }

      toast({
        title: 'タスクを作成しました',
        status: 'success',
        duration: 5000,
      });

      router.push(`/projects/${projectId}`);
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
          <FormLabel>担当者（複数選択可能）</FormLabel>
          <Box maxH="200px" overflowY="auto">
            <Select
              value={selectedAssignees}
              onChange={handleAssigneeChange}
              placeholder="担当者を選択"
              multiple
              h="auto"
            >
              {teamMembers.map(member => (
                <option key={member.id} value={member.id}>
                  {member.full_name}
                </option>
              ))}
            </Select>
          </Box>
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
  );
}