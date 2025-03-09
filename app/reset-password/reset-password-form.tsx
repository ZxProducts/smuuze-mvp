'use client';

import { useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// パスワードリセットフォームのスキーマ定義
const resetPasswordSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
});

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export function ResetPasswordForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (data: ResetPasswordFormValues) => {
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: data.email,
        }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        setError(result.error || 'パスワードリセットに失敗しました');
        return;
      }

      setSuccess(true);
    } catch (error: any) {
      setError(error.message || 'パスワードリセットに失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="text-sm text-red-700">{error}</div>
          </div>
        </div>
      )}

      {success && (
        <div className="rounded-md bg-green-50 p-4">
          <div className="flex">
            <div className="text-sm text-green-700">
              パスワードリセット用のリンクを送信しました。メールをご確認ください。
            </div>
          </div>
        </div>
      )}

      <div>
        <Label htmlFor="email">メールアドレス</Label>
        <div className="mt-1">
          <Input
            id="email"
            type="email"
            autoComplete="email"
            {...register('email')}
            disabled={isLoading || success}
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
          )}
        </div>
      </div>

      <div>
        <Button
          type="submit"
          className="w-full"
          disabled={isLoading || success}
        >
          {isLoading ? '送信中...' : 'リセットリンクを送信'}
        </Button>
      </div>

      <div className="text-center">
        <a href="/login" className="text-sm font-medium text-blue-600 hover:text-blue-500">
          ログインページに戻る
        </a>
      </div>
    </form>
  );
}
