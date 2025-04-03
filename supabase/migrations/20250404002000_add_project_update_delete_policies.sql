-- プロジェクトの更新ポリシー
CREATE POLICY "チーム管理者はプロジェクト更新可能" ON "public"."projects"
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.team_members tm
      WHERE tm.team_id = projects.team_id
        AND tm.user_id = auth.uid()
        AND tm.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.team_members tm
      WHERE tm.team_id = projects.team_id
        AND tm.user_id = auth.uid()
        AND tm.role = 'admin'
    )
  );

-- プロジェクトの削除ポリシー
CREATE POLICY "チーム管理者はプロジェクト削除可能" ON "public"."projects"
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.team_members tm
      WHERE tm.team_id = projects.team_id
        AND tm.user_id = auth.uid()
        AND tm.role = 'admin'
    )
  );
