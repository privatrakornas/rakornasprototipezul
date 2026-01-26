-- Add current_question_index column to track participant's active question
ALTER TABLE public.exam_sessions 
ADD COLUMN IF NOT EXISTS current_question_index integer NOT NULL DEFAULT 1;

-- Add comment for documentation
COMMENT ON COLUMN public.exam_sessions.current_question_index IS 'Tracks which question the participant is currently viewing (1-indexed)';