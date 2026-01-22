-- Drop old constraint and add new one that includes 'aborted' status
ALTER TABLE public.exam_sessions 
DROP CONSTRAINT exam_sessions_status_check;

ALTER TABLE public.exam_sessions 
ADD CONSTRAINT exam_sessions_status_check 
CHECK (status = ANY (ARRAY['ongoing'::text, 'finished'::text, 'aborted'::text]));