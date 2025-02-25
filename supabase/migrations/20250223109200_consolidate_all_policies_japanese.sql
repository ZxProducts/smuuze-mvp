-- 各種タイムアウト等の設定
SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

-- 拡張機能の作成
CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgsodium" WITH SCHEMA "pgsodium";
COMMENT ON SCHEMA "public" IS 'standard public schema';
CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";

SET default_tablespace = '';
SET default_table_access_method = "heap";

-- テーブル作成
CREATE TABLE IF NOT EXISTS "public"."offers" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "team_id" uuid NOT NULL,
    "email" text NOT NULL,
    "hourly_rate" numeric NOT NULL,
    "daily_work_hours" numeric DEFAULT 8 NOT NULL,
    "weekly_work_days" numeric DEFAULT 5 NOT NULL,
    "meeting_included" boolean DEFAULT true NOT NULL,
    "notes" text,
    "status" text DEFAULT 'pending'::text NOT NULL,
    "token" text NOT NULL,
    "created_by" uuid NOT NULL,
    "created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT "offers_status_check" CHECK (("status" = ANY (ARRAY['pending'::text, 'accepted'::text, 'rejected'::text])))
);
ALTER TABLE "public"."offers" OWNER TO "postgres";
COMMENT ON TABLE "public"."offers" IS 'チーム招待情報（RLSで制御）';

CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" uuid NOT NULL,
    "full_name" text NOT NULL,
    "role" text NOT NULL,
    "created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    "email" text NOT NULL,
    CONSTRAINT "profiles_role_check" CHECK (("role" = ANY (ARRAY['admin'::text, 'member'::text])))
);
ALTER TABLE "public"."profiles" OWNER TO "postgres";
COMMENT ON TABLE "public"."profiles" IS 'ユーザープロフィール（RLSで制御）';

CREATE TABLE IF NOT EXISTS "public"."projects" (
    "id" uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    "team_id" uuid NOT NULL,
    "name" text NOT NULL,
    "description" text,
    "start_date" date NOT NULL,
    "end_date" date,
    "created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    "created_by" uuid NOT NULL,
    CONSTRAINT "projects_check" CHECK ((("end_date" IS NULL) OR ("end_date" >= "start_date")))
);
ALTER TABLE "public"."projects" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."reports" (
    "id" uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    "team_id" uuid NOT NULL,
    "project_id" uuid,
    "period" text NOT NULL,
    "report_data" jsonb NOT NULL,
    "status" text DEFAULT 'draft'::text NOT NULL,
    "created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT "reports_status_check" CHECK (("status" = ANY (ARRAY['draft'::text, 'finalized'::text])))
);
ALTER TABLE "public"."reports" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."task_assignees" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "task_id" uuid,
    "user_id" uuid,
    "assigned_at" timestamp with time zone DEFAULT now(),
    "created_at" timestamp with time zone DEFAULT now(),
    "updated_at" timestamp with time zone DEFAULT now()
);
ALTER TABLE "public"."task_assignees" OWNER TO "postgres";
COMMENT ON TABLE "public"."task_assignees" IS 'タスクのアサイン情報（バリデーションはアプリケーション層で実装）';

