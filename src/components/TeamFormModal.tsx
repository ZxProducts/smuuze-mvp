'use client';

import { Team } from '@/types/database.types';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  FormErrorMessage,
  useToast,
} from '@chakra-ui/react';
import { useForm } from 'react-hook-form';
import { supabase } from '@/lib/supabase';
import { useCallback } from 'react';

interface TeamFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  team: Team | null;
  onSubmit: () => void;
}

interface TeamFormData {
  name: string;
  description: string;
}

export default function TeamFormModal({ isOpen, onClose, team, onSubmit }: TeamFormModalProps) {
  const toast = useToast();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<TeamFormData>({
    defaultValues: {
      name: team?.name || '',
      description: team?.description || '',
    },
  });

  const onFormSubmit = useCallback(async (data: TeamFormData) => {
    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) {
        throw new Error('認証情報が見つかりません');
      }

      // プロフィールの存在確認
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.data.user.id)
        .single();

      if (profileError || !profile) {
        // プロフィールが存在しない場合は作成
        const { error: createProfileError } = await supabase
          .from('profiles')
          .insert([
            {
              id: user.data.user.id,
              full_name: user.data.user.email?.split('@')[0] || 'Unknown',
              role: 'member',
            },
          ]);

        if (createProfileError) {
          throw createProfileError;
        }
      }

      if (team) {
        // チームの更新
        const { error } = await supabase
          .from('teams')
          .update({
            name: data.name,
            description: data.description,
          })
          .eq('id', team.id);

        if (error) throw error;

        toast({
          title: 'チームを更新しました',
          status: 'success',
        });
      } else {
        // 新規チーム作成
        const { error: createTeamError } = await supabase
          .from('teams')
          .insert([
            {
              name: data.name,
              description: data.description,
              created_by: user.data.user.id,
            },
          ]);

        if (createTeamError) throw createTeamError;

        toast({
          title: 'チームを作成しました',
          status: 'success',
        });
      }

      reset();
      onClose();
      onSubmit();
    } catch (error) {
      console.error('Error submitting team:', error);
      toast({
        title: 'エラーが発生しました',
        description: 'もう一度お試しください',
        status: 'error',
      });
    }
  }, [team, reset, onClose, onSubmit, toast]);

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="lg">
      <ModalOverlay />
      <ModalContent>
        <form onSubmit={handleSubmit(onFormSubmit)}>
          <ModalHeader>{team ? 'チームを編集' : '新規チーム作成'}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <FormControl isInvalid={!!errors.name} mb={4}>
              <FormLabel>チーム名</FormLabel>
              <Input
                {...register('name', {
                  required: 'チーム名は必須です',
                  minLength: { value: 2, message: '2文字以上で入力してください' },
                })}
                placeholder="チーム名を入力"
              />
              <FormErrorMessage>{errors.name?.message}</FormErrorMessage>
            </FormControl>

            <FormControl isInvalid={!!errors.description}>
              <FormLabel>説明</FormLabel>
              <Textarea
                {...register('description')}
                placeholder="チームの説明を入力（任意）"
              />
              <FormErrorMessage>{errors.description?.message}</FormErrorMessage>
            </FormControl>
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={handleClose}>
              キャンセル
            </Button>
            <Button
              colorScheme="blue"
              type="submit"
              isLoading={isSubmitting}
            >
              {team ? '更新' : '作成'}
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}