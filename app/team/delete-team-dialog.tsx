'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Trash2 } from 'lucide-react';

interface DeleteTeamDialogProps {
  teamId: string;
  teamName: string;
  onTeamDeleted: () => void;
}

export function DeleteTeamDialog({ teamId, teamName, onTeamDeleted }: DeleteTeamDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleDelete = async () => {
    setIsSubmitting(true);
    setError('');
    
    try {
      const response = await fetch(`/api/teams/${teamId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'チームの削除に失敗しました');
      }
      
      // モーダルを閉じる
      setOpen(false);
      
      // 親コンポーネントに通知
      onTeamDeleted();
    } catch (error: any) {
      setError(error.message || 'チームの削除に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700 hover:bg-red-50">
          <Trash2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>チームを削除</DialogTitle>
          <DialogDescription>
            本当に「{teamName}」を削除しますか？この操作は元に戻せません。
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm text-gray-500">
            チームを削除すると、チームに関連するすべてのデータ（メンバー、プロジェクト、タスクなど）も削除されます。
          </p>
          {error && (
            <div className="mt-2 text-sm text-red-500">
              {error}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            キャンセル
          </Button>
          <Button 
            type="button" 
            variant="destructive" 
            onClick={handleDelete}
            disabled={isSubmitting}
          >
            {isSubmitting ? '削除中...' : 'チームを削除'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
