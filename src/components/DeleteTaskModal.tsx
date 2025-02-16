'use client';

import React from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Text,
  VStack,
} from '@chakra-ui/react';
import { WarningIcon } from '@chakra-ui/icons';

interface DeleteTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskName: string;
  onDelete: () => Promise<void>;
}

export function DeleteTaskModal({
  isOpen,
  onClose,
  taskName,
  onDelete,
}: DeleteTaskModalProps) {
  const [loading, setLoading] = React.useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      await onDelete();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      isCentered
      closeOnOverlayClick={!loading}
      closeOnEsc={!loading}
    >
      <ModalOverlay />
      <ModalContent>
        <ModalHeader color="red.500">タスクの削除</ModalHeader>
        <ModalBody>
          <VStack spacing={4} align="flex-start">
            <Text>
              以下のタスクを削除しますか？
            </Text>
            <Text fontWeight="bold">
              「{taskName}」
            </Text>
            <Text color="red.500" fontSize="sm">
              <WarningIcon mr={2} />
              この操作は取り消せません。
            </Text>
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button
            variant="ghost"
            mr={3}
            onClick={onClose}
            isDisabled={loading}
          >
            キャンセル
          </Button>
          <Button
            colorScheme="red"
            isLoading={loading}
            onClick={handleDelete}
            loadingText="削除中..."
          >
            削除する
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}