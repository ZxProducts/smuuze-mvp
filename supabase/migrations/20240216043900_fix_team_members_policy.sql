-- Drop all existing policies
drop policy if exists "Team members can view team membership" on public.team_members;
drop policy if exists "Team members can insert new members" on public.team_members;
drop policy if exists "Team members can update membership" on public.team_members;
drop policy if exists "Team members can delete membership" on public.team_members;

-- Create new policies
create policy "Team members can view team membership"
    on public.team_members for select
    using (
        user_id = auth.uid()
    );

create policy "Team members can insert new members"
    on public.team_members for insert
    with check (
        exists (
            select 1
            from public.teams
            where teams.id = team_id
            and exists (
                select 1
                from public.team_members
                where team_members.team_id = teams.id
                and team_members.user_id = auth.uid()
            )
        )
    );

create policy "Team members can update membership"
    on public.team_members for update
    using (
        user_id = auth.uid()
    );

create policy "Team members can delete membership"
    on public.team_members for delete
    using (
        user_id = auth.uid()
    );