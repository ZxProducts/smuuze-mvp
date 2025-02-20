-- チーム作成ポリシー
create policy "Any authenticated user can create teams"
    on public.teams for insert
    with check (auth.uid() = created_by);

-- チーム更新ポリシー
create policy "Team members can update their teams"
    on public.teams for update
    using (
        exists (
            select 1 from public.team_members
            where team_members.team_id = id
            and team_members.user_id = auth.uid()
        )
    );

-- チーム削除ポリシー
create policy "Team creator can delete teams"
    on public.teams for delete
    using (auth.uid() = created_by);