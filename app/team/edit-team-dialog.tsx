'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Edit } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface Team {
  id: string;
  name: string;
  description?: string;
  postal_code?: string;
  prefecture?: string;
  city?: string;
  address1?: string;
  address2?: string;
}

interface EditTeamDialogProps {
  team: Team;
  onTeamUpdated: () => void;
}

export function EditTeamDialog({ team, onTeamUpdated }: EditTeamDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(team.name);
  const [description, setDescription] = useState(team.description || '');
  const [postalCode, setPostalCode] = useState(team.postal_code || '');
  const [prefecture, setPrefecture] = useState(team.prefecture || '');
  const [city, setCity] = useState(team.city || '');
  const [address1, setAddress1] = useState(team.address1 || '');
  const [address2, setAddress2] = useState(team.address2 || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError('組織名は必須です');
      return;
    }
    
    setIsSubmitting(true);
    setError('');
    
    try {
      const response = await fetch(`/api/teams/${team.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          description: description || null,
          postal_code: postalCode || null,
          prefecture: prefecture || null,
          city: city || null,
          address1: address1 || null,
          address2: address2 || null,
        }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '組織の更新に失敗しました');
      }
      
      // モーダルを閉じる
      setOpen(false);
      
      // 親コンポーネントに通知
      onTeamUpdated();
    } catch (error: any) {
      setError(error.message || '組織の更新に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost">
          <Edit className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>組織を編集</DialogTitle>
            <DialogDescription>
              組織の詳細を更新してください。
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">組織名 *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例: 開発組織"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">説明</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="組織の説明（任意）"
                rows={3}
              />
            </div>
            
            <Separator className="my-2" />
            
            <div className="grid gap-2">
              <h3 className="text-sm font-medium">請求先住所</h3>
              
              <div className="grid gap-2">
                <Label htmlFor="postalCode">郵便番号</Label>
                <Input
                  id="postalCode"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  placeholder="例: 123-4567"
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="prefecture">都道府県</Label>
                <Input
                  id="prefecture"
                  value={prefecture}
                  onChange={(e) => setPrefecture(e.target.value)}
                  placeholder="例: 東京都"
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="city">市区町村</Label>
                <Input
                  id="city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="例: 渋谷区"
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="address1">住所1</Label>
                <Input
                  id="address1"
                  value={address1}
                  onChange={(e) => setAddress1(e.target.value)}
                  placeholder="例: 渋谷1-2-3"
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="address2">住所2</Label>
                <Input
                  id="address2"
                  value={address2}
                  onChange={(e) => setAddress2(e.target.value)}
                  placeholder="例: 渋谷ビル101"
                />
              </div>
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
              {isSubmitting ? '更新中...' : '更新する'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
