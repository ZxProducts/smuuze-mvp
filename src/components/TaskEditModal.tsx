'use client';

import React, { useState, useEffect } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  Select,
  Stack,
  useToast,
} from '@chakra-ui/react';
import { supabase } from '@/lib/supabase';
import {
  Task,
  TaskPriority,
  TaskStatus,
  Profile,
  TeamMemberWithProfile,
} from '@/types/database.types';
import { PostgrestResponse } from '@supabase/supabase-js';

interface TaskEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Partial<Task>;
  projectId: string;
  teamMembers?: TeamMemberWithProfile[];
  onSave?: (updates: Partial<Task>) => Promise<void>;
  onUpdate?: (updates: Partial<Task>) => Promise<void>;
}

interface DatabaseTeamMemberResponse {
  user_id: string;
  team_id: string;
  profiles: {
    id: string;
    full_name: string;
    email: string;
  };
}

export function TaskEditModal({
  isOpen,
  onClose,
  task,
  projectId,
  teamMembers: initialTeamMembers,
  onSave,
  onUpdate,
}: TaskEditModalProps) {
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [taskData, setTaskData] = useState<Partial<Task>>({
    title: task.title || '',
    description: task.description || '',
    status: task.status || 'not_started',
    priority: task.priority || 'medium',
    assignee_id: task.assignee_id || null,
    due_date: task.due_date || null,
  });
  const [teamMembers, setTeamMembers] = useState<TeamMemberWithProfile[]>(initialTeamMembers || []);

  useEffect(() => {
    async function fetchTeamMembers() {
      if (initialTeamMembers) return;

      try {
        // プロジェクトのチームIDを取得
        const { data: project, error: projectError } = await supabase
          .from('projects')
          .select('team_id')
          .eq('id', projectId)
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
          .eq('team_id', project.team_id) as PostgrestResponse<DatabaseTeamMemberResponse>;

        if (membersError) throw membersError;

        if (!data) return;

        const formattedMembers: TeamMemberWithProfile[] = data
          .filter(member => member.profiles && member.profiles.full_name)
          .map(member => ({
            id: member.user_id,
            team_id: member.team_id,
            user_id: member.user_id,
            role: 'member',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            profile: {
              id: member.profiles.id,
              full_name: member.profiles.full_name,
              email: member.profiles.email,
              avatar_url: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
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

    if (isOpen && !initialTeamMembers) {
      fetchTeamMembers();
    }
  }, [isOpen, projectId, toast, initialTeamMembers]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setTaskData(prev => ({
      ...prev,
      [name]: value === '' ? null : value,
    }));
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      if (onSave) {
        await onSave(taskData);
      } else if (onUpdate) {
        await onUpdate(taskData);
      }
      onClose();
      toast({
        title: 'タスクを更新しました',
        status: 'success',
        duration: 3000,
      });
    } catch (error) {
      console.error('Error updating task:', error);
      toast({
        title: 'タスクの更新に失敗しました',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>タスクの編集</ModalHeader>
        <ModalBody>
          <Stack spacing={4}>
            <FormControl>
              <FormLabel>タイトル</FormLabel>
              <Input
                name="title"
                value={taskData.title || ''}
                onChange={handleChange}
              />
            </FormControl>

            <FormControl>
              <FormLabel>説明</FormLabel>
              <Textarea
                name="description"
                value={taskData.description || ''}
                onChange={handleChange}
              />
            </FormControl>

            <FormControl>
              <FormLabel>ステータス</FormLabel>
              <Select
                name="status"
                value={taskData.status || 'not_started'}
                onChange={handleChange}
              >
                <option value="not_started">未着手</option>
                <option value="in_progress">進行中</option>
                <option value="completed">完了</option>
              </Select>
            </FormControl>

            <FormControl>
              <FormLabel>優先度</FormLabel>
              <Select
                name="priority"
                value={taskData.priority || 'medium'}
                onChange={handleChange}
              >
                <option value="low">低</option>
                <option value="medium">中</option>
                <option value="high">高</option>
              </Select>
            </FormControl>

            <FormControl>
              <FormLabel>担当者</FormLabel>
              <Select
                name="assignee_id"
                value={taskData.assignee_id || ''}
                onChange={handleChange}
              >
                <option value="">担当者なし</option>
                {teamMembers.map(member => (
                  <option key={member.profile.id} value={member.profile.id}>
                    {member.profile.full_name}
                  </option>
                ))}
              </Select>
            </FormControl>

            <FormControl>
              <FormLabel>期限</FormLabel>
              <Input
                name="due_date"
                type="date"
                value={taskData.due_date || ''}
                onChange={handleChange}
              />
            </FormControl>
          </Stack>
        </ModalBody>

        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>
            キャンセル
          </Button>
          <Button
            colorScheme="brand"
            onClick={handleSubmit}
            isLoading={isLoading}
          >
            保存
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}