-- Add navigation_log column to exam_sessions table for storing timeline data
-- This column stores JSON array of navigation events sent on submit (zero network lag)
ALTER TABLE public.exam_sessions 
ADD COLUMN IF NOT EXISTS navigation_log JSONB DEFAULT '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN public.exam_sessions.navigation_log IS 'Stores navigation timeline events. Format: [{timestamp, remainingTime, questionNumber, action, previousQuestion}]. Sent once on submit.';

-- Create index for efficient querying (GIN index for JSONB)
CREATE INDEX IF NOT EXISTS idx_exam_sessions_navigation_log ON public.exam_sessions USING gin(navigation_log);