-- Enable necessary extensions
create extension if not exists "uuid-ossp";

-- Create profiles table
create table public.profiles (
    id uuid references auth.users on delete cascade,
    full_name text not null,
    role text not null check (role in ('admin', 'member')),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    primary key (id)
);

-- Create teams table
create table public.teams (
    id uuid default uuid_generate_v4() primary key,
    name text not null,
    description text,
    created_by uuid references public.profiles(id) on delete set null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create team_members table
create table public.team_members (
    id uuid default uuid_generate_v4() primary key,
    team_id uuid references public.teams(id) on delete cascade not null,
    user_id uuid references public.profiles(id) on delete cascade not null,
    hourly_rate numeric not null check (hourly_rate >= 0),
    daily_work_hours numeric not null check (daily_work_hours > 0 and daily_work_hours <= 24),
    weekly_work_days numeric not null check (weekly_work_days > 0 and weekly_work_days <= 7),
    meeting_included boolean not null default false,
    notes text,
    joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(team_id, user_id)
);

-- Create offers table
create table public.offers (
    id uuid default uuid_generate_v4() primary key,
    team_id uuid references public.teams(id) on delete cascade not null,
    email text not null,
    hourly_rate numeric not null check (hourly_rate >= 0),
    daily_work_hours numeric not null check (daily_work_hours > 0 and daily_work_hours <= 24),
    weekly_work_days numeric not null check (weekly_work_days > 0 and weekly_work_days <= 7),
    meeting_included boolean not null default false,
    notes text,
    status text not null check (status in ('pending', 'accepted', 'rejected')) default 'pending',
    token text unique not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add indexes
create index profiles_role_idx on public.profiles(role);
create index team_members_team_id_idx on public.team_members(team_id);
create index team_members_user_id_idx on public.team_members(user_id);
create index offers_team_id_idx on public.offers(team_id);
create index offers_email_idx on public.offers(email);
create index offers_token_idx on public.offers(token);

-- Set up Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.offers enable row level security;

-- Create policies
create policy "Public profiles are viewable by everyone"
    on public.profiles for select
    using (true);

create policy "Users can update their own profile"
    on public.profiles for update
    using (auth.uid() = id);

create policy "Team members can view their teams"
    on public.teams for select
    using (
        exists (
            select 1 from public.team_members
            where team_members.team_id = teams.id
            and team_members.user_id = auth.uid()
        )
    );

create policy "Team members can view team membership"
    on public.team_members for select
    using (
        user_id = auth.uid() or
        exists (
            select 1 from public.team_members
            where team_members.team_id = team_id
            and team_members.user_id = auth.uid()
        )
    );

-- Create functions for updated_at trigger
create or replace function public.handle_updated_at()
returns trigger as $$
begin
    new.updated_at = timezone('utc'::text, now());
    return new;
end;
$$ language plpgsql;

-- Create updated_at triggers
create trigger handle_updated_at
    before update on public.profiles
    for each row
    execute function public.handle_updated_at();

create trigger handle_updated_at
    before update on public.teams
    for each row
    execute function public.handle_updated_at();

create trigger handle_updated_at
    before update on public.offers
    for each row
    execute function public.handle_updated_at();

-- Enable realtime for specific tables
alter publication supabase_realtime add table public.profiles;
alter publication supabase_realtime add table public.teams;
alter publication supabase_realtime add table public.team_members;