CREATE TABLE IF NOT EXISTS "public"."task_comments" (
    "id" uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    "task_id" uuid NOT NULL,
    "author_id" uuid NOT NULL,
    "comment" text NOT NULL,
    "created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE "public"."task_comments" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."task_history" (
    "id" uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    "task_id" uuid NOT NULL,
    "changed_by" uuid NOT NULL,
    "change_type" text NOT NULL,
    "old_value" jsonb,
    "new_value" jsonb,
    "change_reason" text,
    "changed_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT "task_history_change_type_check" CHECK (("change_type" = ANY (ARRAY['assignment_change'::text, 'update'::text])))
);
ALTER TABLE "public"."task_history" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."tasks" (
    "id" uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    "project_id" uuid NOT NULL,
    "team_id" uuid NOT NULL,
    "title" text NOT NULL,
    "description" text,
    "due_date" date,
    "created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE "public"."tasks" OWNER TO "postgres";

CREATE TABLE IF NOT EXISTS "public"."team_members" (
    "id" uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    "team_id" uuid NOT NULL,
    "user_id" uuid NOT NULL,
    "hourly_rate" numeric NOT NULL,
    "daily_work_hours" numeric NOT NULL,
    "weekly_work_days" numeric NOT NULL,
    "meeting_included" boolean DEFAULT false NOT NULL,
    "notes" text,
    "joined_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    "role" text DEFAULT 'member'::text NOT NULL,
    CONSTRAINT "team_members_daily_work_hours_check" CHECK ((("daily_work_hours" > 0::numeric) AND ("daily_work_hours" <= 24::numeric))),
    CONSTRAINT "team_members_hourly_rate_check" CHECK (("hourly_rate" >= 0::numeric)),
    CONSTRAINT "team_members_role_check" CHECK (("role" = ANY (ARRAY['admin'::text, 'member'::text]))),
    CONSTRAINT "team_members_weekly_work_days_check" CHECK ((("weekly_work_days" > 0::numeric) AND ("weekly_work_days" <= 7::numeric)))
);
ALTER TABLE "public"."team_members" OWNER TO "postgres";
COMMENT ON TABLE "public"."team_members" IS 'チームメンバー情報（RLSで制御）';

CREATE TABLE IF NOT EXISTS "public"."teams" (
    "id" uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    "name" text NOT NULL,
    "description" text,
    "created_by" uuid,
    "created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE "public"."teams" OWNER TO "postgres";
COMMENT ON TABLE "public"."teams" IS 'チーム情報（RLSで制御）';

CREATE TABLE IF NOT EXISTS "public"."time_entries" (
    "id" uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    "user_id" uuid NOT NULL,
    "project_id" uuid NOT NULL,
    "task_id" uuid,
    "start_time" timestamp with time zone NOT NULL,
    "end_time" timestamp with time zone,
    "break_minutes" integer DEFAULT 0,
    "description" text,
    "created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT "time_entries_break_minutes_check" CHECK (("break_minutes" >= 0)),
    CONSTRAINT "time_entries_check" CHECK ((("end_time" IS NULL) OR ("end_time" > "start_time")))
);
ALTER TABLE "public"."time_entries" OWNER TO "postgres";

-- 主キー／制約・インデックスの設定（以下省略せずそのまま記載）
ALTER TABLE ONLY "public"."offers" ADD CONSTRAINT "offers_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."offers" ADD CONSTRAINT "offers_token_key" UNIQUE ("token");
ALTER TABLE ONLY "public"."profiles" ADD CONSTRAINT "profiles_email_key" UNIQUE ("email");
ALTER TABLE ONLY "public"."profiles" ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."projects" ADD CONSTRAINT "projects_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."reports" ADD CONSTRAINT "reports_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."task_assignees" ADD CONSTRAINT "task_assignees_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."task_assignees" ADD CONSTRAINT "task_assignees_task_id_user_id_key" UNIQUE ("task_id", "user_id");
ALTER TABLE ONLY "public"."task_comments" ADD CONSTRAINT "task_comments_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."task_history" ADD CONSTRAINT "task_history_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."tasks" ADD CONSTRAINT "tasks_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."team_members" ADD CONSTRAINT "team_members_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."team_members" ADD CONSTRAINT "team_members_team_id_user_id_key" UNIQUE ("team_id", "user_id");
ALTER TABLE ONLY "public"."teams" ADD CONSTRAINT "teams_pkey" PRIMARY KEY ("id");
ALTER TABLE ONLY "public"."time_entries" ADD CONSTRAINT "time_entries_pkey" PRIMARY KEY ("id");

CREATE INDEX "offers_email_idx" ON "public"."offers" USING "btree" ("email");
CREATE INDEX "offers_team_id_idx" ON "public"."offers" USING "btree" ("team_id");
CREATE INDEX "offers_token_idx" ON "public"."offers" USING "btree" ("token");
CREATE INDEX "profiles_email_idx" ON "public"."profiles" USING "btree" ("email");
CREATE INDEX "profiles_role_idx" ON "public"."profiles" USING "btree" ("role");
CREATE INDEX "projects_team_id_idx" ON "public"."projects" USING "btree" ("team_id");
CREATE INDEX "reports_project_id_idx" ON "public"."reports" USING "btree" ("project_id");
CREATE INDEX "reports_team_id_idx" ON "public"."reports" USING "btree" ("team_id");
CREATE INDEX "task_assignees_task_id_idx" ON "public"."task_assignees" USING "btree" ("task_id");
CREATE INDEX "task_assignees_user_id_idx" ON "public"."task_assignees" USING "btree" ("user_id");
CREATE INDEX "task_comments_task_id_idx" ON "public"."task_comments" USING "btree" ("task_id");
CREATE INDEX "task_history_task_id_idx" ON "public"."task_history" USING "btree" ("task_id");
CREATE INDEX "tasks_project_id_idx" ON "public"."tasks" USING "btree" ("project_id");
CREATE INDEX "tasks_team_id_idx" ON "public"."tasks" USING "btree" ("team_id");
CREATE INDEX "team_members_role_idx" ON "public"."team_members" USING "btree" ("role");
CREATE INDEX "team_members_team_id_idx" ON "public"."team_members" USING "btree" ("team_id");
CREATE INDEX "team_members_user_id_idx" ON "public"."team_members" USING "btree" ("user_id");
CREATE INDEX "time_entries_project_id_idx" ON "public"."time_entries" USING "btree" ("project_id");
CREATE INDEX "time_entries_task_id_idx" ON "public"."time_entries" USING "btree" ("task_id");
CREATE INDEX "time_entries_user_id_idx" ON "public"."time_entries" USING "btree" ("user_id");

-- 外部キー制約
ALTER TABLE ONLY "public"."offers" ADD CONSTRAINT "offers_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");
ALTER TABLE ONLY "public"."offers" ADD CONSTRAINT "offers_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."profiles" ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."projects" ADD CONSTRAINT "projects_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;
ALTER TABLE ONLY "public"."projects" ADD CONSTRAINT "projects_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."reports" ADD CONSTRAINT "reports_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."reports" ADD CONSTRAINT "reports_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."task_assignees" ADD CONSTRAINT "task_assignees_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."task_assignees" ADD CONSTRAINT "task_assignees_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."task_comments" ADD CONSTRAINT "task_comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."task_comments" ADD CONSTRAINT "task_comments_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."task_history" ADD CONSTRAINT "task_history_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."task_history" ADD CONSTRAINT "task_history_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."tasks" ADD CONSTRAINT "tasks_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."tasks" ADD CONSTRAINT "tasks_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."team_members" ADD CONSTRAINT "team_members_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."team_members" ADD CONSTRAINT "team_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."teams" ADD CONSTRAINT "teams_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;
ALTER TABLE ONLY "public"."time_entries" ADD CONSTRAINT "time_entries_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE;
ALTER TABLE ONLY "public"."time_entries" ADD CONSTRAINT "time_entries_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE SET NULL;
ALTER TABLE ONLY "public"."time_entries" ADD CONSTRAINT "time_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;

-- ▼ 以下、行レベルセキュリティ（RLS）のポリシー定義 ▼

-- 【teams テーブル】
DROP POLICY IF EXISTS "認証済みユーザーはチーム作成可能" ON "public"."teams";
DROP POLICY IF EXISTS "認証済みユーザーのみ作成可能" ON "public"."teams";
CREATE POLICY "認証済みユーザーはチーム作成可能" ON "public"."teams"
  FOR INSERT WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "チーム管理者または作成者はチーム削除可能" ON "public"."teams";
CREATE POLICY "チーム管理者または作成者はチーム削除可能" ON "public"."teams"
  FOR DELETE USING (
    (EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = teams.id
        AND tm.user_id = auth.uid()
        AND tm.role = 'admin'
    )) OR (created_by = auth.uid())
  );

