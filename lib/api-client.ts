/**
 * クライアントコンポーネントからAPIを呼び出すための共通関数
 * @param path APIのパス（例: '/api/projects'）
 * @param options fetchのオプション
 * @returns レスポンスデータ
 */
export async function fetchApi<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  try {
    // ベースURLを設定（環境変数から取得するか、空文字列を使用）
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
    
    // リクエストヘッダーを設定
    const headers = new Headers(options.headers);
    headers.set('Content-Type', 'application/json');
    
    // Storage Access APIを使用してクロスサイトCookieへのアクセスを要求
    try {
      // Chrome 134以降ではStorage Access APIが必要
      if (typeof document !== 'undefined' && document.requestStorageAccess) {
        try {
          // ストレージアクセスが既に許可されているか確認
          const hasAccess = await document.hasStorageAccess();
          if (!hasAccess) {
            // ストレージアクセスを要求
            await document.requestStorageAccess();
            console.log('Storage Access granted');
          }
        } catch (storageError) {
          console.warn('Storage Access API error:', storageError);
          // エラーが発生しても処理を続行
        }
      }
    } catch (e) {
      // Storage Access APIが利用できない場合は無視
      console.warn('Storage Access API not available');
    }
    
    // リクエストを実行（credentialsを含める）
    const response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers,
      credentials: 'include', // Cookieを含める
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
