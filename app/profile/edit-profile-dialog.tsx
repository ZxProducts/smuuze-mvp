'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';

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
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="basic">基本情報</TabsTrigger>
              <TabsTrigger value="address">請求先住所</TabsTrigger>
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
