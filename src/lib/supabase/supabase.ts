'use client';

import { createBrowserClient } from '@supabase/ssr';
import { Database } from '@/types/database.types';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  console.error('警告: NEXT_PUBLIC_SUPABASE_URLが設定されていません');
}
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.error('警告: NEXT_PUBLIC_SUPABASE_ANON_KEYが設定されていません');
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// クライアントサイド用のSupabaseクライアント（SSR対応）
export const supabase = createBrowserClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
  {
    cookies: {
      get(name: string) {
        if (typeof document === 'undefined') return null;
        const cookie = document.cookie
          .split('; ')
          .find(row => row.startsWith(`${name}=`))
          ?.split('=')[1];
        return cookie || null;
      },
      set(name: string, value: string, options: any) {
        if (typeof document === 'undefined') return;
        let cookie = `${name}=${value}`;
        if (options.maxAge) {
          cookie += `; Max-Age=${options.maxAge}`;
        }
        if (options.path) {
          cookie += `; Path=${options.path}`;
        }
        if (options.sameSite) {
          cookie += `; SameSite=${options.sameSite}`;
        }
        if (options.secure || process.env.NODE_ENV === 'production') {
          cookie += `; Secure`;
        }
        document.cookie = cookie;
      },
      remove(name: string, options: any) {
        if (typeof document === 'undefined') return;
        document.cookie = `${name}=; Path=${options.path || '/'}; Max-Age=0`;
      },
    },
  }
);