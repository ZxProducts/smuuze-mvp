import React from 'react';
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '../components/ui/provider';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { AuthProvider } from '../contexts/AuthContext';
import { TimeEntryProvider } from '../contexts/TimeEntryContext';
import { AuthGuard } from '../components/AuthGuard';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { PWAPrompt } from '../components/PWAPrompt';

const inter = Inter({ subsets: ['latin'] });

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#2563EB',
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://smuuze.app'),
  title: {
    default: 'Smuuze - タイムトラッキング & プロジェクト管理',
    template: '%s | Smuuze',
  },
  description: 'プロジェクト単位でタスク管理とタイムトラッキングを行い、作業記録に基づいたレポートを生成する業務支援ツール',
  keywords: [
    'タイムトラッキング',
    'プロジェクト管理',
    'タスク管理',
    '業務効率化',
    'チーム管理',
  ],
  authors: [
    {
      name: 'Smuuze Team',
      url: process.env.NEXT_PUBLIC_APP_URL,
    },
  ],
  creator: 'Smuuze Team',
  openGraph: {
    type: 'website',
    locale: 'ja_JP',
    url: process.env.NEXT_PUBLIC_APP_URL,
    title: 'Smuuze - タイムトラッキング & プロジェクト管理',
    description: 'プロジェクト単位でタスク管理とタイムトラッキングを行い、作業記録に基づいたレポートを生成する業務支援ツール',
    siteName: 'Smuuze',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Smuuze - タイムトラッキング & プロジェクト管理',
    description: 'プロジェクト単位でタスク管理とタイムトラッキングを行い、作業記録に基づいたレポートを生成する業務支援ツール',
    creator: '@smuuze_app',
  },
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Smuuze',
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className={inter.className}>
        <ErrorBoundary>
          <Providers>
            <AuthProvider>
              <TimeEntryProvider>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  minHeight: '100vh',
                  background: 'var(--chakra-colors-gray-50)'
                }}>
                  <Header />
                  <main style={{
                    flex: '1 0 auto',
                    display: 'flex',
                    flexDirection: 'column'
                  }}>
                    <AuthGuard>
                      {children}
                    </AuthGuard>
                  </main>
                  <Footer />
                  <PWAPrompt />
                </div>
              </TimeEntryProvider>
            </AuthProvider>
          </Providers>
        </ErrorBoundary>
      </body>
    </html>
  );
}