-- Drop existing update policy
drop policy if exists "Users can update their own time entries" on public.time_entries;

-- Create new update policy that checks team membership and project association
create policy "Team members can update their own time entries"
    on public.time_entries for update
    using (
        -- ユーザー自身の作業記録であること
        auth.uid() = user_id
        and
        -- ユーザーがプロジェクトのチームに所属していること
        exists (
            select 1
            from public.team_members
            where team_members.user_id = auth.uid()
            and team_members.team_id = (
                select team_id 
                from public.projects 
                where id = time_entries.project_id
            )
        )
    )
    with check (
        -- 更新時のチェック条件
        auth.uid() = user_id
        and
        exists (
            select 1
            from public.team_members
            where team_members.user_id = auth.uid()
            and team_members.team_id = (
                select team_id 
                from public.projects 
                where id = time_entries.project_id
            )
        )
    );