DROP POLICY IF EXISTS "Team members can update their teams" ON "public"."teams";
CREATE POLICY "チーム管理者または作成者はチーム更新可能" ON "public"."teams"
  FOR UPDATE USING (
    (EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = teams.id
        AND tm.user_id = auth.uid()
        AND tm.role = 'admin'
    )) OR (created_by = auth.uid())
  );

DROP POLICY IF EXISTS "自分が所属するチーム情報参照可能" ON "public"."teams";
CREATE POLICY "自分が所属するチーム情報参照可能" ON public.teams
  FOR SELECT
  USING (
    teams.created_by = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.team_members tm
      WHERE tm.team_id = teams.id
        AND tm.user_id = auth.uid()
    )
  );

-- 【offers テーブル】
DROP POLICY IF EXISTS "Team members can create offers for their team" ON "public"."offers";
CREATE POLICY "チームメンバーはチーム招待作成可能" ON "public"."offers"
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = offers.team_id
        AND tm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Team members can delete offers for their team" ON "public"."offers";
CREATE POLICY "チームメンバーはチーム招待削除可能" ON "public"."offers"
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = offers.team_id
        AND tm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Team members can update offers for their team" ON "public"."offers";
CREATE POLICY "チームメンバーはチーム招待更新可能" ON "public"."offers"
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = offers.team_id
        AND tm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "チームメンバーのみ参照可能" ON "public"."offers";
