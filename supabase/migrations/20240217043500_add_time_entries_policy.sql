-- Enable RLS for time_entries table if not already enabled
alter table public.time_entries enable row level security;

-- Drop existing policies
drop policy if exists "Team members can insert time entries" on public.time_entries;
drop policy if exists "Users can update their own time entries" on public.time_entries;
drop policy if exists "Users can view team time entries" on public.time_entries;
drop policy if exists "Users can view own and team time entries" on public.time_entries;

-- Allow team members to insert time entries for their team's projects
create policy "Team members can insert time entries"
    on public.time_entries for insert
    with check (
        auth.uid() = user_id
        and
        exists (
            select 1
            from public.team_members
            where team_members.user_id = auth.uid()
            and team_members.team_id = (
                select team_id 
                from public.projects 
                where id = project_id
            )
        )
    );

-- Allow users to update their own time entries
create policy "Users can update their own time entries"
    on public.time_entries for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

-- Allow users to view their own time entries
create policy "Users can view own time entries"
    on public.time_entries for select
    using (auth.uid() = user_id);

-- Allow users to view team time entries
create policy "Users can view team time entries"
    on public.time_entries for select
    using (
        exists (
            select 1
            from public.team_members
            where team_members.user_id = auth.uid()
            and team_members.team_id = (
                select team_id
                from public.projects
                where id = project_id
            )
        )
    );