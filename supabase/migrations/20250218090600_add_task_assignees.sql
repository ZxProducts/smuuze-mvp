-- 更新日時を設定する関数を作成
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = current_timestamp;
  return new;
end;
$$ language plpgsql;

-- task_assigneesテーブルの作成
create table task_assignees (
  id uuid default gen_random_uuid() primary key,
  task_id uuid references tasks(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  assigned_at timestamp with time zone default now(),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique(task_id, user_id)
);

-- 更新日時を自動的に設定するトリガー
create trigger set_updated_at
  before update on task_assignees
  for each row
  execute function update_updated_at_column();

-- セキュリティポリシーの設定
alter table task_assignees enable row level security;

create policy "Team members can view task assignees"
  on task_assignees for select
  using (
    exists (
      select 1 from tasks t
      inner join team_members tm on t.team_id = tm.team_id
      where t.id = task_assignees.task_id
      and tm.user_id = auth.uid()
    )
  );

create policy "Team members can manage task assignees"
  on task_assignees for all
  using (
    exists (
      select 1 from tasks t
      inner join team_members tm on t.team_id = tm.team_id
      where t.id = task_assignees.task_id
      and tm.user_id = auth.uid()
    )
  );

-- 既存のデータを移行
insert into task_assignees (task_id, user_id)
select id, assigned_to
from tasks
where assigned_to is not null;

-- assigned_toカラムを削除
alter table tasks drop column if exists assigned_to;
alter table tasks drop column if exists assignee_id;

-- インデックスの作成
create index task_assignees_task_id_idx on task_assignees(task_id);
create index task_assignees_user_id_idx on task_assignees(user_id);