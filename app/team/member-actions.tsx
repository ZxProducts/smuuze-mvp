'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { MoreHorizontal, UserMinus, Shield, ShieldOff, Settings, Receipt, Loader2 } from 'lucide-react';
import { EditMemberDialog } from './edit-member-dialog';
import { ExportInvoiceDialog } from './export-invoice-dialog';
import { format } from 'date-fns';
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

interface MemberActionsProps {
  member: TeamMember;
  teamId: string;
  isCurrentUserAdmin: boolean;
  onMemberUpdated: () => void;
}

export function MemberActions({ member, teamId, isCurrentUserAdmin, onMemberUpdated }: MemberActionsProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isLoadingExportInvoice, setIsLoadingExportInvoice] = useState(false);
  const [dateRange, setDateRange] = useState<{
    from: Date;
    to: Date;
  }>({
    from: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1),
    to: new Date(new Date().getFullYear(), new Date().getMonth(), 0)
  });
  const [currentUser, setCurrentUser] = useState<{
    address1: string;
    address2: string;
    city: string;
    created_at: string;
    email: string;
    full_name: string;
    id: string;
    postal_code: string;
    prefecture: string;
    role: string;
    updated_at: string;
  } | null>(null);

  // 現在のユーザーIDを取得
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const response = await fetch('/api/auth/me');
        
        if (response.ok) {
          const data = await response.json();
          if (data.user) {
            console.log('現在のユーザーID:', data.user);
            setCurrentUser(data.user);
          } else {
            console.error('ユーザー情報が取得できませんでした');
          }
        } else {
          console.error('ユーザー情報の取得に失敗しました:', response.status);
        }
      } catch (error) {
        console.error('ユーザー情報の取得に失敗しました:', error);
      }
    };
    
    getCurrentUser();
  }, []);

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

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects');
      if (response.ok) {
        const data = await response.json();
        return data.projects || [];
      }
    } catch (error) {
      console.error('プロジェクトの取得に失敗しました', error);
    }
  };
  
  const fetchTasks = async () => {
    try {
      const response = await fetch('/api/tasks');
      if (response.ok) {
        const data = await response.json();
        return data.tasks || [];
      }
    } catch (error) {
      console.error('タスクの取得に失敗しました', error);
    }
  };

  const handleExportInvoice = async (memberId: string) => {
    setIsLoadingExportInvoice(true);

    const projects: {
      created_at: string;
      created_by: string;
      description: string | null;
      end_date: string | null;
      id: string;
      name: string;
      start_date: string;
      team_id: string;
      updated_at: string;
    }[] = await fetchProjects();

    const tasks: {
      created_at: string;
      description: string;
      due_date: string | null;
      id: string;
      project_id: string;
      projects: {
        id: string;
        name: string;
      };
      task_assignees: {
        id: string;
        user_id: string;
      }[];
      team_id: string;
      title: string;
      updated_at: string;
    }[] = await fetchTasks();

    // チーム内のプロジェクトを取得
    const projectIds = projects.filter((project) => project.team_id === teamId).map((project) => project.id);
    // チームのタスクを取得（チーム内のプロジェクトのタスクを取得）
    const filteredProjectTasks = tasks.filter((task) => projectIds.includes(task.project_id));
    const taskIds = filteredProjectTasks.filter((task) => task.task_assignees.some((assignee) => assignee.user_id === memberId)).map((task) => task.id);

    const params = new URLSearchParams();
    params.append('startDate', dateRange.from.toISOString());
    params.append('endDate', dateRange.to.toISOString());
    params.append('teamIds', `${teamId}`);
    params.append('projectIds', projectIds.join(','));
    params.append('taskIds', taskIds.join(','));
    params.append('userIds', `${memberId}`);

    const response = await fetch(`/api/reports?${params.toString()}`);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('API Error:', response.status, errorData);
      throw new Error(errorData.error || 'レポートデータの取得に失敗しました');
    }
    const reportData = await response.json();

    const teamData = await fetch(`/api/teams/${teamId}`);
    if (!teamData.ok) {
      const errorData = await teamData.json().catch(() => ({}));
      console.error('API Error:', teamData.status, errorData);
      throw new Error(errorData.error || 'チームデータの取得に失敗しました');
    }
    const teamJson = await teamData.json();

    const billingInfo = {
      companyName: teamJson.team.name,
      address: `${teamJson.team.prefecture} ${teamJson.team.city} ${teamJson.team.address1} ${teamJson.team.address2}`,
      postalCode: teamJson.team.postal_code,
    };

    const paymentInfo = {
      companyName: currentUser?.full_name,
      address: `${currentUser?.prefecture} ${currentUser?.city} ${currentUser?.address1} ${currentUser?.address2}`,
      postalCode: currentUser?.postal_code,
      email: currentUser?.email,
    };

    const fileName = `【請求書】${member.profiles.full_name}：${format(dateRange.from, 'yyyy/MM/dd')}-${format(dateRange.to, 'yyyy/MM/dd')}`;
    await fetch('/api/export/invoice/', {
      method: 'POST',
      body: JSON.stringify({
        // レポートデータ
        reportData: reportData,
        // 請求日
        from: dateRange.from,
        to: dateRange.to,
        // 時給
        hourlyRate: member.hourly_rate,
        // 請求先情報
        billingInfo: billingInfo,
        // 支払い先情報
        paymentInfo: paymentInfo,
      }),
    }).then((response) => {
      response.blob().then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        document.body.appendChild(a);
        a.download = `${fileName}.pdf`;
        a.href = url;
        a.click();
        a.remove();
      });
    }).catch((error) => {
      console.error(error);
    });


    setIsLoadingExportInvoice(false);
    setIsInvoiceDialogOpen(false);
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
            {
              isLoadingExportInvoice
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <MoreHorizontal className="h-4 w-4" />
            }
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
          
          <DropdownMenuItem 
            onClick={() => setIsEditDialogOpen(true)}
            className="text-gray-600"
          >
            <Settings className="mr-2 h-4 w-4" />
            <span>メンバー情報を編集</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => setIsInvoiceDialogOpen(true)}
            className="text-gray-600"
          >
            <Receipt className="mr-2 h-4 w-4" />
            <span>請求書を発行</span>
          </DropdownMenuItem>
          
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

      {/* メンバー情報編集ダイアログ */}
      <EditMemberDialog 
        member={member} 
        teamId={teamId} 
        onMemberUpdated={onMemberUpdated}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
      />

      {/* 請求書発行ダイアログ */}
      <ExportInvoiceDialog
        open={isInvoiceDialogOpen}
        onOpenChange={setIsInvoiceDialogOpen}
        isLoadingExportInvoice={isLoadingExportInvoice}
        dateRange={dateRange}
        setDateRange={setDateRange}
        onExportInvoice={() => handleExportInvoice(member.user_id)}
      />
    </>
  );
}
