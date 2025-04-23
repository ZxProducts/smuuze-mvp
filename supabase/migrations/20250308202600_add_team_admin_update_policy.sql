-- 組織管理者が他のメンバーを更新できるポリシーを追加
DROP POLICY IF EXISTS "組織管理者は他のメンバーを更新可能" ON "public"."team_members";
CREATE POLICY "組織管理者は他のメンバーを更新可能" ON "public"."team_members"
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = team_members.team_id
        AND tm.user_id = auth.uid()
        AND tm.role = 'admin'
    )
  );
