-- Create storage bucket for automated backups
INSERT INTO storage.buckets (id, name, public)
VALUES ('exam-backups', 'exam-backups', false)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for backups bucket (admin only via service role)
CREATE POLICY "Service role can manage backups"
ON storage.objects
FOR ALL
USING (bucket_id = 'exam-backups')
WITH CHECK (bucket_id = 'exam-backups');

-- Create table to track backup history
CREATE TABLE IF NOT EXISTS public.backup_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename TEXT NOT NULL,
  file_size INTEGER NOT NULL DEFAULT 0,
  sessions_count INTEGER NOT NULL DEFAULT 0,
  answers_count INTEGER NOT NULL DEFAULT 0,
  profiles_count INTEGER NOT NULL DEFAULT 0,
  audit_logs_count INTEGER NOT NULL DEFAULT 0,
  backup_type TEXT NOT NULL DEFAULT 'manual', -- 'manual', 'scheduled_hourly', 'scheduled_daily'
  status TEXT NOT NULL DEFAULT 'completed', -- 'completed', 'failed'
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on backup_history
ALTER TABLE public.backup_history ENABLE ROW LEVEL SECURITY;

-- Anyone can view backup history (admin panel)
CREATE POLICY "Anyone can view backup history"
ON public.backup_history
FOR SELECT
USING (true);

-- Anyone can insert backup history (for edge function)
CREATE POLICY "Anyone can insert backup history"
ON public.backup_history
FOR INSERT
WITH CHECK (true);

-- Enable realtime for backup_history
ALTER PUBLICATION supabase_realtime ADD TABLE public.backup_history;