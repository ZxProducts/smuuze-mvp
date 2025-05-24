-- offers テーブルの既存の SELECT ポリシーを削除
-- ポリシー名が "自分が所属する組織の招待情報参照可能" であると仮定しています。
-- 実際のポリシー名に合わせて適宜修正してください。
DROP POLICY IF EXISTS "自分が所属する組織の招待情報参照可能" ON "public"."offers";

-- offers テーブルに新しい SELECT ポリシーを作成
-- これにより、認証されていないユーザーでも offers テーブルのレコードを読み取れるようになります。
-- アプリケーションロジック (APIルート) でトークンの一致を確認することが前提です。
CREATE POLICY "公開招待トークンによる参照許可" ON "public"."offers"
  FOR SELECT
  USING (true);

-- 既存の INSERT, UPDATE, DELETE ポリシーは変更しません。
-- 必要に応じて、既存のポリシー定義をここに再記述することも可能です。
-- 今回は SELECT ポリシーのみの変更とします。

-- 参考: 変更前の INSERT ポリシー (変更なし)
-- CREATE POLICY "組織メンバーは組織招待作成可能" ON "public"."offers"
--   FOR INSERT WITH CHECK (
--     EXISTS (
--       SELECT 1 FROM public.team_members tm
--       WHERE tm.team_id = offers.team_id
--         AND tm.user_id = auth.uid()
--     )
--   );

-- 参考: 変更前の UPDATE ポリシー (変更なし)
-- CREATE POLICY "組織メンバーは組織招待更新可能" ON "public"."offers"
--   FOR UPDATE USING (
--     EXISTS (
--       SELECT 1 FROM public.team_members tm
--       WHERE tm.team_id = offers.team_id
--         AND tm.user_id = auth.uid()
--     )
--   );

-- 参考: 変更前の DELETE ポリシー (変更なし)
-- CREATE POLICY "組織メンバーは組織招待削除可能" ON "public"."offers"
--   FOR DELETE USING (
--     EXISTS (
--       SELECT 1 FROM public.team_members tm
--       WHERE tm.team_id = offers.team_id
--         AND tm.user_id = auth.uid()
--     )
--   );

-- 重要: offers テーブルで RLS が有効になっていることを確認してください。
-- もし有効になっていない場合は、以下のコマンドを追加してください。
-- ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
-- ただし、既存のマイグレーションで既に有効化されている可能性が高いです。