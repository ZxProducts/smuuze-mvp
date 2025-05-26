import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // プロダクション環境でこのエンドポイントを無効にする
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  const envCheck = {
    NODE_ENV: process.env.NODE_ENV,
    SENDGRID_API_KEY: !!process.env.SENDGRID_API_KEY ? 'SET' : 'NOT_SET',
    SENDGRID_FROM_EMAIL: process.env.SENDGRID_FROM_EMAIL || 'NOT_SET',
    APP_NAME: process.env.APP_NAME || 'NOT_SET',
    NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL || 'NOT_SET',
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || 'NOT_SET',
    // APIキーの最初の数文字だけを表示（セキュリティのため）
    SENDGRID_API_KEY_PREFIX: process.env.SENDGRID_API_KEY ? process.env.SENDGRID_API_KEY.substring(0, 10) + '...' : 'NOT_SET'
  };

  return NextResponse.json({
    message: 'Environment variables check',
    env: envCheck,
    timestamp: new Date().toISOString()
  });
} 