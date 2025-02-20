'use client';

import React from 'react';
import {
  Box,
  Button,
  Text,
  Input,
  Textarea,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  FormControl,
  FormLabel,
  VStack,
} from '@chakra-ui/react';
import { Project, ProjectUpdate } from '@/types/database.types';

interface ProjectEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  onSave: (updates: ProjectUpdate) => Promise<void>;
}

export function ProjectEditModal({
  isOpen,
  onClose,
  project,
  onSave,
}: ProjectEditModalProps) {
  const [formData, setFormData] = React.useState<ProjectUpdate>({
    name: project.name,
    description: project.description,
    start_date: project.start_date,
    end_date: project.end_date,
  });
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setFormData({
        name: project.name,
        description: project.description,
        start_date: project.start_date,
        end_date: project.end_date,
      });
    }
  }, [isOpen, project]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await onSave(formData);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <ModalOverlay />
      <ModalContent as="form" onSubmit={handleSubmit}>
        <ModalHeader>プロジェクトを編集</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4}>
            <FormControl isRequired>
              <FormLabel>プロジェクト名</FormLabel>
              <Input
                name="name"
                value={formData.name || ''}
                onChange={handleChange}
                placeholder="プロジェクト名を入力"
              />
            </FormControl>

            <FormControl>
              <FormLabel>説明</FormLabel>
              <Textarea
                name="description"
                value={formData.description || ''}
                onChange={handleChange}
                placeholder="プロジェクトの説明を入力"
                rows={4}
              />
            </FormControl>

            <FormControl>
              <FormLabel>開始日</FormLabel>
              <Input
                name="start_date"
                type="date"
                value={formData.start_date || ''}
                onChange={handleChange}
              />
            </FormControl>

            <FormControl>
              <FormLabel>終了予定日</FormLabel>
              <Input
                name="end_date"
                type="date"
                value={formData.end_date || ''}
                onChange={handleChange}
              />
            </FormControl>
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button
            type="button"
            variant="outline"
            mr={3}
            onClick={onClose}
            disabled={saving}
          >
            キャンセル
          </Button>
          <Button
            type="submit"
            colorScheme="brand"
            isLoading={saving}
          >
            保存
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}