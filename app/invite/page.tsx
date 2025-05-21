'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function InvitePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const teamId = searchParams.get('teamId');
  
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [offerData, setOfferData] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // セッションとトークン検証
  useEffect(() => {
    if (!token || !teamId) {
      setError('無効な招待リンクです。');
      setLoading(false);
      return;
    }
    
    async function initialize() {
      try {
        // まず認証状態を確認
        const sessionResponse = await fetch('/api/auth/session');
        const sessionData = await sessionResponse.json();
        setIsAuthenticated(sessionData.authenticated);
        
        // トークン検証は認証状態に関わらず実行
        await verifyToken();
        
        // 認証済みの場合は承認ページへリダイレクト
        if (sessionData.authenticated) {
          // この時点でtokenとteamIdは存在することが保証されている
          const safeToken = token as string;
          const safeTeamId = teamId as string;
          router.push(`/invite/accept?token=${encodeURIComponent(safeToken)}&teamId=${safeTeamId}`);
        }
      } catch (error) {
        console.error('初期化エラー:', error);
        // 認証エラーがあってもトークン検証は続行
        try {
          await verifyToken();
        } catch (verifyError) {
          console.error('トークン検証エラー:', verifyError);
          setError(verifyError instanceof Error ? verifyError.message : '招待の検証に失敗しました');
          setLoading(false);
        }
      }
    }
    
    // トークン検証
    async function verifyToken() {
      try {
        // この時点でtokenとteamIdはnullでないことが確認されている
        const safeToken = token as string;
        console.log('トークン検証リクエスト開始:', safeToken.substring(0, 15) + '...');
        const response = await fetch(`/api/offers/verify?token=${encodeURIComponent(safeToken)}`);
        
        if (!response.ok) {
          const data = await response.json();
          console.error('トークン検証エラー:', data.error, 'ステータス:', response.status);
          throw new Error(data.error || '招待の検証に失敗しました');
        }
        
        const responseData = await response.json();
        console.log('トークン検証成功:', responseData.offer?.id || 'Unknown ID');
        
        if (!responseData.offer) {
          throw new Error('招待情報が取得できませんでした');
        }
        
        setOfferData(responseData.offer);
        setEmail(responseData.email);
        setLoading(false);
      } catch (error: any) {
        console.error('招待検証処理エラー:', error);
        setError(error.message || '招待の検証に失敗しました');
        setLoading(false);
        throw error; // 呼び出し元で処理できるように再スロー
      }
    }
    
    initialize();
  }, [token, teamId, router]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password || !fullName) {
      setError('すべての項目を入力してください');
      return;
    }
    
    setVerifying(true);
    
    try {
      // APIを通じてユーザー登録
      // この時点でtokenとteamIdはnullではないことを確認
      if (!token || !teamId) {
        throw new Error('無効な招待リンクです');
      }
      
      const redirectTo = `${window.location.origin}/invite/accept?token=${encodeURIComponent(token)}&teamId=${teamId}`;
      
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          fullName,
          redirectTo
        }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'アカウント作成に失敗しました');
      }
      
      // 招待受け入れ処理を実行
      router.push(`/invite/accept?token=${encodeURIComponent(token)}&teamId=${teamId}`);
    } catch (error: any) {
      setError(error.message || 'アカウント作成に失敗しました');
      setVerifying(false);
    }
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">招待情報を確認中...</span>
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
              <AlertDescription>
                {error}
                {error.includes('見つかりません') && (
                  <p className="mt-2 text-sm">
                    この招待は既に使用されたか、有効期限が切れている可能性があります。
                    新しい招待を依頼してください。
                  </p>
                )}
              </AlertDescription>
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
  
  // ログインリンク用のリダイレクトURLを生成
  const redirectUrl = token && teamId 
    ? `/invite/accept?token=${encodeURIComponent(token)}&teamId=${teamId}`
    : '/invite';
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{offerData?.teams?.name || '組織'}に招待されました</CardTitle>
          <CardDescription>
            {isAuthenticated 
              ? 'リダイレクト中...' 
              : '招待を受け入れるには、アカウントを作成してください'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isAuthenticated && (
            <>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">メールアドレス</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    readOnly
                    disabled
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fullName">氏名</Label>
                  <Input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">パスワード</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                  />
                </div>
                
                <Button type="submit" className="w-full" disabled={verifying}>
                  {verifying ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      アカウント作成中...
                    </>
                  ) : (
                    '招待を受け入れる'
                  )}
                </Button>
              </form>
              
              <div className="mt-4 text-center text-sm">
                <p>
                  すでにアカウントをお持ちですか？{' '}
                  <Link 
                    href={`/login?redirect=${encodeURIComponent(redirectUrl)}`}
                    className="text-primary hover:underline"
                  >
                    ログイン
                  </Link>
                </p>
              </div>
            </>
          )}
          {isAuthenticated && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="ml-2">招待受け入れページにリダイレクト中...</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 