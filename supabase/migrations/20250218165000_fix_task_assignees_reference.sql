-- Drop existing foreign key constraint
alter table task_assignees drop constraint task_assignees_user_id_fkey;

-- Add new foreign key constraint referencing profiles
alter table task_assignees
  add constraint task_assignees_user_id_fkey
  foreign key (user_id)
  references profiles(id)
  on delete cascade;

-- Recreate indexes
drop index if exists task_assignees_user_id_idx;
create index task_assignees_user_id_idx on task_assignees(user_id);