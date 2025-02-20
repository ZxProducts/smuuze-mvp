'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Team, TeamMemberWithProfile, Offer } from '@/types/database.types';
import {
  Box,
  Container,
  Heading,
  Stack,
  Text,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  useDisclosure,
  Button,
  Card,
  CardHeader,
  CardBody,
  SimpleGrid,
  Avatar,
  HStack,
  Badge,
  IconButton,
  useToast,
} from '@chakra-ui/react';
import { AddIcon, DeleteIcon } from '@chakra-ui/icons';
import { useRouter } from 'next/navigation';
import TeamFormModal from '@/components/TeamFormModal';
import CreateOfferModal from '@/components/CreateOfferModal';

interface TeamDetails extends Team {
  members: TeamMemberWithProfile[];
  offers: Offer[];
}

interface TeamDetailsContentProps {
  teamId: string;
}

export default function TeamDetailsContent({ teamId }: TeamDetailsContentProps) {
  const [team, setTeam] = useState<TeamDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const toast = useToast();
  const {
    isOpen: isTeamModalOpen,
    onOpen: onTeamModalOpen,
    onClose: onTeamModalClose,
  } = useDisclosure();
  const {
    isOpen: isOfferModalOpen,
    onOpen: onOfferModalOpen,
    onClose: onOfferModalClose,
  } = useDisclosure();

  const fetchTeam = async () => {
    setIsLoading(true);
    try {
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select(`
          *,
          members:team_members(
            *,
            profile:profiles(*)
          ),
          offers(*)
        `)
        .eq('id', teamId)
        .single();

      if (teamError) throw teamError;
      setTeam(teamData);
    } catch (error) {
      console.error('Error fetching team:', error);
      toast({
        title: 'チームの読み込みに失敗しました',
        status: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTeam();
  }, [teamId]);

  const handleTeamUpdate = async () => {
    onTeamModalClose();
    await fetchTeam();
  };

  const handleOfferCreate = async () => {
    onOfferModalClose();
    await fetchTeam();
  };

  const handleMemberRemove = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      toast({
        title: 'メンバーを削除しました',
        status: 'success',
      });
      await fetchTeam();
    } catch (error) {
      console.error('Error removing member:', error);
      toast({
        title: 'メンバーの削除に失敗しました',
        status: 'error',
      });
    }
  };

  if (isLoading) {
    return (
      <Container maxW="container.xl" py={8}>
        <Text>読み込み中...</Text>
      </Container>
    );
  }

  if (!team) {
    return (
      <Container maxW="container.xl" py={8}>
        <Text>チームが見つかりません</Text>
      </Container>
    );
  }

  return (
    <Container maxW="container.xl" py={8}>
      <Stack spacing={8}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Stack>
            <Heading size="lg">{team.name}</Heading>
            <Text color="gray.600">{team.description}</Text>
          </Stack>
          <Button onClick={onTeamModalOpen}>チーム設定</Button>
        </Box>

        <Tabs>
          <TabList>
            <Tab>メンバー ({team.members.length})</Tab>
            <Tab>招待管理 ({team.offers.length})</Tab>
          </TabList>

          <TabPanels>
            <TabPanel>
              <Stack spacing={4}>
                <Box display="flex" justifyContent="flex-end">
                  <Button
                    leftIcon={<AddIcon />}
                    colorScheme="blue"
                    onClick={onOfferModalOpen}
                  >
                    メンバーを招待
                  </Button>
                </Box>

                <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
                  {team.members.map((member) => (
                    <Card key={member.id}>
                      <CardHeader>
                        <HStack justify="space-between">
                          <HStack spacing={3}>
                            <Avatar
                              size="sm"
                              name={member.profile.full_name}
                              src={member.profile.avatar_url || undefined}
                            />
                            <Stack spacing={0}>
                              <Text fontWeight="bold">
                                {member.profile.full_name}
                              </Text>
                              <Text fontSize="sm" color="gray.600">
                                {member.profile.email}
                              </Text>
                            </Stack>
                          </HStack>
                          <IconButton
                            aria-label="Remove member"
                            icon={<DeleteIcon />}
                            size="sm"
                            variant="ghost"
                            colorScheme="red"
                            onClick={() => handleMemberRemove(member.id)}
                          />
                        </HStack>
                      </CardHeader>
                      <CardBody>
                        <Stack spacing={2}>
                          <HStack>
                            <Text fontWeight="bold">稼働時間:</Text>
                            <Text>
                              {member.daily_work_hours}時間/日 ×{' '}
                              {member.weekly_work_days}日/週
                            </Text>
                          </HStack>
                          <HStack>
                            <Text fontWeight="bold">時給:</Text>
                            <Text>{member.hourly_rate}円</Text>
                          </HStack>
                          <Badge
                            colorScheme={member.meeting_included ? 'green' : 'gray'}
                          >
                            {member.meeting_included
                              ? '会議費含む'
                              : '会議費含まない'}
                          </Badge>
                          {member.notes && (
                            <Text fontSize="sm" color="gray.600">
                              {member.notes}
                            </Text>
                          )}
                        </Stack>
                      </CardBody>
                    </Card>
                  ))}
                </SimpleGrid>
              </Stack>
            </TabPanel>

            <TabPanel>
              <Stack spacing={4}>
                <Box display="flex" justifyContent="flex-end">
                  <Button
                    leftIcon={<AddIcon />}
                    colorScheme="blue"
                    onClick={onOfferModalOpen}
                  >
                    新規オファー作成
                  </Button>
                </Box>

                <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
                  {team.offers.map((offer) => (
                    <Card key={offer.id}>
                      <CardHeader>
                        <Stack spacing={2}>
                          <Text fontWeight="bold">{offer.email}</Text>
                          <Badge
                            colorScheme={
                              offer.status === 'pending'
                                ? 'yellow'
                                : offer.status === 'accepted'
                                ? 'green'
                                : 'red'
                            }
                          >
                            {offer.status === 'pending'
                              ? '承認待ち'
                              : offer.status === 'accepted'
                              ? '承認済み'
                              : '拒否'}
                          </Badge>
                        </Stack>
                      </CardHeader>
                      <CardBody>
                        <Stack spacing={2}>
                          <HStack>
                            <Text fontWeight="bold">稼働時間:</Text>
                            <Text>
                              {offer.daily_work_hours}時間/日 ×{' '}
                              {offer.weekly_work_days}日/週
                            </Text>
                          </HStack>
                          <HStack>
                            <Text fontWeight="bold">時給:</Text>
                            <Text>{offer.hourly_rate}円</Text>
                          </HStack>
                          <Badge
                            colorScheme={offer.meeting_included ? 'green' : 'gray'}
                          >
                            {offer.meeting_included
                              ? '会議費含む'
                              : '会議費含まない'}
                          </Badge>
                          {offer.notes && (
                            <Text fontSize="sm" color="gray.600">
                              {offer.notes}
                            </Text>
                          )}
                        </Stack>
                      </CardBody>
                    </Card>
                  ))}
                </SimpleGrid>
              </Stack>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Stack>

      <TeamFormModal
        isOpen={isTeamModalOpen}
        onClose={onTeamModalClose}
        team={team}
        onSubmit={handleTeamUpdate}
      />

      <CreateOfferModal
        isOpen={isOfferModalOpen}
        onClose={onOfferModalClose}
        teamId={team.id}
        onSubmit={handleOfferCreate}
      />
    </Container>
  );
}