-- Add disqualification_reason column to exam_sessions table
ALTER TABLE public.exam_sessions 
ADD COLUMN IF NOT EXISTS disqualification_reason text;

-- Add comment for documentation
COMMENT ON COLUMN public.exam_sessions.disqualification_reason IS 'Reason why the session was aborted/disqualified (e.g., tab switching, blur event, admin action)';