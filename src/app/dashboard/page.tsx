'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api-client';
import { TimeStats } from '@/types/api';
import {
  Box,
  Container,
  Grid,
  GridItem,
  Stack,
  useToast,
} from '@chakra-ui/react';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import TimeDistributionChart from '@/components/dashboard/TimeDistributionChart';
import ProjectPieChart from '@/components/dashboard/ProjectPieChart';
import ProjectDistributionList from '@/components/dashboard/ProjectDistributionList';
import TeamActivities from '@/components/dashboard/TeamActivities';

export default function DashboardPage() {
  const [timeStats, setTimeStats] = useState<TimeStats | null>(null);
  console.log('Initial timeStats:', timeStats); // 初期値のログ
  useEffect(() => {
    console.log('timeStats updated:', timeStats); // 更新時のログ
  }, [timeStats]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTeamId, setSelectedTeamId] = useState<string>();
  const [selectedProjectId, setSelectedProjectId] = useState<string>();
  const { user } = useAuth();
  const toast = useToast();

  useEffect(() => {
    const fetchTimeStats = async () => {
      try {
        console.log('Fetching time stats...');
        const response = await apiClient.timeEntries.getStats({
          teamId: selectedTeamId,
          projectId: selectedProjectId,
        });
        console.log('Time stats response:', JSON.stringify(response, null, 2));
        if (response.error) {
          console.error('Response error:', response.error);
          throw response.error;
        }
        console.log('Monthly distribution:', response.data?.monthlyDistribution);
        setTimeStats(response.data);
      } catch (error) {
        console.error('Error fetching time stats:', error);
        toast({
          title: '統計情報の読み込みに失敗しました',
          status: 'error',
          duration: 5000,
        });
      } finally {
        setIsLoading(false);
      }
    };

    console.log('useEffect - user:', user); // ユーザー情報のログ
    if (user) {
      fetchTimeStats();
    } else {
      console.log('User not available yet'); // ユーザーが未取得の場合のログ
    }
  }, [user, toast, selectedTeamId, selectedProjectId]);

  const handleTeamChange = (teamId: string) => {
    setSelectedTeamId(teamId);
    setSelectedProjectId(undefined);
  };

  const handleProjectChange = (projectId: string) => {
    setSelectedProjectId(projectId);
  };

  if (!user) {
    return null; // ミドルウェアでリダイレクトされるため、一時的に非表示
  }

  if (isLoading) {
    return (
      <Container maxW="container.xl" py={8}>
        <Box>読み込み中...</Box>
      </Container>
    );
  }

  return (
    <Container maxW="container.xl" py={8}>
      <Stack spacing={8}>
        <DashboardHeader
          selectedTeamId={selectedTeamId}
          selectedProjectId={selectedProjectId}
          onTeamChange={handleTeamChange}
          onProjectChange={handleProjectChange}
        />

        {timeStats && (
          <>
            {console.log('timeStats:', timeStats)}
            <Box>
              <TimeDistributionChart
                monthlyDistribution={timeStats.monthlyDistribution}
              />
            </Box>

            <Grid templateColumns={{ base: '1fr', md: '300px 1fr' }} gap={8}>
              <GridItem>
                <Stack spacing={6}>
                  <ProjectPieChart
                    totalTime={timeStats.totalTime}
                    projectDistribution={timeStats.projectDistribution}
                  />
                  <ProjectDistributionList
                    projectDistribution={timeStats.projectDistribution}
                  />
                </Stack>
              </GridItem>

              <GridItem>
                <TeamActivities />
              </GridItem>
            </Grid>
          </>
        )}
      </Stack>
    </Container>
  );
}