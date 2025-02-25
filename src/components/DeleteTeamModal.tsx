'use client';

import React from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  Text,
  useToast,
} from '@chakra-ui/react';
import { supabase } from '@/lib/supabase/supabase';

interface DeleteTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamId: string;
  teamName: string;
  onDelete: () => void;
}

export default function DeleteTeamModal({
  isOpen,
  onClose,
  teamId,
  teamName,
  onDelete,
}: DeleteTeamModalProps) {
  const toast = useToast();
  const [isDeleting, setIsDeleting] = React.useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('teams')
        .delete()
        .eq('id', teamId);

      if (error) throw error;

      toast({
        title: 'チームを削除しました',
        status: 'success',
        duration: 5000,
      });

      onDelete();
      onClose();
    } catch (error) {
      console.error('Error deleting team:', error);
      toast({
        title: 'チームの削除に失敗しました',
        description: 'もう一度お試しください',
        status: 'error',
        duration: 5000,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>チームの削除</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Text>
            チーム「{teamName}」を削除しますか？
            この操作は取り消せません。
          </Text>
          <Text mt={4} color="red.500" fontWeight="bold">
            注意：チームに関連するすべてのプロジェクトとタスクも削除されます。
          </Text>
        </ModalBody>

        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>
            キャンセル
          </Button>
          <Button
            colorScheme="red"
            onClick={handleDelete}
            isLoading={isDeleting}
            loadingText="削除中..."
          >
            削除
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}