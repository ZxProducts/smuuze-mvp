-- Drop the existing foreign key constraint
alter table public.time_entries
drop constraint time_entries_task_id_fkey;

-- Add the constraint back with explicit null allowed
alter table public.time_entries
alter column task_id drop not null,
add constraint time_entries_task_id_fkey
foreign key (task_id)
references public.tasks(id)
on delete set null;