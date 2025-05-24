-- profilesテーブルに、招待されたユーザー向けの新しいINSERTポリシーを追加します。
-- 既存の「ユーザーは自分のプロフィール作成可能」ポリシー (`auth.uid() = id`) に加えて、
-- 有効な招待 (offersテーブルに該当emailのpendingレコードが存在) があり、
-- かつ、作成しようとしているプロファイルのIDが認証ユーザーのIDと一致する場合にも、
-- プロフィール作成を許可します。

-- まず、既存のポリシーがある場合は削除します。（冪等性を担保するため）
DROP POLICY IF EXISTS "招待されたユーザーはプロフィール作成可能" ON "public"."profiles";
DROP POLICY IF EXISTS "ユーザーは自分のプロフィール作成可能_v2" ON "public"."profiles"; -- 新しい統合ポリシー名

-- 古い "ユーザーは自分のプロフィール作成可能" ポリシーを削除します。
-- この新しいポリシー "ユーザーは自分のプロフィール作成可能_v2" がその役割を引き継ぎます。
DROP POLICY IF EXISTS "ユーザーは自分のプロフィール作成可能" ON "public"."profiles";

-- 既存のポリシーと新しい招待ユーザー向けポリシーを統合した新しいポリシーを作成します。
-- これにより、どちらの条件でもINSERTが可能になります。
CREATE POLICY "ユーザーは自分のプロフィール作成可能_v2" ON "public"."profiles"
  FOR INSERT WITH CHECK (
    (auth.uid() = id) OR
    EXISTS (
      SELECT 1
      FROM public.offers o
      WHERE o.email = email  -- "profiles"テーブルの新しい行のemail列を参照
        AND o.status = 'pending'
        AND id = auth.uid() -- "profiles"テーブルの新しい行のidが認証ユーザーのIDと一致
    )
  );

-- RLSを有効化 (既に有効化されている場合は不要ですが、念のため)
ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY; 