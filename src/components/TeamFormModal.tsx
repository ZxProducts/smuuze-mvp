'use client';

import { Team } from '@/types/api';
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
import { apiClient } from '@/lib/api-client';
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
      if (team) {
        // チームの更新
        const response = await apiClient.teams.update(team.id, {
          name: data.name,
          description: data.description,
        });

        if (response.error) throw response.error;

        toast({
          title: 'チームを更新しました',
          status: 'success',
        });
      } else {
        // 新規チーム作成
        const response = await apiClient.teams.create({
          name: data.name,
          description: data.description,
        });

        if (response.error) throw response.error;

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
        description: error instanceof Error ? error.message : 'もう一度お試しください',
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