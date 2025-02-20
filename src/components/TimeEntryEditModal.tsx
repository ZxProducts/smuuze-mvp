'use client';

import React, { useState, useEffect } from 'react';
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
  VStack,
  useToast,
} from '@chakra-ui/react';
import { TimeEntryWithDetails } from '@/types/database.types';
import { supabase } from '@/lib/supabase';

interface TimeEntryEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  entry: TimeEntryWithDetails;
  onUpdate: () => void;
}

export function TimeEntryEditModal({
  isOpen,
  onClose,
  entry,
  onUpdate,
}: TimeEntryEditModalProps) {
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (entry) {
      // 日時文字列からローカルのdatetime-local入力用の形式に変換
      const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toISOString().slice(0, 16); // "YYYY-MM-DDThh:mm" 形式
      };

      setStartTime(formatDate(entry.start_time));
      setEndTime(entry.end_time ? formatDate(entry.end_time) : '');
      setDescription(entry.description || '');
    }
  }, [entry]);

  const handleSubmit = async () => {
    if (!startTime || (entry.end_time && !endTime)) {
      toast({
        title: '開始時間と終了時間を入力してください',
        status: 'error',
        duration: 3000,
      });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase
        .from('time_entries')
        .update({
          start_time: new Date(startTime).toISOString(),
          end_time: endTime ? new Date(endTime).toISOString() : null,
          description: description.trim() || null,
        })
        .eq('id', entry.id);

      if (error) throw error;

      toast({
        title: '作業記録を更新しました',
        status: 'success',
        duration: 3000,
      });
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error updating time entry:', error);
      toast({
        title: '作業記録の更新に失敗しました',
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
        <ModalHeader>作業時間の編集</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4}>
            <FormControl isRequired>
              <FormLabel>開始時間</FormLabel>
              <Input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </FormControl>
            <FormControl isRequired={!!entry.end_time}>
              <FormLabel>終了時間</FormLabel>
              <Input
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </FormControl>
            <FormControl>
              <FormLabel>作業内容</FormLabel>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="作業内容を入力してください"
              />
            </FormControl>
          </VStack>
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