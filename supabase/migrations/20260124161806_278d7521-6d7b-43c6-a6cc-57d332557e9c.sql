-- Create audit_logs table for admin actions
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  action TEXT NOT NULL,
  target_id UUID,
  target_name TEXT,
  details TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add index for faster queries
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action);

-- Enable Row Level Security
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only allow insert (admins can add logs)
CREATE POLICY "Anyone can insert audit logs"
ON public.audit_logs
FOR INSERT
WITH CHECK (true);

-- Only allow select (admins can view logs)
CREATE POLICY "Anyone can view audit logs"
ON public.audit_logs
FOR SELECT
USING (true);

-- Enable realtime for audit logs
ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_logs;