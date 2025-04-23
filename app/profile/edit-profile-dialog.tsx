'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: string;
  postal_code?: string;
  prefecture?: string;
  city?: string;
  address1?: string;
  address2?: string;
  bank_name?: string;
  bank_account_number?: string;
  bank_account_type?: string;
  bank_branch_name?: string;
  bank_branch_code?: string;
  invoice_notes?: string;
}

interface EditProfileDialogProps {
  isOpen: boolean;
  onClose: () => void;
  profile: Profile;
  onUpdate: (profile: Profile) => void;
}

export default function EditProfileDialog({ isOpen, onClose, profile, onUpdate }: EditProfileDialogProps) {
  const [formData, setFormData] = useState<Profile>({ ...profile });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setIsSubmitting(true);
      
      const response = await fetch('/api/auth/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          full_name: formData.full_name,
          postal_code: formData.postal_code,
          prefecture: formData.prefecture,
          city: formData.city,
          address1: formData.address1,
          address2: formData.address2,
          bank_name: formData.bank_name,
          bank_account_number: formData.bank_account_number,
          bank_account_type: formData.bank_account_type,
          bank_branch_name: formData.bank_branch_name,
          bank_branch_code: formData.bank_branch_code,
          invoice_notes: formData.invoice_notes,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'プロフィールの更新に失敗しました');
      }
      
      const data = await response.json();
      onUpdate(data.user);
      toast({
        title: '更新完了',
        description: 'プロフィールが正常に更新されました',
      });
    } catch (error: any) {
      toast({
        title: 'エラー',
        description: error.message || 'プロフィールの更新中にエラーが発生しました',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>プロフィールを編集</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="basic">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">基本情報</TabsTrigger>
              <TabsTrigger value="address">請求発行元住所</TabsTrigger>
              <TabsTrigger value="bank">銀行口座</TabsTrigger>
            </TabsList>
            
            <TabsContent value="basic" className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">名前</Label>
                <Input
                  id="full_name"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">メールアドレス</Label>
                <Input
                  id="email"
                  name="email"
                  value={formData.email}
                  disabled
                  readOnly
                />
                <p className="text-xs text-gray-500">メールアドレスは変更できません</p>
              </div>
            </TabsContent>
            
            <TabsContent value="address" className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="postal_code">郵便番号</Label>
                <Input
                  id="postal_code"
                  name="postal_code"
                  value={formData.postal_code || ''}
                  onChange={handleChange}
                  placeholder="例: 123-4567"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="prefecture">都道府県</Label>
                <Input
                  id="prefecture"
                  name="prefecture"
                  value={formData.prefecture || ''}
                  onChange={handleChange}
                  placeholder="例: 東京都"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="city">市区町村</Label>
                <Input
                  id="city"
                  name="city"
                  value={formData.city || ''}
                  onChange={handleChange}
                  placeholder="例: 渋谷区"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="address1">住所1</Label>
                <Input
                  id="address1"
                  name="address1"
                  value={formData.address1 || ''}
                  onChange={handleChange}
                  placeholder="例: 渋谷1-2-3"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="address2">住所2（建物名など）</Label>
                <Input
                  id="address2"
                  name="address2"
                  value={formData.address2 || ''}
                  onChange={handleChange}
                  placeholder="例: 渋谷ビル101"
                />
              </div>
            </TabsContent>
            
            <TabsContent value="bank" className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="bank_name">銀行名</Label>
                <Input
                  id="bank_name"
                  name="bank_name"
                  value={formData.bank_name || ''}
                  onChange={handleChange}
                  placeholder="例: 〇〇銀行"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="bank_branch_name">支店名</Label>
                <Input
                  id="bank_branch_name"
                  name="bank_branch_name"
                  value={formData.bank_branch_name || ''}
                  onChange={handleChange}
                  placeholder="例: 渋谷支店"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="bank_branch_code">支店番号</Label>
                <Input
                  id="bank_branch_code"
                  name="bank_branch_code"
                  value={formData.bank_branch_code || ''}
                  onChange={handleChange}
                  placeholder="例: 123"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="bank_account_type">口座種別</Label>
                <Select
                  name="bank_account_type"
                  value={formData.bank_account_type || ''}
                  onValueChange={(value) => {
                    setFormData((prev) => ({
                      ...prev,
                      bank_account_type: value,
                    }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="口座種別を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="普通">普通</SelectItem>
                    <SelectItem value="当座">当座</SelectItem>
                    <SelectItem value="貯蓄">貯蓄</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="bank_account_number">口座番号</Label>
                <Input
                  id="bank_account_number"
                  name="bank_account_number"
                  value={formData.bank_account_number || ''}
                  onChange={handleChange}
                  placeholder="例: 1234567"
                />
              </div>
              
              <div className="space-y-2 mt-6">
                <Label htmlFor="invoice_notes">請求書備考</Label>
                <textarea
                  id="invoice_notes"
                  name="invoice_notes"
                  value={formData.invoice_notes || ''}
                  onChange={(e) => {
                    setFormData((prev) => ({
                      ...prev,
                      invoice_notes: e.target.value,
                    }));
                  }}
                  placeholder="請求書に表示する備考欄"
                  className="w-full min-h-[100px] p-2 border rounded-md"
                />
                <p className="text-xs text-gray-500">請求書に表示される備考欄です。振込先情報や支払い条件などを記載できます。</p>
              </div>
            </TabsContent>
          </Tabs>
          
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              キャンセル
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? '更新中...' : '保存'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
