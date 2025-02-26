'use client';

import React from 'react';
import {
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  IconButton,
  Button,
  useToast,
  Text,
  HStack,
} from '@chakra-ui/react';
import { DownloadIcon, ChevronDownIcon } from '@chakra-ui/icons';
import { Task, TimeEntryWithDetails } from '@/types/database.types';
import {
  ExportType,
  exportTasks,
  exportTimeEntries,
  exportMemberSummary,
  createDownloadUrl,
  generateFileName,
} from '@/utils/exportUtils';

interface TimeEntryWithUser extends TimeEntryWithDetails {}

interface TaskWithTimeEntries extends Task {
  status: 'not_started' | 'in_progress' | 'completed';
  time_entries: TimeEntryWithUser[];
}

interface ExportMenuProps {
  projectName: string;
  tasks: TaskWithTimeEntries[];
  isDisabled?: boolean;
}

export function ExportMenu({ projectName, tasks, isDisabled = false }: ExportMenuProps) {
  const toast = useToast();

  const handleExport = (type: ExportType) => {
    try {
      let content: string;
      switch (type) {
        case 'tasks':
          // タスク一覧のエクスポートでは作業時間データは不要なので、基本情報のみを渡す
          content = exportTasks(tasks.map(({ time_entries, ...task }) => task));
          break;
        case 'timeEntries':
          content = exportTimeEntries(tasks);
          break;
        case 'memberSummary':
          content = exportMemberSummary(tasks);
          break;
        default:
          throw new Error('不明なエクスポートタイプです');
      }

      const url = createDownloadUrl(content, 'text/csv');
      const fileName = generateFileName(type, projectName);

      // ダウンロードリンクを作成して自動クリック
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Blob URLを解放
      URL.revokeObjectURL(url);

      toast({
        title: 'エクスポート完了',
        description: 'データのダウンロードを開始しました',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: 'エクスポートエラー',
        description: 'データのエクスポートに失敗しました',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  // タスクが空の場合はメニューを無効化
  const hasData = tasks.length > 0;

  return (
    <Menu>
      <MenuButton
        as={Button}
        rightIcon={<ChevronDownIcon />}
        leftIcon={<DownloadIcon />}
        isDisabled={isDisabled || !hasData}
        variant="outline"
        colorScheme="gray"
      >
        エクスポート
      </MenuButton>
      <MenuList>
        <MenuItem
          onClick={() => handleExport('tasks')}
          isDisabled={!hasData}
        >
          <HStack spacing={2}>
            <DownloadIcon />
            <Text>タスク一覧</Text>
          </HStack>
        </MenuItem>
        <MenuItem
          onClick={() => handleExport('timeEntries')}
          isDisabled={!hasData}
        >
          <HStack spacing={2}>
            <DownloadIcon />
            <Text>作業時間データ</Text>
          </HStack>
        </MenuItem>
        <MenuItem
          onClick={() => handleExport('memberSummary')}
          isDisabled={!hasData}
        >
          <HStack spacing={2}>
            <DownloadIcon />
            <Text>メンバー別集計</Text>
          </HStack>
        </MenuItem>
      </MenuList>
    </Menu>
  );
}