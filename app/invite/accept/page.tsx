'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function AcceptInvitePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const teamId = searchParams.get('teamId');
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [teamName, setTeamName] = useState('');
  
  useEffect(() => {
    async function acceptInvitation() {
      if (!token || !teamId) {
        setError('無効な招待リンクです。');
        setLoading(false);
        return;
      }
      
      try {
        // 認証状態を確認
        const sessionResponse = await fetch('/api/auth/session');
        const sessionData = await sessionResponse.json();
        
        if (!sessionData.authenticated) {
          // ログインしていない場合はログインページにリダイレクト
          router.push(`/auth/login?redirect=/invite/accept?token=${encodeURIComponent(token)}&teamId=${teamId}`);
          return;
        }
        
        console.log('招待受諾処理の開始: token=', token.substring(0, 10) + '...');
        
        // オファー検証APIを呼び出し
        const verifyResponse = await fetch(`/api/offers/verify?token=${encodeURIComponent(token)}`);
        
        const respText = await verifyResponse.text();
        console.log('verifyResponseのステータス:', verifyResponse.status);
        
        let respData;
        try {
          respData = JSON.parse(respText);
          console.log('verifyResponseの内容:', respData.error || '成功');
        } catch (e) {
          console.error('JSONパースエラー:', e, 'レスポンステキスト:', respText);
        }
        
        if (!verifyResponse.ok) {
          throw new Error(respData?.error || '招待の検証に失敗しました');
        }
        
        const { offer, valid } = respData;
        
        console.log('オファー検証結果:', { valid, offerId: offer?.id });
        
        if (!valid || !offer) {
          throw new Error('無効な招待です');
        }
        
        // チーム名を取得
        const teamResponse = await fetch(`/api/teams/info/${teamId}`);
        
        if (teamResponse.ok) {
          const { team } = await teamResponse.json();
          if (team) {
            setTeamName(team.name);
          }
        }
        
        // 招待を承諾するAPIを呼び出し
        const acceptResponse = await fetch(`/api/offers/${token}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (!acceptResponse.ok) {
          const data = await acceptResponse.json();
          throw new Error(data.error || '招待の承諾に失敗しました');
        }
        
        setSuccess(true);
        setLoading(false);
        
        // 5秒後に組織ページにリダイレクト
        setTimeout(() => {
          router.push(`/team/${teamId}`);
        }, 5000);
      } catch (error: any) {
        setError(error.message || '招待の処理中にエラーが発生しました');
        setLoading(false);
      }
    }
    
    acceptInvitation();
  }, [token, teamId, router]);
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">招待を処理中...</span>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>招待エラー</CardTitle>
            <CardDescription>招待の処理中にエラーが発生しました</CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter>
            <Button onClick={() => router.push('/')} className="w-full">
              ホームに戻る
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  if (success) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>招待を承諾しました</CardTitle>
            <CardDescription>
              {teamName}のメンバーになりました
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertDescription>
                組織ページに自動的にリダイレクトします...
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter>
            <Button onClick={() => router.push(`/team/${teamId}`)} className="w-full">
              今すぐ組織ページに移動
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  return null;
} 