-- Create projects table
create table public.projects (
    id uuid default uuid_generate_v4() primary key,
    team_id uuid references public.teams(id) on delete cascade not null,
    name text not null,
    description text,
    start_date date not null,
    end_date date,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    check (end_date is null or end_date >= start_date)
);

-- Create tasks table
create table public.tasks (
    id uuid default uuid_generate_v4() primary key,
    project_id uuid references public.projects(id) on delete cascade not null,
    team_id uuid references public.teams(id) on delete cascade not null,
    title text not null,
    description text,
    priority text check (priority in ('low', 'medium', 'high')),
    status text not null check (status in ('not_started', 'in_progress', 'completed')) default 'not_started',
    assigned_to uuid references public.profiles(id) on delete set null,
    due_date date,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create task_comments table
create table public.task_comments (
    id uuid default uuid_generate_v4() primary key,
    task_id uuid references public.tasks(id) on delete cascade not null,
    author_id uuid references public.profiles(id) on delete cascade not null,
    comment text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create task_history table
create table public.task_history (
    id uuid default uuid_generate_v4() primary key,
    task_id uuid references public.tasks(id) on delete cascade not null,
    changed_by uuid references public.profiles(id) on delete cascade not null,
    change_type text not null check (change_type in ('status_change', 'assignment_change', 'update')),
    old_value jsonb,
    new_value jsonb,
    change_reason text,
    changed_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create time_entries table
create table public.time_entries (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references public.profiles(id) on delete cascade not null,
    project_id uuid references public.projects(id) on delete cascade not null,
    task_id uuid references public.tasks(id) on delete set null,
    start_time timestamp with time zone not null,
    end_time timestamp with time zone,
    break_minutes integer default 0 check (break_minutes >= 0),
    description text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    check (end_time is null or end_time > start_time)
);

-- Create reports table
create table public.reports (
    id uuid default uuid_generate_v4() primary key,
    team_id uuid references public.teams(id) on delete cascade not null,
    project_id uuid references public.projects(id) on delete cascade,
    period text not null,
    report_data jsonb not null,
    status text not null check (status in ('draft', 'finalized')) default 'draft',
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add indexes
create index projects_team_id_idx on public.projects(team_id);
create index tasks_project_id_idx on public.tasks(project_id);
create index tasks_team_id_idx on public.tasks(team_id);
create index tasks_assigned_to_idx on public.tasks(assigned_to);
create index task_comments_task_id_idx on public.task_comments(task_id);
create index task_history_task_id_idx on public.task_history(task_id);
create index time_entries_user_id_idx on public.time_entries(user_id);
create index time_entries_project_id_idx on public.time_entries(project_id);
create index time_entries_task_id_idx on public.time_entries(task_id);
create index reports_team_id_idx on public.reports(team_id);
create index reports_project_id_idx on public.reports(project_id);

-- Set up Row Level Security (RLS)
alter table public.projects enable row level security;
alter table public.tasks enable row level security;
alter table public.task_comments enable row level security;
alter table public.task_history enable row level security;
alter table public.time_entries enable row level security;
alter table public.reports enable row level security;

-- Create policies
create policy "Team members can view their projects"
    on public.projects for select
    using (
        exists (
            select 1 from public.team_members
            where team_members.team_id = projects.team_id
            and team_members.user_id = auth.uid()
        )
    );

create policy "Team members can view tasks"
    on public.tasks for select
    using (
        exists (
            select 1 from public.team_members
            where team_members.team_id = tasks.team_id
            and team_members.user_id = auth.uid()
        )
    );

create policy "Team members can view task comments"
    on public.task_comments for select
    using (
        exists (
            select 1 from public.tasks
            join public.team_members on tasks.team_id = team_members.team_id
            where task_comments.task_id = tasks.id
            and team_members.user_id = auth.uid()
        )
    );

create policy "Team members can view time entries"
    on public.time_entries for select
    using (
        user_id = auth.uid() or
        exists (
            select 1 from public.team_members
            where team_members.team_id = (
                select team_id from public.projects where id = time_entries.project_id
            )
            and team_members.user_id = auth.uid()
        )
    );

-- Create triggers
create trigger handle_updated_at
    before update on public.projects
    for each row
    execute function public.handle_updated_at();

create trigger handle_updated_at
    before update on public.tasks
    for each row
    execute function public.handle_updated_at();

create trigger handle_updated_at
    before update on public.task_comments
    for each row
    execute function public.handle_updated_at();

create trigger handle_updated_at
    before update on public.time_entries
    for each row
    execute function public.handle_updated_at();

create trigger handle_updated_at
    before update on public.reports
    for each row
    execute function public.handle_updated_at();

-- Enable realtime for specific tables
alter publication supabase_realtime add table public.projects;
alter publication supabase_realtime add table public.tasks;
alter publication supabase_realtime add table public.task_comments;
alter publication supabase_realtime add table public.time_entries;