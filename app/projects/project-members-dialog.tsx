'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Users, Plus, Edit2, Trash2, X, RefreshCw } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

// プロジェクトの型定義
interface Project {
  id: string;
  name: string;
  team_id: string;
}

// プロジェクトメンバーの型定義
interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  hourly_rate: number;
  profiles: {
    id: string;
    full_name: string;
    email: string;
  };
}

// 組織メンバーの型定義
interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  hourly_rate: number;
  profiles: {
    id: string;
    full_name: string;
    email: string;
  };
}

interface ProjectMembersDialogProps {
  project: Project;
  onMembersUpdated?: () => void;
  canEdit: boolean;
}

export function ProjectMembersDialog({ project, onMembersUpdated, canEdit }: ProjectMembersDialogProps) {
  const [open, setOpen] = useState(false);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [availableMembers, setAvailableMembers] = useState<TeamMember[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState<string>('');
  const [hourlyRate, setHourlyRate] = useState<number | ''>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [editingMember, setEditingMember] = useState<ProjectMember | null>(null);
  const [editHourlyRate, setEditHourlyRate] = useState<number | ''>('');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<ProjectMember | null>(null);

  // 変更があったかどうかを追跡するフラグ
  const [hasChanges, setHasChanges] = useState(false);
  // 更新中かどうかを追跡するフラグ
  const [isUpdating, setIsUpdating] = useState(false);
  // UIに表示するメンバーリスト（APIから取得したものとは別に管理）
  const [uiMembers, setUiMembers] = useState<ProjectMember[]>([]);
  // 追加・削除されたメンバーを追跡
  const [pendingAdditions, setPendingAdditions] = useState<{userId: string, hourlyRate: number | undefined}[]>([]);
  const [pendingDeletions, setPendingDeletions] = useState<string[]>([]);
  // 編集されたメンバーを追跡
  const [pendingUpdates, setPendingUpdates] = useState<{id: string, hourlyRate: number}[]>([]);

  // プロジェクトメンバー情報を取得
  const fetchMembers = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/projects/${project.id}/members`);
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'プロジェクトメンバーの取得に失敗しました');
      }
      
      const data = await response.json();
      const fetchedMembers = data.members || [];
      setMembers(fetchedMembers);
      setUiMembers(fetchedMembers);
      setAvailableMembers(data.availableMembers || []);
      setIsAdmin(data.isAdmin || false);
      setHasChanges(false); // 変更フラグをリセット
      
      // 保留中の変更をリセット
      setPendingAdditions([]);
      setPendingDeletions([]);
      setPendingUpdates([]);
    } catch (error: any) {
      setError(error.message || 'プロジェクトメンバーの取得中にエラーが発生しました');
      console.error('プロジェクトメンバー取得エラー:', error);
    } finally {
      setIsLoading(false);
      setIsUpdating(false);
    }
  };

  // ダイアログが開かれたときにメンバー情報を取得
  useEffect(() => {
    if (open) {
      fetchMembers();
    }
  }, [open, project.id]);

  // 変更を適用する処理
  const applyChanges = async () => {
    setIsUpdating(true);
    setSubmitError('');
    
    try {
      // 追加処理
      for (const addition of pendingAdditions) {
        await fetch(`/api/projects/${project.id}/members`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: addition.userId,
            hourlyRate: addition.hourlyRate,
          }),
        });
      }
      
      // 更新処理
      for (const update of pendingUpdates) {
        await fetch(`/api/projects/${project.id}/members/${update.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            hourlyRate: update.hourlyRate,
          }),
        });
      }
      
      // 削除処理
      for (const memberId of pendingDeletions) {
        await fetch(`/api/projects/${project.id}/members/${memberId}`, {
          method: 'DELETE',
        });
      }
      
      // データを再取得
      await fetchMembers();
      
      // 親コンポーネントに通知
      if (onMembersUpdated) {
        onMembersUpdated();
      }
    } catch (error: any) {
      setSubmitError(error.message || '変更の適用に失敗しました');
    } finally {
      setIsUpdating(false);
    }
  };

  // メンバー追加処理
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedMember) {
      setSubmitError('メンバーを選択してください');
      return;
    }
    
    setIsSubmitting(true);
    setSubmitError('');
    
    try {
      // 選択されたメンバーの情報を取得
      const selectedTeamMember = availableMembers.find(m => m.user_id === selectedMember);
      if (!selectedTeamMember) {
        throw new Error('選択されたメンバーが見つかりません');
      }
      
      // 仮のIDを生成（実際のDBに保存されるまでの一時的なID）
      const tempId = `temp-${Date.now()}`;
      
      // UI上のメンバーリストに追加
      const newMember: ProjectMember = {
        id: tempId,
        project_id: project.id,
        user_id: selectedMember,
        hourly_rate: hourlyRate === '' ? selectedTeamMember.hourly_rate : Number(hourlyRate),
        profiles: {
          id: selectedTeamMember.profiles.id,
          full_name: selectedTeamMember.profiles.full_name,
          email: selectedTeamMember.profiles.email
        }
      };
      
      setUiMembers(prev => [...prev, newMember]);
      
      // 保留中の追加リストに追加
      setPendingAdditions(prev => [
        ...prev, 
        { 
          userId: selectedMember, 
          hourlyRate: hourlyRate === '' ? undefined : Number(hourlyRate) 
        }
      ]);
      
      // 利用可能なメンバーリストから削除
      setAvailableMembers(prev => prev.filter(m => m.user_id !== selectedMember));
      
      // フォームをリセット
      setSelectedMember('');
      setHourlyRate('');
      
      // 変更があったことをマーク
      setHasChanges(true);
    } catch (error: any) {
      setSubmitError(error.message || 'メンバーの追加に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  // メンバー更新処理
  const handleUpdateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingMember) return;
    
    if (editHourlyRate === '' || editHourlyRate < 0) {
      setSubmitError('有効な単価を入力してください');
      return;
    }
    
    setIsSubmitting(true);
    setSubmitError('');
    
    try {
      // UI上のメンバーリストを更新
      setUiMembers(prev => prev.map(member => 
        member.id === editingMember.id 
          ? { ...member, hourly_rate: Number(editHourlyRate) } 
          : member
      ));
      
      // 保留中の更新リストに追加
      const existingUpdateIndex = pendingUpdates.findIndex(u => u.id === editingMember.id);
      if (existingUpdateIndex >= 0) {
        // 既に更新リストにある場合は上書き
        setPendingUpdates(prev => {
          const newUpdates = [...prev];
          newUpdates[existingUpdateIndex] = { id: editingMember.id, hourlyRate: Number(editHourlyRate) };
          return newUpdates;
        });
      } else {
        // 新規追加
        setPendingUpdates(prev => [...prev, { id: editingMember.id, hourlyRate: Number(editHourlyRate) }]);
      }
      
      // 編集モードを終了
      setEditingMember(null);
      setEditHourlyRate('');
      
      // 変更があったことをマーク
      setHasChanges(true);
    } catch (error: any) {
      setSubmitError(error.message || 'メンバーの更新に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  // メンバー削除処理
  const handleDeleteMember = async () => {
    if (!memberToDelete) return;
    
    setIsSubmitting(true);
    setSubmitError('');
    
    try {
      // UI上のメンバーリストから削除
      setUiMembers(prev => prev.filter(member => member.id !== memberToDelete.id));
      
      // 保留中の追加リストから削除（まだDBに保存されていない場合）
      if (memberToDelete.id.startsWith('temp-')) {
        setPendingAdditions(prev => prev.filter(addition => addition.userId !== memberToDelete.user_id));
      } else {
        // 保留中の削除リストに追加
        setPendingDeletions(prev => [...prev, memberToDelete.id]);
      }
      
      // 利用可能なメンバーリストに戻す
      const teamMember = availableMembers.find(m => m.user_id === memberToDelete.user_id);
      if (!teamMember) {
        // 組織メンバー情報を取得
        const response = await fetch(`/api/teams/${project.team_id}/members`);
        if (response.ok) {
          const data = await response.json();
          const members = data.members || [];
          const member = members.find((m: any) => m.user_id === memberToDelete.user_id);
          if (member) {
            setAvailableMembers(prev => [...prev, member]);
          }
        }
      } else {
        // 既に利用可能なメンバーリストにある場合は何もしない
      }
      
      // 削除ダイアログを閉じる
      setIsDeleteDialogOpen(false);
      setMemberToDelete(null);
      
      // 変更があったことをマーク
      setHasChanges(true);
    } catch (error: any) {
      setSubmitError(error.message || 'メンバーの削除に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!canEdit) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="ml-2">
          <Users className="mr-2 h-4 w-4" />
          メンバー管理
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>プロジェクトメンバー管理</DialogTitle>
          <DialogDescription>
            プロジェクト「{project.name}」のメンバーを管理します。
          </DialogDescription>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex justify-center p-8">
            <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
          </div>
        ) : error ? (
          <div className="p-4 text-center text-red-500">
            {error}
          </div>
        ) : (
          <div className="py-4">
            <h3 className="text-sm font-medium mb-2">現在のメンバー</h3>
            
            {uiMembers.length === 0 ? (
              <div className="text-sm text-gray-500 mb-4">
                メンバーがいません
              </div>
            ) : (
              <div className="border rounded-md mb-4">
                <div className="grid grid-cols-12 bg-gray-50 p-2 text-xs font-medium">
                  <div className="col-span-5">名前</div>
                  <div className="col-span-4">メールアドレス</div>
                  <div className="col-span-2">単価</div>
                  <div className="col-span-1"></div>
                </div>
                
                {uiMembers.map((member) => (
                  <div key={member.id} className="grid grid-cols-12 p-2 text-sm border-t">
                    {editingMember?.id === member.id ? (
                      // 編集モード
                      <form onSubmit={handleUpdateMember} className="col-span-12 flex items-center">
                        <div className="col-span-5 mr-2">{member.profiles.full_name}</div>
                        <div className="col-span-4 mr-2">{member.profiles.email}</div>
                        <div className="col-span-2 mr-2">
                          <Input
                            type="number"
                            value={editHourlyRate}
                            onChange={(e) => setEditHourlyRate(e.target.value === '' ? '' : Number(e.target.value))}
                            min="0"
                            step="100"
                            className="w-full"
                            placeholder="単価"
                            required
                          />
                        </div>
                        <div className="flex space-x-1">
                          <Button type="submit" size="sm" disabled={isSubmitting}>
                            保存
                          </Button>
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              setEditingMember(null);
                              setEditHourlyRate('');
                              setSubmitError('');
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </form>
                    ) : (
                      // 表示モード
                      <>
                        <div className="col-span-5">{member.profiles.full_name}</div>
                        <div className="col-span-4">{member.profiles.email}</div>
                        <div className="col-span-2">{member.hourly_rate.toLocaleString()}円</div>
                        <div className="col-span-1 text-right">
                          {isAdmin && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <span className="sr-only">メニューを開く</span>
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => {
                                    setEditingMember(member);
                                    setEditHourlyRate(member.hourly_rate);
                                  }}
                                >
                                  <Edit2 className="mr-2 h-4 w-4" />
                                  <span>編集</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setMemberToDelete(member);
                                    setIsDeleteDialogOpen(true);
                                  }}
                                  className="text-red-600"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  <span>削除</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            {isAdmin && availableMembers.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-medium mb-2">メンバーを追加</h3>
                <form onSubmit={handleAddMember} className="space-y-4">
                  <div className="grid grid-cols-12 gap-4">
                    <div className="col-span-5">
                      <Label htmlFor="member" className="text-xs">メンバー</Label>
                      <select
                        id="member"
                        value={selectedMember}
                        onChange={(e) => {
                          setSelectedMember(e.target.value);
                          // 選択されたメンバーの組織での単価をデフォルト値として設定
                          const member = availableMembers.find(m => m.user_id === e.target.value);
                          if (member) {
                            setHourlyRate(member.hourly_rate);
                          }
                        }}
                        className="w-full rounded-md border border-gray-300 p-2 text-sm"
                        required
                      >
                        <option value="">選択してください</option>
                        {availableMembers.map((member) => (
                          <option key={member.user_id} value={member.user_id}>
                            {member.profiles.full_name}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="col-span-4">
                      <Label htmlFor="hourlyRate" className="text-xs">単価（円）</Label>
                      <Input
                        id="hourlyRate"
                        type="number"
                        value={hourlyRate}
                        onChange={(e) => setHourlyRate(e.target.value === '' ? '' : Number(e.target.value))}
                        min="0"
                        step="100"
                        placeholder="組織の単価を使用"
                      />
                    </div>
                    
                    <div className="col-span-3 flex items-end">
                      <Button type="submit" disabled={isSubmitting || !selectedMember} className="w-full">
                        <Plus className="mr-2 h-4 w-4" />
                        追加
                      </Button>
                    </div>
                  </div>
                  
                  {submitError && (
                    <div className="text-sm text-red-500">
                      {submitError}
                    </div>
                  )}
                </form>
              </div>
            )}
          </div>
        )}
        
        <DialogFooter className="flex justify-end">
          <div className="flex space-x-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => {
                // 変更を破棄して閉じる
                setOpen(false);
              }}
            >
              キャンセル
            </Button>
            {hasChanges ? (
              <Button 
                type="button" 
                onClick={applyChanges}
                disabled={isUpdating}
              >
                {isUpdating ? '更新中...' : '変更を適用'}
              </Button>
            ) : (
              <Button 
                type="button" 
                onClick={() => setOpen(false)}
              >
                閉じる
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
      
      {/* メンバー削除確認ダイアログ */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>メンバーを削除</AlertDialogTitle>
            <AlertDialogDescription>
              {memberToDelete && `「${memberToDelete.profiles.full_name}」をプロジェクトから削除しますか？`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {submitError && (
            <div className="text-sm text-red-500 mt-2">
              {submitError}
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel 
              disabled={isSubmitting}
              onClick={() => {
                setMemberToDelete(null);
                setSubmitError('');
              }}
            >
              キャンセル
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteMember}
              disabled={isSubmitting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isSubmitting ? '削除中...' : '削除する'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
