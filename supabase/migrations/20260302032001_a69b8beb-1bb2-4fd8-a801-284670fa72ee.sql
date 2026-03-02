
-- Create config_history table for undo/restore functionality
CREATE TABLE public.config_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  config_key text NOT NULL,
  old_value text NOT NULL,
  new_value text NOT NULL,
  changed_by text DEFAULT 'admin',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.config_history ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Anyone can view config history" ON public.config_history FOR SELECT USING (true);
CREATE POLICY "Anyone can insert config history" ON public.config_history FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can delete config history" ON public.config_history FOR DELETE USING (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.config_history;
