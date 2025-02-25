'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api-client';
import { TeamResponse } from '@/types/api';
import {
  Box,
  Button,
  Container,
  Input,
  Heading,
  Text,
  useDisclosure,
  Card,
  CardHeader,
  CardBody,
  SimpleGrid,
  Stack,
  useToast,
} from '@chakra-ui/react';
import { AddIcon } from '@chakra-ui/icons';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import TeamFormModal from '@/components/TeamFormModal';

export default function DashboardPage() {
  const [teams, setTeams] = useState<TeamResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const toast = useToast();
  const {
    isOpen: isTeamModalOpen,
    onOpen: onTeamModalOpen,
    onClose: onTeamModalClose,
  } = useDisclosure();
  const router = useRouter();

  const fetchTeams = async () => {
    try {
      const response = await apiClient.teams.list();
      if (response.error) throw response.error;
      setTeams(response.data);
    } catch (error) {
      console.error('Error fetching teams:', error);
      toast({
        title: 'チームの読み込みに失敗しました',
        status: 'error',
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchTeams();
    }
  }, [user]);

  const handleTeamCreate = async () => {
    onTeamModalClose();
    await fetchTeams();
  };

  if (!user) {
    return null; // ミドルウェアでリダイレクトされるため、一時的に非表示
  }

  if (isLoading) {
    return (
      <Container maxW="container.xl" py={8}>
        <Text>読み込み中...</Text>
      </Container>
    );
  }

  return (
    <Container maxW="container.xl" py={8}>
      <Stack spacing={8}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Stack>
            <Heading size="lg">マイチーム</Heading>
            <Text color="gray.600">
              {user.full_name || user.email}さんが所属するチーム一覧
            </Text>
          </Stack>
          <Button
            leftIcon={<AddIcon />}
            colorScheme="blue"
            onClick={onTeamModalOpen}
          >
            新規チーム作成
          </Button>
        </Box>

        {teams.length === 0 ? (
          <Card>
            <CardBody>
              <Text>所属しているチームはありません</Text>
            </CardBody>
          </Card>
        ) : (
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
            {teams.map((team) => (
              <Link href={`/teams/${team.id}`} key={team.id}>
                <Card
                  height="100%"
                  cursor="pointer"
                  _hover={{ transform: 'translateY(-2px)', shadow: 'md' }}
                  transition="all 0.2s"
                >
                  <CardHeader>
                    <Heading size="md">{team.name}</Heading>
                  </CardHeader>
                  <CardBody>
                    <Stack spacing={4}>
                      <Text color="gray.600">{team.description}</Text>
                      <Box>
                        <Text fontSize="sm" fontWeight="bold">
                          メンバー数: {team.members.length}
                        </Text>
                        <Text fontSize="sm" color="gray.600">
                          招待中: {team.offers.length}
                        </Text>
                      </Box>
                    </Stack>
                  </CardBody>
                </Card>
              </Link>
            ))}
          </SimpleGrid>
        )}
      </Stack>

      <TeamFormModal
        isOpen={isTeamModalOpen}
        onClose={onTeamModalClose}
        team={null}
        onSubmit={handleTeamCreate}
      />
    </Container>
  );
}