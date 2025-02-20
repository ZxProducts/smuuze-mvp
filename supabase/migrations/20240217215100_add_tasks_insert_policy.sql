-- タスクの作成ポリシーを追加
create policy "Team members can create tasks"
  on tasks
  for insert
  with check (
    exists (
      select 1 
      from team_members
      where team_members.team_id = tasks.team_id
      and team_members.user_id = auth.uid()
    )
  );

-- タスクの更新ポリシーを追加
create policy "Team members can update tasks"
  on tasks
  for update
  using (
    exists (
      select 1 
      from team_members
      where team_members.team_id = tasks.team_id
      and team_members.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 
      from team_members
      where team_members.team_id = tasks.team_id
      and team_members.user_id = auth.uid()
    )
  );

-- タスクの削除ポリシーを追加
create policy "Team members can delete tasks"
  on tasks
  for delete
  using (
    exists (
      select 1 
      from team_members
      where team_members.team_id = tasks.team_id
      and team_members.user_id = auth.uid()
    )
  );