'use client';

import {
  Box,
  VStack,
  HStack,
  Text,
  Avatar,
  Progress,
  Divider,
} from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { TeamMemberActivity } from '@/types/api';

export default function TeamActivities() {
  const [activities, setActivities] = useState<TeamMemberActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        const response = await apiClient.teams.getActivities();
        if (response.error) throw response.error;
        setActivities(response.data);
      } catch (error) {
        console.error('Error fetching team activities:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchActivities();
  }, []);

  if (isLoading) {
    return <Text>読み込み中...</Text>;
  }

  return (
    <Box>
      <Text fontSize="lg" fontWeight="bold" mb={4}>
        Team activities
      </Text>
      <VStack spacing={6} align="stretch">
        {activities.map((member) => (
          <Box key={member.id}>
            <HStack spacing={4} mb={3}>
              <Avatar
                size="md"
                name={member.full_name}
              />
              <Box flex={1}>
                <Text fontWeight="medium">{member.full_name}</Text>
                {member.latest_activity ? (
                  <>
                    <Text fontSize="sm" color="gray.600">
                      {member.latest_activity.project_name}:{' '}
                      {member.latest_activity.description}
                    </Text>
                    <Text fontSize="xs" color="gray.500">
                      {new Date(member.latest_activity.timestamp).toLocaleString('ja-JP')}
                    </Text>
                  </>
                ) : (
                  <Text fontSize="sm" color="gray.500">
                    アクティビティはありません
                  </Text>
                )}
              </Box>
              <Box textAlign="right" minW="100px">
                <Text fontSize="sm" fontWeight="medium">
                  {member.total_time}
                </Text>
                <Progress
                  value={member.time_percentage}
                  size="sm"
                  borderRadius="full"
                  colorScheme={member.time_percentage > 80 ? 'green' : 'yellow'}
                />
              </Box>
            </HStack>
            <Divider />
          </Box>
        ))}
      </VStack>
    </Box>
  );
}