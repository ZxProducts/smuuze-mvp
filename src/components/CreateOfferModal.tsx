'use client';

import { apiClient } from '@/lib/api-client';
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
  FormErrorMessage,
  useToast,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Switch,
  Stack,
} from '@chakra-ui/react';
import { useForm, Controller } from 'react-hook-form';
import { useCallback } from 'react';
import { CreateOfferRequest } from '@/types/api';

interface CreateOfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamId: string;
  onSubmit: () => void;
}

type OfferFormData = CreateOfferRequest;

export default function CreateOfferModal({
  isOpen,
  onClose,
  teamId,
  onSubmit,
}: CreateOfferModalProps) {
  const toast = useToast();
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<OfferFormData>({
    defaultValues: {
      hourly_rate: 0,
      daily_work_hours: 8,
      weekly_work_days: 5,
      meeting_included: true,
    },
  });

  const onFormSubmit = useCallback(async (data: OfferFormData) => {
    try {
      const response = await apiClient.teams.createOffer(teamId, {
        email: data.email,
        hourly_rate: data.hourly_rate,
        daily_work_hours: data.daily_work_hours,
        weekly_work_days: data.weekly_work_days,
        meeting_included: data.meeting_included,
        notes: data.notes || undefined,
      });

      if (response.error) {
        throw response.error;
      }

      console.log('Offer created:', response);

      toast({
        title: response.data.message || 'メンバーを招待しました',
        status: 'success',
      });

      reset();
      onClose();
      onSubmit();
    } catch (error) {
      console.error('Error creating offer:', error);
      toast({
        title: 'エラーが発生しました',
        description: error instanceof Error ? error.message : 'もう一度お試しください',
        status: 'error',
      });
    }
  }, [teamId, reset, onClose, onSubmit, toast]);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="lg">
      <ModalOverlay />
      <ModalContent>
        <form onSubmit={handleSubmit(onFormSubmit)}>
          <ModalHeader>メンバーを招待</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Stack spacing={4}>
              <FormControl isInvalid={!!errors.email}>
                <FormLabel>メールアドレス</FormLabel>
                <Input
                  {...register('email', {
                    required: 'メールアドレスは必須です',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: '有効なメールアドレスを入力してください',
                    },
                  })}
                  placeholder="example@example.com"
                />
                <FormErrorMessage>{errors.email?.message}</FormErrorMessage>
              </FormControl>

              <FormControl isInvalid={!!errors.hourly_rate}>
                <FormLabel>時給（円）</FormLabel>
                <Controller
                  name="hourly_rate"
                  control={control}
                  rules={{
                    required: '時給は必須です',
                    min: { value: 0, message: '0円以上で入力してください' },
                  }}
                  render={({ field }) => (
                    <NumberInput {...field} min={0}>
                      <NumberInputField />
                      <NumberInputStepper>
                        <NumberIncrementStepper />
                        <NumberDecrementStepper />
                      </NumberInputStepper>
                    </NumberInput>
                  )}
                />
                <FormErrorMessage>{errors.hourly_rate?.message}</FormErrorMessage>
              </FormControl>

              <FormControl isInvalid={!!errors.daily_work_hours}>
                <FormLabel>1日の稼働時間</FormLabel>
                <Controller
                  name="daily_work_hours"
                  control={control}
                  rules={{
                    required: '稼働時間は必須です',
                    min: { value: 0, message: '0時間以上で入力してください' },
                    max: { value: 24, message: '24時間以内で入力してください' },
                  }}
                  render={({ field }) => (
                    <NumberInput {...field} min={0} max={24}>
                      <NumberInputField />
                      <NumberInputStepper>
                        <NumberIncrementStepper />
                        <NumberDecrementStepper />
                      </NumberInputStepper>
                    </NumberInput>
                  )}
                />
                <FormErrorMessage>
                  {errors.daily_work_hours?.message}
                </FormErrorMessage>
              </FormControl>

              <FormControl isInvalid={!!errors.weekly_work_days}>
                <FormLabel>週の稼働日数</FormLabel>
                <Controller
                  name="weekly_work_days"
                  control={control}
                  rules={{
                    required: '稼働日数は必須です',
                    min: { value: 0, message: '0日以上で入力してください' },
                    max: { value: 7, message: '7日以内で入力してください' },
                  }}
                  render={({ field }) => (
                    <NumberInput {...field} min={0} max={7}>
                      <NumberInputField />
                      <NumberInputStepper>
                        <NumberIncrementStepper />
                        <NumberDecrementStepper />
                      </NumberInputStepper>
                    </NumberInput>
                  )}
                />
                <FormErrorMessage>
                  {errors.weekly_work_days?.message}
                </FormErrorMessage>
              </FormControl>

              <FormControl>
                <FormLabel>会議費を含める</FormLabel>
                <Controller
                  name="meeting_included"
                  control={control}
                  render={({ field: { onChange, value } }) => (
                    <Switch isChecked={value} onChange={onChange} />
                  )}
                />
              </FormControl>

              <FormControl>
                <FormLabel>特記事項</FormLabel>
                <Textarea
                  {...register('notes')}
                  placeholder="特記事項があれば入力してください"
                />
              </FormControl>
            </Stack>
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={handleClose}>
              キャンセル
            </Button>
            <Button
              colorScheme="blue"
              type="submit"
              isLoading={isSubmitting}
            >
              招待する
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}