'use client';

import React, { useState } from 'react';
import {
  Box,
  Container,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  VStack,
  Text,
  useColorModeValue,
  Select,
  HStack,
  Spacer,
} from '@chakra-ui/react';
import { useProject } from '@/hooks/useProject';
import { useTask } from '@/hooks/useTask';
import { ProjectCharts } from '@/components/ProjectCharts';
import { AuthGuard } from '@/components/AuthGuard';
import { useQueryParams } from '@/hooks/useQueryParams';
import { Project, DatabaseTaskResponse } from '@/types/database.types';

// DatabaseTaskResponseをTaskWithTimeEntriesとして扱えるように変換する型
type TaskWithTimeEntries = DatabaseTaskResponse;

export default function ReportsPage() {
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const { getParam } = useQueryParams();
  const [selectedProjectId, setSelectedProjectId] = useState<string>(getParam('projectId') || '');

  const { projects = [] } = useProject();
  const { tasks = [], isLoading } = useTask(selectedProjectId || undefined);

  const handleProjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newProjectId = e.target.value;
    setSelectedProjectId(newProjectId);
    
    // URLを更新
    const url = new URL(window.location.href);
    if (newProjectId) {
      url.searchParams.set('projectId', newProjectId);
    } else {
      url.searchParams.delete('projectId');
    }
    window.history.pushState({}, '', url);
  };

  return (
    <AuthGuard>
      <Container maxW="container.xl" py={8}>
        <VStack spacing={6} align="stretch">
          {/* プロジェクト選択 */}
          <Box>
            <HStack>
              <Text>プロジェクト:</Text>
              <Select
                value={selectedProjectId}
                onChange={handleProjectChange}
                placeholder="プロジェクトを選択"
                maxW="300px"
              >
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </Select>
              <Spacer />
            </HStack>
          </Box>

          {selectedProjectId ? (
            <Box borderWidth={1} borderRadius="lg" borderColor={borderColor}>
              <Tabs isLazy>
                <TabList px={4} pt={4}>
                  <Tab>作業時間分析</Tab>
                  <Tab>タスク進捗</Tab>
                  <Tab>メンバー貢献度</Tab>
                </TabList>

                <TabPanels>
                  <TabPanel>
                    {!isLoading && tasks && (
                      <ProjectCharts
                        tasks={tasks}
                      />
                    )}
                  </TabPanel>
                  <TabPanel>
                    {/* TODO: タスク進捗レポート */}
                    <Box>タスク進捗レポートは開発中です</Box>
                  </TabPanel>
                  <TabPanel>
                    {/* TODO: メンバー貢献度レポート */}
                    <Box>メンバー貢献度レポートは開発中です</Box>
                  </TabPanel>
                </TabPanels>
              </Tabs>
            </Box>
          ) : (
            <Box p={8} textAlign="center">
              <Text color="gray.500">
                プロジェクトを選択してレポートを表示します
              </Text>
            </Box>
          )}
        </VStack>
      </Container>
    </AuthGuard>
  );
}