'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { MoreHorizontal, UserMinus, Shield, ShieldOff } from 'lucide-react';

interface TeamMember {
  id: string;
  user_id: string;
  team_id: string;
  role: string;
  profiles: {
    full_name: string;
    email: string;
  };
}

interface MemberActionsProps {
  member: TeamMember;
  teamId: string;
  isCurrentUserAdmin: boolean;
  onMemberUpdated: () => void;
}

export function MemberActions({ member, teamId, isCurrentUserAdmin, onMemberUpdated }: MemberActionsProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleRemoveMember = async () => {
    setIsSubmitting(true);
    setError('');
    
    try {
      const response = await fetch(`/api/teams/${teamId}/members/${member.id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'メンバーの削除に失敗しました');
      }
      
      // ダイアログを閉じる
      setIsDeleteDialogOpen(false);
      
      // 親コンポーネントに通知
      onMemberUpdated();
    } catch (error: any) {
      setError(error.message || 'メンバーの削除に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRoleChange = async (newRole: 'admin' | 'member') => {
    setIsSubmitting(true);
    setError('');
    
    try {
      const response = await fetch(`/api/teams/${teamId}/members/${member.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role: newRole,
        }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '役割の変更に失敗しました');
      }
      
      // ダイアログを閉じる
      setIsRoleDialogOpen(false);
      
      // 親コンポーネントに通知
      onMemberUpdated();
    } catch (error: any) {
      setError(error.message || '役割の変更に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 管理者でない場合は何も表示しない
  if (!isCurrentUserAdmin) {
    return null;
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {member.role === 'admin' ? (
            <DropdownMenuItem 
              onClick={() => setIsRoleDialogOpen(true)}
              className="text-amber-600"
            >
              <ShieldOff className="mr-2 h-4 w-4" />
              <span>管理者権限を削除</span>
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem 
              onClick={() => setIsRoleDialogOpen(true)}
              className="text-blue-600"
            >
              <Shield className="mr-2 h-4 w-4" />
              <span>管理者に昇格</span>
            </DropdownMenuItem>
          )}
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem 
            onClick={() => setIsDeleteDialogOpen(true)}
            className="text-red-600"
          >
            <UserMinus className="mr-2 h-4 w-4" />
            <span>メンバーを削除</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* メンバー削除確認ダイアログ */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>メンバーを削除</AlertDialogTitle>
            <AlertDialogDescription>
              本当に「{member.profiles.full_name}」をチームから削除しますか？
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error && (
            <div className="text-sm text-red-500 mt-2">
              {error}
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveMember}
              disabled={isSubmitting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isSubmitting ? '削除中...' : '削除する'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 役割変更確認ダイアログ */}
      <AlertDialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {member.role === 'admin' ? '管理者権限を削除' : '管理者に昇格'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {member.role === 'admin' 
                ? `「${member.profiles.full_name}」の管理者権限を削除しますか？`
                : `「${member.profiles.full_name}」を管理者に昇格させますか？`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error && (
            <div className="text-sm text-red-500 mt-2">
              {error}
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleRoleChange(member.role === 'admin' ? 'member' : 'admin')}
              disabled={isSubmitting}
              className={member.role === 'admin' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-blue-600 hover:bg-blue-700'}
            >
              {isSubmitting ? '更新中...' : '変更する'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