CREATE POLICY "自分が所属するチームの招待情報参照可能" ON "public"."offers"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = offers.team_id
        AND tm.user_id = auth.uid()
    )
  );

-- 【profiles テーブル】
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON "public"."profiles";
DROP POLICY IF EXISTS "チームメンバーのプロフィールのみ参照可能" ON "public"."profiles";
DROP POLICY IF EXISTS "プロフィール参照可能範囲" ON "public"."profiles";
CREATE POLICY "全ユーザーによるプロフィール参照可能" ON "public"."profiles"
  FOR SELECT
  USING (true);

CREATE POLICY "ユーザーは自分のプロフィール作成可能" ON "public"."profiles"
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "自身のプロフィールのみ更新可能" ON "public"."profiles"
  FOR UPDATE USING (auth.uid() = id);

-- 【projects テーブル】
DROP POLICY IF EXISTS "Team members can create projects" ON "public"."projects";
CREATE POLICY "チームメンバーはプロジェクト作成可能" ON "public"."projects"
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = projects.team_id
        AND tm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Team members can view their projects" ON "public"."projects";
CREATE POLICY "自分が所属するプロジェクト参照可能" ON "public"."projects"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = projects.team_id
        AND tm.user_id = auth.uid()
    )
  );

-- 【task_assignees テーブル】
DROP POLICY IF EXISTS "チームメンバーはタスクアサイン参照可能" ON "public"."task_assignees";
CREATE POLICY "チームメンバーはタスクアサイン参照可能" ON "public"."task_assignees"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.tasks t
      JOIN public.team_members tm ON t.team_id = tm.team_id
      WHERE t.id = task_assignees.task_id
        AND tm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "チームメンバーはタスクアサイン削除可能" ON "public"."task_assignees";
CREATE POLICY "チームメンバーはタスクアサイン削除可能" ON "public"."task_assignees"
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.tasks t
      JOIN public.team_members tm ON t.team_id = tm.team_id
      WHERE t.id = task_assignees.task_id
        AND tm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "チームメンバーはタスクアサイン追加可能" ON "public"."task_assignees";
CREATE POLICY "チームメンバーはタスクアサイン追加可能" ON "public"."task_assignees"
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.tasks t
      JOIN public.team_members tm ON t.team_id = tm.team_id
      WHERE t.id = task_assignees.task_id
        AND tm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "チームメンバーはタスクアサイン更新可能" ON "public"."task_assignees";
