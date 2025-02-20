-- Add created_by column to projects table
alter table public.projects
add column created_by uuid references public.profiles(id) on delete set null;

-- Set created_by to the team creator for existing projects
update public.projects
set created_by = (
    select created_by
    from public.teams
    where teams.id = projects.team_id
);

-- Make created_by not null after setting values for existing records
alter table public.projects
alter column created_by set not null;