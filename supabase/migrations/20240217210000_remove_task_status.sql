-- Remove status column from tasks table
ALTER TABLE public.tasks DROP COLUMN status;

-- Update task_history change_type check constraint
ALTER TABLE public.task_history DROP CONSTRAINT task_history_change_type_check;
ALTER TABLE public.task_history ADD CONSTRAINT task_history_change_type_check 
    CHECK (change_type IN ('assignment_change', 'update'));