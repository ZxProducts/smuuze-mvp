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

    // トークン検証 (先に定義しておく)
    async function verifyToken() {
      try {
        const safeToken = token!;
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
        
        setOfferData(responseData.offer); // offerData をここでセット
        setEmail(responseData.email); // email をここでセット
        // setLoading(false); // ローディングは initialize の最後で行う
        return responseData; // 検証結果を返す
      } catch (error: any) {
        console.error('招待検証処理エラー:', error);
        // setError(error.message || '招待の検証に失敗しました');
        // setLoading(false);
        throw error; // 呼び出し元でエラー処理とローディング制御を行う
      }
    }
    
    async function initialize() {
      try {
        // 1. トークン検証を先に行う
        const offerVerificationData = await verifyToken(); 
        // offerData と email (招待されたメールアドレス) がセットされる
        // offerVerificationData.offer と offerVerificationData.email が使える

        // 2. 認証状態を確認
        const sessionResponse = await fetch('/api/auth/session');
        const sessionData = await sessionResponse.json();
        const currentUserEmail = sessionData.user?.email; // 現在ログイン中のユーザーのメール
        setIsAuthenticated(sessionData.authenticated);

        if (sessionData.authenticated) {
          // 3. 認証済みの場合の処理
          // ★ 常に登録フォームを表示するため、認証状態に関わらず setIsAuthenticated(false) を設定
          setIsAuthenticated(false);
          // setEmail は verifyToken でセットされているため、ここでは不要
          // ログイン中のメールと招待メールが異なる場合のエラー表示も、
          // 登録フォームでメールアドレスが固定されていればユーザーは気づけるため、
          // ここでは不要かもしれません（必要であれば残します）
          // if (offerVerificationData.offer && offerVerificationData.email !== currentUserEmail) {
          //   console.warn(`ログイン中のユーザー (${currentUserEmail}) と招待メールの宛先 (${offerVerificationData.email}) が異なります。`);
          // }

          // 元のロジック:
          // if (offerVerificationData.offer && offerVerificationData.email === currentUserEmail) {
          //   // ★ 招待メールアドレスとログイン中ユーザーのメールが一致
          //   router.push(`/invite/accept?token=${encodeURIComponent(token!)}&teamId=${teamId!}`);
          // } else if (offerVerificationData.offer) {
          //   // ★ 招待メールアドレスとログイン中ユーザーのメールが不一致
          //   setError(`この招待は ${offerVerificationData.email} 宛ですが、あなたは現在 ${currentUserEmail || '未ログイン'} です。ログアウトして正しいアカウントで再度お試しいただくか、新しいアカウントを作成してください。`);
          //   setIsAuthenticated(false); // 未認証として扱い、登録フォームを表示させる
          //   // setEmail(offerVerificationData.email); // フォームのメールアドレスは招待されたもので初期化
          // } else {
          //    // offerData がない場合は verifyToken でエラーになっているのでここは通らない想定
          // }
        } else {
          // 4. 未認証の場合 - setEmail は verifyToken 内で行われている
          // setIsAuthenticated(false) はデフォルトで問題ない
          // setEmail(offerVerificationData.email); // フォームのメールアドレスは招待されたもので初期化
        }
      } catch (error) {
        console.error('初期化またはトークン検証エラー:', error);
        setError(error instanceof Error ? error.message : '招待の処理中にエラーが発生しました');
      } finally {
        setLoading(false); // 全ての処理の最後にローディングを終了
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
      if (!token || !teamId) {
        throw new Error('無効な招待リンクです');
      }
      
      // 招待受諾ページのURLを作成
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
      
      // 成功メッセージを表示
      setError('');
      setVerifying(false);
      
      // 成功ページまたはメッセージを表示
      alert('確認メールを送信しました。メール内のリンクをクリックして登録を完了してください。');
      
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