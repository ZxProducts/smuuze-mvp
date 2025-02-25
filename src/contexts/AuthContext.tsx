'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { supabase } from '@/lib/supabase/supabase';
import { AuthUser } from '@/types/api';

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 認証が不要なパス
const PUBLIC_PATHS = ['/', '/auth/signin', '/auth/signup', '/auth/verify', '/auth/forgot-password'];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // プロフィール情報の取得
  const fetchProfile = async (sessionUser: AuthUser) => {
    try {
      const response = await apiClient.users.me();
      if (response.error) {
        console.error('プロフィール取得エラー:', response.error);
        return sessionUser;
      }
      return {
        ...sessionUser,
        ...response.data
      };
    } catch (error) {
      console.error('プロフィール取得中のエラー:', error);
      return sessionUser;
    }
  };

  // 認証状態に基づいてリダイレクト
  const handleAuthRedirect = (currentUser: AuthUser | null) => {
    // ミドルウェアがリダイレクトを処理するため、ここではリダイレクトを行わない
    return;
  };

  useEffect(() => {
    let mounted = true;

    // セッションの初期化
    const initSession = async () => {
      try {
        setLoading(true);
        const { data: { user: authUser }, error } = await supabase.auth.getUser();
        
        if (error) {
          console.error('ユーザー取得エラー:', error);
          if (mounted) {
            setUser(null);
          }
          return;
        }

        if (authUser) {
          const initialUser: AuthUser = {
            id: authUser.id,
            email: authUser.email!,
          };
          const userWithProfile = await fetchProfile(initialUser);
          if (mounted) {
            setUser(userWithProfile);
          }
        } else if (mounted) {
          setUser(null);
        }
      } catch (error) {
        console.error('セッション初期化中にエラーが発生:', error);
        if (mounted) {
          setUser(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initSession();

    // 認証状態の変更を監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        try {
          setLoading(true);
          
          if (event === 'SIGNED_OUT' || !session) {
            setUser(null);
            return;
          }

          if (session?.user) {
            const initialUser: AuthUser = {
              id: session.user.id,
              email: session.user.email!,
            };
            const userWithProfile = await fetchProfile(initialUser);
            setUser(userWithProfile);
          }
        } catch (error) {
          console.error('認証状態変更時のエラー:', error);
          setUser(null);
        } finally {
          if (mounted) {
            setLoading(false);
          }
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      const response = await fetch('/api/auth/signout', {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'サインアウトに失敗しました。');
      }

      await supabase.auth.signOut();
      setUser(null);
      router.push('/');
    } catch (error) {
      console.error('サインアウトエラー:', error);
      throw error;
    }
  };

  const value = {
    user,
    loading,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}