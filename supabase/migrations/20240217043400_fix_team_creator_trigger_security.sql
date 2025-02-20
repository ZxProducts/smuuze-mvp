-- Drop existing function and trigger
drop trigger if exists add_team_creator_as_admin_trigger on public.teams;
drop function if exists public.add_team_creator_as_admin();

-- Create function with SECURITY DEFINER
create or replace function public.add_team_creator_as_admin()
returns trigger
security definer
set search_path = public
language plpgsql as $$
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
$$;

-- Create trigger
create trigger add_team_creator_as_admin_trigger
    after insert on public.teams
    for each row
    execute function public.add_team_creator_as_admin();