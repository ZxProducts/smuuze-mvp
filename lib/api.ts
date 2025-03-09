import { cookies } from 'next/headers';

/**
 * サーバーコンポーネントからAPIを呼び出すための共通関数
 * @param path APIのパス（例: '/api/projects'）
 * @param options fetchのオプション
 * @returns レスポンスデータ
 */
export async function fetchApi<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  try {
    // Cookieを明示的に設定
    const cookieStore = cookies();
    const cookieHeader = cookieStore.getAll()
      .map(cookie => `${cookie.name}=${cookie.value}`)
      .join('; ');
    
    // ベースURLを設定（環境変数から取得するか、空文字列を使用）
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
    
    // リクエストヘッダーを設定
    const headers = new Headers(options.headers);
    headers.set('Content-Type', 'application/json');
    headers.set('Cookie', cookieHeader);
    
    // リクエストを実行
    const response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers,
      cache: 'no-store', // デフォルトでキャッシュを無効化
    });
    
    // レスポンスが成功しなかった場合はエラーをスロー
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'APIリクエストに失敗しました' }));
      throw new Error(errorData.error || errorData.message || `APIリクエストに失敗しました: ${response.status}`);
    }
    
    // レスポンスデータを返す
    return await response.json() as T;
  } catch (error: any) {
    console.error(`APIリクエストエラー (${path}):`, error.message);
    throw error;
  }
}

/**
 * GETリクエストを送信する
 * @param path APIのパス
 * @param options fetchのオプション
 * @returns レスポンスデータ
 */
export async function get<T>(path: string, options: RequestInit = {}): Promise<T> {
  return fetchApi<T>(path, {
    ...options,
    method: 'GET',
  });
}

/**
 * POSTリクエストを送信する
 * @param path APIのパス
 * @param data リクエストボディ
 * @param options fetchのオプション
 * @returns レスポンスデータ
 */
export async function post<T>(
  path: string,
  data: any,
  options: RequestInit = {}
): Promise<T> {
  return fetchApi<T>(path, {
    ...options,
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * PUTリクエストを送信する
 * @param path APIのパス
 * @param data リクエストボディ
 * @param options fetchのオプション
 * @returns レスポンスデータ
 */
export async function put<T>(
  path: string,
  data: any,
  options: RequestInit = {}
): Promise<T> {
  return fetchApi<T>(path, {
    ...options,
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * DELETEリクエストを送信する
 * @param path APIのパス
 * @param options fetchのオプション
 * @returns レスポンスデータ
 */
export async function del<T>(path: string, options: RequestInit = {}): Promise<T> {
  return fetchApi<T>(path, {
    ...options,
    method: 'DELETE',
  });
}
