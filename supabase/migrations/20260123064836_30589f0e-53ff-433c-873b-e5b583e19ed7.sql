-- Add deleted_at column for soft delete functionality
ALTER TABLE public.exam_sessions 
ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Create index for better query performance when filtering by deleted_at
CREATE INDEX idx_exam_sessions_deleted_at ON public.exam_sessions(deleted_at);

-- Add comment for documentation
COMMENT ON COLUMN public.exam_sessions.deleted_at IS 'Soft delete timestamp. NULL = active, NOT NULL = deleted';