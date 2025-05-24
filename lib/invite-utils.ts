import { createHash, randomBytes } from 'crypto';

// セキュアなトークンを生成
export function generateInviteToken(): string {
  return randomBytes(32).toString('hex');
}

// トークンにタイムスタンプと署名を付加
export function signInviteToken(token: string, email: string): string {
  const now = Date.now();
  const expiresAt = now + 7 * 24 * 60 * 60 * 1000; // 7日後
  const payload = `${token}:${email}:${expiresAt}`;
  const signature = createHash('sha256')
    .update(payload + (process.env.JWT_SECRET || 'fallback-secret-key'))
    .digest('hex');
    
  return Buffer.from(`${payload}:${signature}`).toString('base64');
}

// 署名付きトークンを検証
export function verifyInviteToken(signedToken: string): { 
  valid: boolean;
  token?: string;
  email?: string;
  expired?: boolean;
  error?: string;
} {
  try {
    console.log('署名付きトークンの検証開始:', signedToken.substring(0, 15) + '...');
    
    // Base64デコードを試みる前に、URLデコードを行う（URLエンコードされている可能性がある）
    let tokenToProcess = signedToken;
    try {
      // URLエンコードされているかもしれないのでデコード
      tokenToProcess = decodeURIComponent(signedToken);
      console.log('URLデコード成功:', tokenToProcess.substring(0, 15) + '...');
    } catch (urlDecodeError) {
      // URLデコードに失敗した場合はそのまま使用
      console.log('URLデコードは必要ありません');
    }
    
    let decoded: string;
    try {
      // Base64デコード
      decoded = Buffer.from(tokenToProcess, 'base64').toString('utf-8');
      console.log('Base64デコード成功:', decoded.substring(0, 20) + '...');
    } catch (error) {
      console.error('Base64デコードエラー:', error);
      return { valid: false, error: 'トークンのデコードに失敗しました' };
    }
    
    const parts = decoded.split(':');
    if (parts.length !== 4) {
      console.error('トークン形式不正 (パート数):', parts.length, 'デコード結果:', decoded);
      return { valid: false, error: '不正なトークン形式です' };
    }
    
    const [token, email, expiresAtStr, signature] = parts;
    
    // パラメータが不足している場合
    if (!token || !email || !expiresAtStr || !signature) {
      console.error('トークン形式不正 (必須パラメータ不足):',
        `token=${!!token}, email=${!!email}, expires=${!!expiresAtStr}, signature=${!!signature}`);
      return { valid: false, error: '不正なトークン形式です' };
    }
    
    // 有効期限チェック
    const expiresAt = parseInt(expiresAtStr);
    if (isNaN(expiresAt)) {
      console.error('有効期限が数値ではありません:', expiresAtStr);
      return { valid: false, error: '不正なトークン形式です (有効期限)' };
    }
    
    const now = Date.now();
    if (now > expiresAt) {
      console.error('トークンの有効期限切れ:', new Date(expiresAt).toISOString(), '現在時刻:', new Date(now).toISOString());
      return { valid: false, token, email, expired: true, error: 'トークンの有効期限が切れています' };
    }
    
    // 署名の検証
    const payload = `${token}:${email}:${expiresAt}`;
    const expectedSignature = createHash('sha256')
      .update(payload + (process.env.JWT_SECRET || 'fallback-secret-key'))
      .digest('hex');
      
    if (signature !== expectedSignature) {
      console.error('署名不一致:', 
        `provided=${signature.substring(0, 10)}...`, 
        `expected=${expectedSignature.substring(0, 10)}...`);
      return { valid: false, error: '不正なトークン署名です' };
    }
    
    console.log('トークン検証成功:',
      `token=${token.substring(0, 10)}...`,
      `email=${email}`,
      `期限=${new Date(expiresAt).toISOString()}`);
    return { valid: true, token, email };
  } catch (error) {
    console.error('トークン検証中の予期せぬエラー:', error);
    return { valid: false, error: '不正なトークン形式です' };
  }
}

// ベースURLを取得（環境に応じて）
export function getBaseUrl(): string {
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }
  
  return 'http://localhost:3000';
}

// 招待リンクを生成
export function generateInviteLink(token: string, email: string, teamId: string): string {
  const signedToken = signInviteToken(token, email);
  const baseUrl = getBaseUrl();
  return `${baseUrl}/invite?token=${encodeURIComponent(signedToken)}&teamId=${teamId}`;
} 