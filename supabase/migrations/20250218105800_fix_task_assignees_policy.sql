-- task_assigneesテーブルのポリシーを修正
drop policy if exists "Team members can manage task assignees" on task_assignees;
drop policy if exists "Team members can view task assignees" on task_assignees;

-- 選択用のポリシー
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

-- 挿入用のポリシー
create policy "Team members can insert task assignees"
  on task_assignees for insert
  with check (
    exists (
      select 1 from tasks t
      inner join team_members tm on t.team_id = tm.team_id
      where t.id = task_id
      and tm.user_id = auth.uid()
    )
  );

-- 更新用のポリシー
create policy "Team members can update task assignees"
  on task_assignees for update
  using (
    exists (
      select 1 from tasks t
      inner join team_members tm on t.team_id = tm.team_id
      where t.id = task_assignees.task_id
      and tm.user_id = auth.uid()
    )
  );

-- 削除用のポリシー
create policy "Team members can delete task assignees"
  on task_assignees for delete
  using (
    exists (
      select 1 from tasks t
      inner join team_members tm on t.team_id = tm.team_id
      where t.id = task_assignees.task_id
      and tm.user_id = auth.uid()
    )
  );