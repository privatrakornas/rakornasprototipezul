-- Create exam_sessions table for tracking ongoing exams
CREATE TABLE public.exam_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_fingerprint TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ongoing' CHECK (status IN ('ongoing', 'finished')),
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  finished_at TIMESTAMP WITH TIME ZONE,
  
  -- Current scores (updated in real-time as user answers)
  twk_score INTEGER NOT NULL DEFAULT 0,
  tiu_score INTEGER NOT NULL DEFAULT 0,
  tkp_score INTEGER NOT NULL DEFAULT 0,
  total_score INTEGER NOT NULL DEFAULT 0,
  
  -- Progress tracking
  answered_count INTEGER NOT NULL DEFAULT 0,
  total_questions INTEGER NOT NULL DEFAULT 110,
  
  -- Duration tracking
  duration_minutes INTEGER,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.exam_sessions ENABLE ROW LEVEL SECURITY;

-- Allow public read access for leaderboard display
CREATE POLICY "Anyone can view exam sessions" 
ON public.exam_sessions 
FOR SELECT 
USING (true);

-- Allow insert for creating new sessions
CREATE POLICY "Anyone can create exam sessions" 
ON public.exam_sessions 
FOR INSERT 
WITH CHECK (true);

-- Allow update for updating session progress
CREATE POLICY "Anyone can update exam sessions" 
ON public.exam_sessions 
FOR UPDATE 
USING (true);

-- Create index for performance
CREATE INDEX idx_exam_sessions_status ON public.exam_sessions(status);
CREATE INDEX idx_exam_sessions_device ON public.exam_sessions(device_fingerprint);
CREATE INDEX idx_exam_sessions_total_score ON public.exam_sessions(total_score DESC);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_exam_session_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_exam_sessions_updated_at
BEFORE UPDATE ON public.exam_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_exam_session_timestamp();

-- Enable realtime for the new table
ALTER PUBLICATION supabase_realtime ADD TABLE public.exam_sessions;