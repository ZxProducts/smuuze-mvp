-- テーブル作成
create table if not exists public.offers (
    id uuid primary key default gen_random_uuid(),
    team_id uuid not null references public.teams(id) on delete cascade,
    email text not null,
    hourly_rate numeric not null,
    daily_work_hours numeric not null default 8,
    weekly_work_days numeric not null default 5,
    meeting_included boolean not null default true,
    notes text,
    status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
    token text not null unique,
    created_by uuid not null references auth.users(id),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- インデックス作成
create index if not exists offers_team_id_idx on public.offers(team_id);
create index if not exists offers_email_idx on public.offers(email);
create index if not exists offers_token_idx on public.offers(token);

-- 自動更新時間設定
create trigger handle_updated_at
    before update on public.offers
    for each row
    execute function public.handle_updated_at();

-- RLSの有効化
alter table public.offers enable row level security;

-- RLSポリシー作成
create policy "Team members can view offers for their team"
    on public.offers for select
    using (
        exists (
            select 1 from public.team_members
            where team_members.team_id = offers.team_id
            and team_members.user_id = auth.uid()
        )
    );

create policy "Team members can create offers for their team"
    on public.offers for insert
    with check (
        exists (
            select 1 from public.team_members
            where team_members.team_id = offers.team_id
            and team_members.user_id = auth.uid()
        )
    );

create policy "Team members can update offers for their team"
    on public.offers for update
    using (
        exists (
            select 1 from public.team_members
            where team_members.team_id = offers.team_id
            and team_members.user_id = auth.uid()
        )
    );

create policy "Team members can delete offers for their team"
    on public.offers for delete
    using (
        exists (
            select 1 from public.team_members
            where team_members.team_id = offers.team_id
            and team_members.user_id = auth.uid()
        )
    );

-- オファートークン生成関数
create or replace function public.generate_offer_token() returns trigger as $$
begin
    new.token := encode(gen_random_bytes(32), 'hex');
    return new;
end;
$$ language plpgsql security definer;

-- オファートークン生成トリガー
create trigger generate_offer_token_trigger
    before insert on public.offers
    for each row
    execute function public.generate_offer_token();