'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { TeamResponse, AuthUser } from '@/types/api';
import {
  Box,
  Button,
  Container,
  Heading,
  Stack,
  Text,
  useDisclosure,
  Card,
  CardHeader,
  CardBody,
  Avatar,
  SimpleGrid,
  IconButton,
  HStack,
  Tooltip,
  useToast,
} from '@chakra-ui/react';
import { useRouter } from 'next/navigation';
import { AddIcon, EditIcon, DeleteIcon } from '@chakra-ui/icons';
import TeamFormModal from '@/components/TeamFormModal';
import DeleteTeamModal from '@/components/DeleteTeamModal';
import { useAuth } from '@/contexts/AuthContext';

export default function TeamsPage() {
  const [teams, setTeams] = useState<TeamResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState<TeamResponse | null>(null);
  const { isOpen: isFormOpen, onOpen: onFormOpen, onClose: onFormClose } = useDisclosure();
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuth();

  const fetchTeams = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.teams.list();
      if (response.error) throw response.error;
      setTeams(response.data);
    } catch (error) {
      console.error('Error fetching teams:', error);
      toast({
        title: 'チームの取得に失敗しました',
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

  const handleTeamCreate = () => {
    setSelectedTeam(null);
    onFormOpen();
  };

  const handleTeamEdit = (team: TeamResponse) => {
    setSelectedTeam(team);
    onFormOpen();
  };

  const handleTeamDelete = (team: TeamResponse) => {
    setSelectedTeam(team);
    onDeleteOpen();
  };

  const handleTeamSubmit = async () => {
    onFormClose();
    await fetchTeams();
  };

  if (!user) {
    return null; // ミドルウェアでリダイレクトされるため、一時的に非表示
  }

  return (
    <Container maxW="container.xl" py={8}>
      <Stack spacing={8}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Heading size="lg">チーム管理</Heading>
          <Button
            leftIcon={<AddIcon />}
            colorScheme="blue"
            onClick={handleTeamCreate}
          >
            新規チーム作成
          </Button>
        </Box>

        {isLoading ? (
          <Text>読み込み中...</Text>
        ) : (
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
            {teams.map((team) => (
              <Card key={team.id}>
                <CardHeader>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Heading size="md">{team.name}</Heading>
                    <HStack>
                      <IconButton
                        aria-label="Edit team"
                        icon={<EditIcon />}
                        size="sm"
                        variant="ghost"
                        onClick={() => handleTeamEdit(team)}
                      />
                      {user.id === team.created_by && (
                        <IconButton
                          aria-label="Delete team"
                          icon={<DeleteIcon />}
                          size="sm"
                          variant="ghost"
                          colorScheme="red"
                          onClick={() => handleTeamDelete(team)}
                        />
                      )}
                    </HStack>
                  </Box>
                </CardHeader>
                <CardBody>
                  <Stack spacing={4}>
                    <Text>{team.description}</Text>
                    <Box>
                      <Text fontWeight="bold" mb={2}>
                        メンバー ({team.members.length})
                      </Text>
                      <HStack spacing={2} flexWrap="wrap">
                        {team.members.map((member) => (
                          <Tooltip
                            key={member.id}
                            label={member.profile.full_name}
                            placement="top"
                          >
                            <Avatar
                              size="sm"
                              name={member.profile.full_name}
                              src={undefined}
                            />
                          </Tooltip>
                        ))}
                      </HStack>
                    </Box>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => router.push(`/teams/${team.id}`)}
                    >
                      詳細を表示
                    </Button>
                  </Stack>
                </CardBody>
              </Card>
            ))}
          </SimpleGrid>
        )}
      </Stack>

      <TeamFormModal
        isOpen={isFormOpen}
        onClose={onFormClose}
        team={selectedTeam}
        onSubmit={handleTeamSubmit}
      />

      {selectedTeam && (
        <DeleteTeamModal
          isOpen={isDeleteOpen}
          onClose={onDeleteClose}
          teamId={selectedTeam.id}
          teamName={selectedTeam.name}
          onDelete={fetchTeams}
        />
      )}
    </Container>
  );
}