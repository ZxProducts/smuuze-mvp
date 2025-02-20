-- Drop existing insert policy
drop policy if exists "Team members can insert new members" on public.team_members;

-- Create new insert policy that allows only team admins to add members
create policy "Team admins can insert new members"
    on public.team_members for insert
    with check (
        exists (
            select 1
            from public.team_members as admin_members
            where admin_members.team_id = team_id
            and admin_members.user_id = auth.uid()
            and admin_members.role = 'admin'
        )
    );