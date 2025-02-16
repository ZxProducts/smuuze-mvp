'use client';

import React, { useState, useRef, RefObject } from 'react';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverHeader,
  PopoverBody,
  PopoverFooter,
  PopoverArrow,
  PopoverCloseButton,
  Button,
  IconButton,
  VStack,
  HStack,
  Box,
  Text,
  Input,
  useColorModeValue,
  ButtonGroup,
  Divider,
  useDisclosure,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  useToast,
  Tooltip,
} from '@chakra-ui/react';
import { StarIcon, EditIcon, DeleteIcon, CheckIcon, CloseIcon } from '@chakra-ui/icons';
import { ChartStyles } from './ChartStyleSettings';

interface ChartStylePresetsProps {
  currentStyles: ChartStyles;
  presets: Array<{
    id: string;
    name: string;
    styles: ChartStyles;
    createdAt: string;
  }>;
  onSave: (name: string, styles: ChartStyles) => void;
  onUpdate: (id: string, name: string, styles: ChartStyles) => void;
  onDelete: (id: string) => void;
  onApply: (id: string) => void;
}

export function ChartStylePresets({
  currentStyles,
  presets,
  onSave,
  onUpdate,
  onDelete,
  onApply,
}: ChartStylePresetsProps) {
  const toast = useToast();
  const [newPresetName, setNewPresetName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const { isOpen: isAlertOpen, onOpen: onAlertOpen, onClose: onAlertClose } = useDisclosure();
  const cancelRef = useRef<HTMLButtonElement>(null);

  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  const handleSavePreset = () => {
    if (!newPresetName.trim()) {
      toast({
        title: 'プリセット名を入力してください',
        status: 'warning',
        duration: 3000,
      });
      return;
    }

    onSave(newPresetName.trim(), currentStyles);
    setNewPresetName('');
    toast({
      title: 'プリセットを保存しました',
      status: 'success',
      duration: 3000,
    });
  };

  const handleStartEdit = (id: string, name: string) => {
    setEditingId(id);
    setEditingName(name);
  };

  const handleConfirmEdit = (id: string) => {
    if (!editingName.trim()) {
      toast({
        title: 'プリセット名を入力してください',
        status: 'warning',
        duration: 3000,
      });
      return;
    }

    const preset = presets.find(p => p.id === id);
    if (preset) {
      onUpdate(id, editingName.trim(), preset.styles);
      toast({
        title: 'プリセットを更新しました',
        status: 'success',
        duration: 3000,
      });
    }
    setEditingId(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  const handleDeleteClick = (id: string) => {
    setDeleteTargetId(id);
    onAlertOpen();
  };

  const handleConfirmDelete = () => {
    if (deleteTargetId) {
      onDelete(deleteTargetId);
      toast({
        title: 'プリセットを削除しました',
        status: 'success',
        duration: 3000,
      });
    }
    onAlertClose();
    setDeleteTargetId(null);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Popover placement="bottom-end">
      <PopoverTrigger>
        <IconButton
          aria-label="スタイルプリセット"
          icon={<StarIcon />}
          variant="outline"
          size="sm"
        />
      </PopoverTrigger>
      <PopoverContent
        bg={bgColor}
        borderColor={borderColor}
        width="300px"
      >
        <PopoverArrow />
        <PopoverCloseButton />
        <PopoverHeader fontWeight="bold">スタイルプリセット</PopoverHeader>
        <PopoverBody>
          <VStack spacing={4} align="stretch">
            {/* 新規プリセットの保存 */}
            <Box>
              <Text fontSize="sm" mb={2}>新規プリセットを保存</Text>
              <HStack>
                <Input
                  size="sm"
                  placeholder="プリセット名"
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                />
                <Button
                  size="sm"
                  colorScheme="brand"
                  onClick={handleSavePreset}
                >
                  保存
                </Button>
              </HStack>
            </Box>

            <Divider />

            {/* プリセット一覧 */}
            <VStack spacing={2} align="stretch">
              {presets.map(preset => (
                <Box
                  key={preset.id}
                  p={2}
                  borderWidth={1}
                  borderRadius="md"
                  borderColor={borderColor}
                >
                  {editingId === preset.id ? (
                    <HStack>
                      <Input
                        size="sm"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                      />
                      <IconButton
                        aria-label="確認"
                        icon={<CheckIcon />}
                        size="sm"
                        colorScheme="green"
                        onClick={() => handleConfirmEdit(preset.id)}
                      />
                      <IconButton
                        aria-label="キャンセル"
                        icon={<CloseIcon />}
                        size="sm"
                        onClick={handleCancelEdit}
                      />
                    </HStack>
                  ) : (
                    <HStack justify="space-between">
                      <VStack align="start" spacing={0}>
                        <Text fontWeight="medium">{preset.name}</Text>
                        <Text fontSize="xs" color="gray.500">
                          {formatDate(preset.createdAt)}
                        </Text>
                      </VStack>
                      <ButtonGroup size="sm" variant="ghost">
                        <Tooltip label="適用">
                          <IconButton
                            aria-label="適用"
                            icon={<StarIcon />}
                            onClick={() => onApply(preset.id)}
                            colorScheme="brand"
                          />
                        </Tooltip>
                        <Tooltip label="編集">
                          <IconButton
                            aria-label="編集"
                            icon={<EditIcon />}
                            onClick={() => handleStartEdit(preset.id, preset.name)}
                          />
                        </Tooltip>
                        <Tooltip label="削除">
                          <IconButton
                            aria-label="削除"
                            icon={<DeleteIcon />}
                            onClick={() => handleDeleteClick(preset.id)}
                            colorScheme="red"
                          />
                        </Tooltip>
                      </ButtonGroup>
                    </HStack>
                  )}
                </Box>
              ))}
            </VStack>
          </VStack>
        </PopoverBody>
      </PopoverContent>

      {/* 削除確認ダイアログ */}
      <AlertDialog
        isOpen={isAlertOpen}
        leastDestructiveRef={cancelRef as RefObject<HTMLButtonElement>}
        onClose={onAlertClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader>プリセットの削除</AlertDialogHeader>
            <AlertDialogBody>
              このプリセットを削除してもよろしいですか？この操作は取り消せません。
            </AlertDialogBody>
            <AlertDialogFooter>
              <ButtonGroup>
                <Button ref={cancelRef} onClick={onAlertClose}>
                  キャンセル
                </Button>
                <Button
                  colorScheme="red"
                  onClick={handleConfirmDelete}
                >
                  削除
                </Button>
              </ButtonGroup>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Popover>
  );
}