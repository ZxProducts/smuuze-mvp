-- Add role column to team_members table
alter table public.team_members
add column if not exists role text not null default 'member'
check (role in ('admin', 'member'));

-- Update existing members to admin
update public.team_members
set role = 'admin'
where user_id in (
    select created_by from public.teams
    where teams.id = team_members.team_id
);

-- Add index for role column
create index if not exists team_members_role_idx on public.team_members(role);