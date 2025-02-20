-- Create function to add team creator as admin
create or replace function public.add_team_creator_as_admin()
returns trigger as $$
begin
    insert into public.team_members (
        team_id,
        user_id,
        role,
        hourly_rate,
        daily_work_hours,
        weekly_work_days,
        meeting_included
    ) values (
        new.id,
        new.created_by,
        'admin',
        0,
        8,
        5,
        false
    );
    return new;
end;
$$ language plpgsql;

-- Create trigger
create trigger add_team_creator_as_admin_trigger
    after insert on public.teams
    for each row
    execute function public.add_team_creator_as_admin();