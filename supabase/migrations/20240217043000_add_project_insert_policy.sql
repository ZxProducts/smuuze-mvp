-- Create function to set created_by
create or replace function public.set_created_by()
returns trigger as $$
begin
    new.created_by = auth.uid();
    return new;
end;
$$ language plpgsql;

-- Update created_by on insert
create trigger set_created_by_on_project_insert
    before insert on public.projects
    for each row
    execute function public.set_created_by();

-- Add insert policy for projects
create policy "Team members can create projects"
    on public.projects for insert
    with check (
        exists (
            select 1 from public.team_members
            where team_members.team_id = projects.team_id
            and team_members.user_id = auth.uid()
        )
    );