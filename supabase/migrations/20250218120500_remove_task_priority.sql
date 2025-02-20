-- Remove priority column from tasks table
alter table public.tasks drop column if exists priority;