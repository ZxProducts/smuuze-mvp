'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

interface TeamMember {
  id: string;
  user_id: string;
  team_id: string;
  role: string;
  hourly_rate?: number;
  daily_work_hours?: number;
  weekly_work_days?: number;
  meeting_included?: boolean;
  notes?: string;
  profiles: {
    full_name: string;
    email: string;
  };
}

interface EditMemberDialogProps {
  member: TeamMember;
  teamId: string;
  onMemberUpdated: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditMemberDialog({ member, teamId, onMemberUpdated, open, onOpenChange }: EditMemberDialogProps) {
  const [hourlyRate, setHourlyRate] = useState(member.hourly_rate?.toString() || '0');
  const [dailyWorkHours, setDailyWorkHours] = useState(member.daily_work_hours?.toString() || '8');
  const [weeklyWorkDays, setWeeklyWorkDays] = useState(member.weekly_work_days?.toString() || '5');
  const [meetingIncluded, setMeetingIncluded] = useState(member.meeting_included !== false);
  const [notes, setNotes] = useState(member.notes || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // メンバー情報が変更された場合に状態を更新
  useEffect(() => {
    setHourlyRate(member.hourly_rate?.toString() || '0');
    setDailyWorkHours(member.daily_work_hours?.toString() || '8');
    setWeeklyWorkDays(member.weekly_work_days?.toString() || '5');
    setMeetingIncluded(member.meeting_included !== false);
    setNotes(member.notes || '');
  }, [member]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsSubmitting(true);
    setError('');
    
    try {
      const response = await fetch(`/api/teams/${teamId}/members/${member.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          hourlyRate: parseFloat(hourlyRate) || 0,
          dailyWorkHours: parseInt(dailyWorkHours) || 8,
          weeklyWorkDays: parseInt(weeklyWorkDays) || 5,
          meetingIncluded,
          notes: notes || null,
        }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'メンバー情報の更新に失敗しました');
      }
      
      // モーダルを閉じる
      onOpenChange(false);
      
      // 親コンポーネントに通知
      onMemberUpdated();
    } catch (error: any) {
      setError(error.message || 'メンバー情報の更新に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{member.profiles.full_name} の情報を編集</DialogTitle>
            <DialogDescription>
              メンバーの詳細情報を更新してください。
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
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
            
            <div className="grid gap-2">
              <Label htmlFor="notes">メモ</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="メンバーに関するメモ（任意）"
                rows={3}
              />
            </div>
            
            {error && (
              <div className="text-sm text-red-500">
                {error}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              キャンセル
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? '更新中...' : '更新する'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