CREATE POLICY "チームメンバーはタスクアサイン更新可能" ON "public"."task_assignees"
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.tasks t
      JOIN public.team_members tm ON t.team_id = tm.team_id
      WHERE t.id = task_assignees.task_id
        AND tm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.tasks t
      JOIN public.team_members tm ON t.team_id = tm.team_id
      WHERE t.id = task_assignees.task_id
        AND tm.user_id = auth.uid()
    )
  );
-- 【task_comments テーブル】
DROP POLICY IF EXISTS "Team members can view task comments" ON "public"."task_comments";
CREATE POLICY "チームメンバーはタスクコメント参照可能" ON "public"."task_comments"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.tasks
      JOIN public.team_members ON tasks.team_id = team_members.team_id
      WHERE task_comments.task_id = tasks.id
        AND team_members.user_id = auth.uid()
    )
  );

-- 【tasks テーブル】
DROP POLICY IF EXISTS "Team members can create tasks" ON "public"."tasks";
CREATE POLICY "チームメンバーはタスク作成可能" ON "public"."tasks"
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = tasks.team_id
        AND tm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Team members can delete tasks" ON "public"."tasks";
CREATE POLICY "チームメンバーはタスク削除可能" ON "public"."tasks"
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = tasks.team_id
        AND tm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Team members can update tasks" ON "public"."tasks";
CREATE POLICY "チームメンバーはタスク更新可能" ON "public"."tasks"
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = tasks.team_id
        AND tm.user_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = tasks.team_id
        AND tm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Team members can view tasks" ON "public"."tasks";
CREATE POLICY "自分が所属するタスク参照可能" ON "public"."tasks"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = tasks.team_id
        AND tm.user_id = auth.uid()
    )
  );

-- 【team_members テーブル】
DROP POLICY IF EXISTS "Team admins can insert new members" ON "public"."team_members";
DROP POLICY IF EXISTS "チーム作成者または管理者のみ追加可能" ON "public"."team_members";
CREATE POLICY "チーム管理者または作成者はメンバー追加可能" ON "public"."team_members"
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.teams
      WHERE teams.id = team_members.team_id
        AND teams.created_by = auth.uid()
        AND NOT EXISTS (
          SELECT 1 FROM public.team_members tm2 WHERE tm2.team_id = teams.id
        )
    )
    OR EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = team_members.team_id
        AND tm.user_id = auth.uid()
        AND tm.role = 'admin'
    )
  );

-- 既存の「自身のメンバーシップ削除可能」ポリシーはそのまま残す
DROP POLICY IF EXISTS "チームメンバーは自身のメンバーシップ削除可能" ON "public"."team_members";
CREATE POLICY "チームメンバーは自身のメンバーシップ削除可能" ON "public"."team_members"
  FOR DELETE USING (user_id = auth.uid());

-- 新たに管理者用の削除ポリシーを追加
DROP POLICY IF EXISTS "チーム管理者はメンバーを削除可能" ON "public"."team_members";
CREATE POLICY "チーム管理者はメンバーを削除可能" ON "public"."team_members"
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = team_members.team_id
        AND tm.user_id = auth.uid()
        AND tm.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Team members can update membership" ON "public"."team_members";
CREATE POLICY "チームメンバーは自身のメンバーシップ更新可能" ON "public"."team_members"
  FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "チームメンバーのみ参照可能" ON "public"."team_members";
CREATE OR REPLACE FUNCTION public.is_team_member(p_user_id uuid, p_team_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.team_members
    WHERE team_id = p_team_id
      AND user_id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
DROP POLICY IF EXISTS "自分が所属するチームの全メンバー情報参照可能" ON "public"."team_members";
-- 新しいポリシーを適用
CREATE POLICY "自分が所属するチームの全メンバー情報参照可能" ON "public"."team_members"
  FOR SELECT
  USING (
    public.is_team_member(auth.uid(), team_id)
  );


-- 【time_entries テーブル】
DROP POLICY IF EXISTS "Team members can insert time entries" ON "public"."time_entries";
CREATE POLICY "チームメンバーはタイムエントリー追加可能" ON "public"."time_entries"
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.user_id = auth.uid()
        AND tm.team_id = (
          SELECT projects.team_id
          FROM public.projects
          WHERE projects.id = time_entries.project_id
        )
    )
  );

