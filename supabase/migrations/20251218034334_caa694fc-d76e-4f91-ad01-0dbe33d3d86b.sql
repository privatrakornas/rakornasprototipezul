-- Create exam_results table for leaderboard
CREATE TABLE public.exam_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  twk_score INTEGER NOT NULL DEFAULT 0,
  tiu_score INTEGER NOT NULL DEFAULT 0,
  tkp_score INTEGER NOT NULL DEFAULT 0,
  total_score INTEGER NOT NULL DEFAULT 0,
  ip_address TEXT,
  device_fingerprint TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.exam_results ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert their results
CREATE POLICY "Anyone can insert exam results" 
ON public.exam_results 
FOR INSERT 
WITH CHECK (true);

-- Allow anyone to read exam results (for leaderboard)
CREATE POLICY "Anyone can view exam results" 
ON public.exam_results 
FOR SELECT 
USING (true);

-- Create indexes for efficient leaderboard queries
CREATE INDEX idx_exam_results_leaderboard_sort 
ON public.exam_results (total_score DESC, tkp_score DESC, tiu_score DESC, twk_score DESC);

CREATE INDEX idx_exam_results_ip_address 
ON public.exam_results (ip_address);

CREATE INDEX idx_exam_results_device_fingerprint 
ON public.exam_results (device_fingerprint);

CREATE INDEX idx_exam_results_created_at 
ON public.exam_results (created_at);

-- Create composite index for unique user identification
CREATE INDEX idx_exam_results_unique_user 
ON public.exam_results (ip_address, device_fingerprint, total_score DESC);

-- Enable realtime for leaderboard updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.exam_results;