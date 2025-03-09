'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { UserPlus } from 'lucide-react';

interface AddMemberDialogProps {
  teamId: string;
  teamName: string;
  onMemberAdded: () => void;
}

export function AddMemberDialog({ teamId, teamName, onMemberAdded }: AddMemberDialogProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [hourlyRate, setHourlyRate] = useState('0');
  const [dailyWorkHours, setDailyWorkHours] = useState('8');
  const [weeklyWorkDays, setWeeklyWorkDays] = useState('5');
  const [meetingIncluded, setMeetingIncluded] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setError('メールアドレスは必須です');
      return;
    }
    
    setIsSubmitting(true);
    setError('');
    
    try {
      const response = await fetch(`/api/teams/${teamId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          hourlyRate: parseFloat(hourlyRate) || 0,
          dailyWorkHours: parseInt(dailyWorkHours) || 8,
          weeklyWorkDays: parseInt(weeklyWorkDays) || 5,
          meetingIncluded,
          role: isAdmin ? 'admin' : 'member',
        }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'メンバーの追加に失敗しました');
      }
      
      // フォームをリセット
      setEmail('');
      setHourlyRate('0');
      setDailyWorkHours('8');
      setWeeklyWorkDays('5');
      setMeetingIncluded(true);
      setIsAdmin(false);
      
      // モーダルを閉じる
      setOpen(false);
      
      // 親コンポーネントに通知
      onMemberAdded();
    } catch (error: any) {
      setError(error.message || 'メンバーの追加に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="ml-2">
          <UserPlus className="mr-2 h-4 w-4" />
          メンバーを追加
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{teamName} にメンバーを追加</DialogTitle>
            <DialogDescription>
              新しいメンバーのメールアドレスと詳細を入力してください。
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="email">メールアドレス *</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="例: user@example.com"
                required
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="hourlyRate">時給（円）</Label>
                <Input
                  id="hourlyRate"
                  type="number"
                  min="0"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="dailyWorkHours">1日の作業時間（時間）</Label>
                <Input
                  id="dailyWorkHours"
                  type="number"
                  min="1"
                  max="24"
                  value={dailyWorkHours}
                  onChange={(e) => setDailyWorkHours(e.target.value)}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="weeklyWorkDays">週の作業日数（日）</Label>
                <Input
                  id="weeklyWorkDays"
                  type="number"
                  min="1"
                  max="7"
                  value={weeklyWorkDays}
                  onChange={(e) => setWeeklyWorkDays(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2 pt-8">
                <Switch
                  id="meetingIncluded"
                  checked={meetingIncluded}
                  onCheckedChange={setMeetingIncluded}
                />
                <Label htmlFor="meetingIncluded">ミーティング時間を含む</Label>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Switch
                id="isAdmin"
                checked={isAdmin}
                onCheckedChange={setIsAdmin}
              />
              <Label htmlFor="isAdmin">管理者権限を付与する</Label>
            </div>
            
            {error && (
              <div className="text-sm text-red-500">
                {error}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              キャンセル
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? '追加中...' : 'メンバーを追加'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
