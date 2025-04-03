-- プロジェクトメンバーテーブルの作成
CREATE TABLE IF NOT EXISTS "public"."project_members" (
    "id" uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    "project_id" uuid NOT NULL,
    "user_id" uuid NOT NULL,
    "hourly_rate" numeric NOT NULL,
    "created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT "project_members_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "project_members_project_id_user_id_key" UNIQUE ("project_id", "user_id"),
    CONSTRAINT "project_members_hourly_rate_check" CHECK (("hourly_rate" >= 0::numeric))
);
ALTER TABLE "public"."project_members" OWNER TO "postgres";
COMMENT ON TABLE "public"."project_members" IS 'プロジェクトメンバー情報（RLSで制御）';

-- インデックスの作成
CREATE INDEX "project_members_project_id_idx" ON "public"."project_members" USING "btree" ("project_id");
CREATE INDEX "project_members_user_id_idx" ON "public"."project_members" USING "btree" ("user_id");

-- 外部キー制約の追加
ALTER TABLE ONLY "public"."project_members" ADD CONSTRAINT "project_members_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."project_members" ADD CONSTRAINT "project_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;

-- 行レベルセキュリティの有効化
ALTER TABLE "public"."project_members" ENABLE ROW LEVEL SECURITY;

-- プロジェクトメンバーのRLSポリシー
CREATE POLICY "チームメンバーはプロジェクトメンバー参照可能" ON "public"."project_members"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.projects p
      JOIN public.team_members tm ON p.team_id = tm.team_id
      WHERE p.id = project_members.project_id
        AND tm.user_id = auth.uid()
    )
  );

CREATE POLICY "チーム管理者はプロジェクトメンバー追加可能" ON "public"."project_members"
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.projects p
      JOIN public.team_members tm ON p.team_id = tm.team_id
      WHERE p.id = project_members.project_id
        AND tm.user_id = auth.uid()
        AND tm.role = 'admin'
    )
  );

CREATE POLICY "チーム管理者はプロジェクトメンバー更新可能" ON "public"."project_members"
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.projects p
      JOIN public.team_members tm ON p.team_id = tm.team_id
      WHERE p.id = project_members.project_id
        AND tm.user_id = auth.uid()
        AND tm.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.projects p
      JOIN public.team_members tm ON p.team_id = tm.team_id
      WHERE p.id = project_members.project_id
        AND tm.user_id = auth.uid()
        AND tm.role = 'admin'
    )
  );

CREATE POLICY "チーム管理者はプロジェクトメンバー削除可能" ON "public"."project_members"
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.projects p
      JOIN public.team_members tm ON p.team_id = tm.team_id
      WHERE p.id = project_members.project_id
        AND tm.user_id = auth.uid()
        AND tm.role = 'admin'
    )
  );

-- テーブルの権限付与
GRANT ALL ON TABLE "public"."project_members" TO "anon";
GRANT ALL ON TABLE "public"."project_members" TO "authenticated";
GRANT ALL ON TABLE "public"."project_members" TO "service_role";

-- Publication に追加
ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."project_members";
