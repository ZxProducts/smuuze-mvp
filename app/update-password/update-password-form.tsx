'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// パスワード更新フォームのスキーマ定義
const updatePasswordSchema = z.object({
  password: z.string().min(6, 'パスワードは6文字以上である必要があります'),
  confirmPassword: z.string().min(6, 'パスワードは6文字以上である必要があります'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'パスワードが一致しません',
  path: ['confirmPassword'],
});

type UpdatePasswordFormValues = z.infer<typeof updatePasswordSchema>;

export function UpdatePasswordForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UpdatePasswordFormValues>({
    resolver: zodResolver(updatePasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  const searchParams = useSearchParams();
  const code = searchParams.get('code');

  useEffect(() => {
    if (!code) {
      setError('無効なリセットリンクです。再度パスワードリセットを行ってください。');
    }
  }, [code]);

  const onSubmit = async (data: UpdatePasswordFormValues) => {
    if (!code) {
      setError('無効なリセットリンクです。再度パスワードリセットを行ってください。');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/update-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password: data.password,
          code: code
        }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        setError(result.error || 'パスワードの更新に失敗しました');
        return;
      }

      // パスワード更新成功後、ログインページにリダイレクト
      router.push('/login');
    } catch (error: any) {
      setError(error.message || 'パスワードの更新に失敗しました');
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

      <div>
        <Label htmlFor="password">新しいパスワード</Label>
        <div className="mt-1">
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            {...register('password')}
            disabled={isLoading}
          />
          {errors.password && (
            <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
          )}
        </div>
      </div>

      <div>
        <Label htmlFor="confirmPassword">新しいパスワード（確認）</Label>
        <div className="mt-1">
          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            {...register('confirmPassword')}
            disabled={isLoading}
          />
          {errors.confirmPassword && (
            <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
          )}
        </div>
      </div>

      <div>
        <Button
          type="submit"
          className="w-full"
          disabled={isLoading}
        >
          {isLoading ? '更新中...' : 'パスワードを更新'}
        </Button>
      </div>
    </form>
  );
}
