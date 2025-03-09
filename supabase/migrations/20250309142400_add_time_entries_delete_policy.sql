-- タイムエントリー削除ポリシーの追加
DROP POLICY IF EXISTS "ユーザーは自身のタイムエントリー削除可能" ON "public"."time_entries";
CREATE POLICY "ユーザーは自身のタイムエントリー削除可能" ON "public"."time_entries"
  FOR DELETE USING (auth.uid() = user_id);
