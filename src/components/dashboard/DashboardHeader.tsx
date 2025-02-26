'use client';

import { useEffect, useState } from 'react';
import { Box, Flex, Text, Heading, Select, FormControl, FormLabel } from '@chakra-ui/react';
import { apiClient } from '@/lib/api-client';
import { Team, Project } from '@/types/api';

interface TimeStats {
  totalTime: string;
  topProject: {
    name: string;
    time: string;
  };
}

interface DashboardHeaderProps {
  selectedTeamId?: string;
  selectedProjectId?: string;
  onTeamChange: (teamId: string) => void;
  onProjectChange: (projectId: string) => void;
}

export default function DashboardHeader({
  selectedTeamId,
  selectedProjectId,
  onTeamChange,
  onProjectChange,
}: DashboardHeaderProps) {
  const [stats, setStats] = useState<TimeStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [teams, setTeams] = useState<Team[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  // チーム一覧を取得
  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const response = await apiClient.teams.list();
        if (response.error) throw response.error;
        setTeams(response.data);
      } catch (error) {
        console.error('Error fetching teams:', error);
      }
    };

    fetchTeams();
  }, []);

  // プロジェクト一覧を取得
  useEffect(() => {
    const fetchProjects = async () => {
      if (!selectedTeamId) {
        setProjects([]);
        return;
      }

      try {
        const response = await apiClient.projects.list({ teamId: selectedTeamId });
        if (response.error) throw response.error;
        setProjects(response.data);
      } catch (error) {
        console.error('Error fetching projects:', error);
      }
    };

    fetchProjects();
  }, [selectedTeamId]);

  // 統計情報を取得
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await apiClient.timeEntries.getStats({
          teamId: selectedTeamId,
          projectId: selectedProjectId,
        });
        if (response.error) throw response.error;
        setStats(response.data);
      } catch (error) {
        console.error('Error fetching time stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [selectedTeamId, selectedProjectId]);

  if (isLoading) {
    return <Box>読み込み中...</Box>;
  }

  return (
    <Box bg="gray.50" p={4} borderRadius="lg" mb={6}>
      <Flex direction="column" gap={4}>
        <Flex gap={4}>
          <FormControl w="200px">
            <FormLabel fontSize="sm" color="gray.600">チーム</FormLabel>
            <Select
              value={selectedTeamId || ''}
              onChange={(e) => onTeamChange(e.target.value)}
              placeholder="チームを選択"
            >
              {teams.map(team => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </Select>
          </FormControl>

          <FormControl w="200px">
            <FormLabel fontSize="sm" color="gray.600">プロジェクト</FormLabel>
            <Select
              value={selectedProjectId || ''}
              onChange={(e) => onProjectChange(e.target.value)}
              placeholder="プロジェクトを選択"
              isDisabled={!selectedTeamId}
            >
              {projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </Select>
          </FormControl>
        </Flex>

        <Flex justify="space-between" align="center">
          <Box>
            <Text fontSize="sm" color="gray.600">合計時間</Text>
            <Heading size="lg">{stats?.totalTime || '00:00:00'}</Heading>
          </Box>

          <Flex gap={8}>
            <Box>
              <Text fontSize="sm" color="gray.600">トッププロジェクト</Text>
              <Text fontSize="lg" fontWeight="bold">{stats?.topProject?.name || '—'}</Text>
              <Text fontSize="sm" color="gray.600">{stats?.topProject?.time || '00:00:00'}</Text>
            </Box>
          </Flex>
        </Flex>
      </Flex>
    </Box>
  );
}