-- プロフィール作成ポリシー
create policy "Users can create their own profile"
    on public.profiles for insert
    with check (auth.uid() = id);

-- チーム作成のデフォルトポリシーを修正
drop policy if exists "Any authenticated user can create teams" on public.teams;
create policy "Any authenticated user can create teams"
    on public.teams for insert
    with check (
        auth.uid() = created_by and
        exists (
            select 1 from public.profiles
            where profiles.id = auth.uid()
        )
    );

-- チーム参照ポリシーを修正
drop policy if exists "Team members can view their teams" on public.teams;
create policy "Team members can view their teams"
    on public.teams for select
    using (
        exists (
            select 1 from public.team_members
            where team_members.team_id = id
            and team_members.user_id = auth.uid()
        ) or
        created_by = auth.uid()
    );

-- チーム更新ポリシーを修正
drop policy if exists "Team members can update their teams" on public.teams;
create policy "Team members can update their teams"
    on public.teams for update
    using (
        exists (
            select 1 from public.team_members
            where team_members.team_id = id
            and team_members.user_id = auth.uid()
            and team_members.role = 'admin'
        ) or
        created_by = auth.uid()
    );

-- チーム削除ポリシーを修正
drop policy if exists "Team creator can delete teams" on public.teams;
create policy "Team creator can delete teams"
    on public.teams for delete
    using (
        created_by = auth.uid()
    );