DROP POLICY IF EXISTS "Team members can update their own time entries" ON "public"."time_entries";
CREATE POLICY "チームメンバーは自身のタイムエントリー更新可能" ON "public"."time_entries"
  FOR UPDATE USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.user_id = auth.uid()
        AND tm.team_id = (
          SELECT projects.team_id
          FROM public.projects
          WHERE projects.id = time_entries.project_id
        )
    )
  ) WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.user_id = auth.uid()
        AND tm.team_id = (
          SELECT projects.team_id
          FROM public.projects
          WHERE projects.id = time_entries.project_id
        )
    )
  );

DROP POLICY IF EXISTS "Users can view own time entries" ON "public"."time_entries";
CREATE POLICY "ユーザーは自身のタイムエントリー参照可能" ON "public"."time_entries"
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Team members can view time entries" ON "public"."time_entries";
CREATE POLICY "チームメンバーはチームのタイムエントリー参照可能" ON "public"."time_entries"
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.team_id = (
        SELECT projects.team_id
        FROM public.projects
        WHERE projects.id = time_entries.project_id
      )
      AND tm.user_id = auth.uid()
    )
  );

-- ▼ 行レベルセキュリティの有効化 ▼
ALTER TABLE "public"."offers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."projects" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."reports" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."task_assignees" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."task_comments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."task_history" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."tasks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."team_members" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."teams" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."time_entries" ENABLE ROW LEVEL SECURITY;

-- Publication の設定
ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";
ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."profiles";
ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."projects";
ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."task_comments";
ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."tasks";
ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."team_members";
ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."teams";
ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."time_entries";

-- スキーマの使用権限の付与
GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

-- テーブルごとの権限付与
GRANT ALL ON TABLE "public"."offers" TO "anon";
GRANT ALL ON TABLE "public"."offers" TO "authenticated";
GRANT ALL ON TABLE "public"."offers" TO "service_role";

GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";

GRANT ALL ON TABLE "public"."projects" TO "anon";
GRANT ALL ON TABLE "public"."projects" TO "authenticated";
GRANT ALL ON TABLE "public"."projects" TO "service_role";

GRANT ALL ON TABLE "public"."reports" TO "anon";
GRANT ALL ON TABLE "public"."reports" TO "authenticated";
GRANT ALL ON TABLE "public"."reports" TO "service_role";

GRANT ALL ON TABLE "public"."task_assignees" TO "anon";
GRANT ALL ON TABLE "public"."task_assignees" TO "authenticated";
GRANT ALL ON TABLE "public"."task_assignees" TO "service_role";

GRANT ALL ON TABLE "public"."task_comments" TO "anon";
GRANT ALL ON TABLE "public"."task_comments" TO "authenticated";
GRANT ALL ON TABLE "public"."task_comments" TO "service_role";

GRANT ALL ON TABLE "public"."task_history" TO "anon";
GRANT ALL ON TABLE "public"."task_history" TO "authenticated";
GRANT ALL ON TABLE "public"."task_history" TO "service_role";

GRANT ALL ON TABLE "public"."tasks" TO "anon";
GRANT ALL ON TABLE "public"."tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."tasks" TO "service_role";

GRANT ALL ON TABLE "public"."team_members" TO "anon";
GRANT ALL ON TABLE "public"."team_members" TO "authenticated";
GRANT ALL ON TABLE "public"."team_members" TO "service_role";

GRANT ALL ON TABLE "public"."teams" TO "anon";
GRANT ALL ON TABLE "public"."teams" TO "authenticated";
GRANT ALL ON TABLE "public"."teams" TO "service_role";

GRANT ALL ON TABLE "public"."time_entries" TO "anon";
GRANT ALL ON TABLE "public"."time_entries" TO "authenticated";
GRANT ALL ON TABLE "public"."time_entries" TO "service_role";

-- デフォルト権限の設定
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";

RESET ALL;
