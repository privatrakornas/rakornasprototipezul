-- Create exam configuration table for storing configurable settings like PIN
CREATE TABLE public.exam_config (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  config_key text NOT NULL UNIQUE,
  config_value text NOT NULL,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.exam_config ENABLE ROW LEVEL SECURITY;

-- Only allow reading config (admin verification happens server-side)
CREATE POLICY "Anyone can view exam config" 
ON public.exam_config 
FOR SELECT 
USING (true);

-- Allow updates (admin-only logic enforced at application level)
CREATE POLICY "Anyone can update exam config" 
ON public.exam_config 
FOR UPDATE 
USING (true);

-- Allow inserts for initial setup
CREATE POLICY "Anyone can insert exam config" 
ON public.exam_config 
FOR INSERT 
WITH CHECK (true);

-- Insert default exam PIN (will be overridden by env if not set)
INSERT INTO public.exam_config (config_key, config_value, description)
VALUES ('exam_pin', '2024', 'PIN untuk masuk ujian peserta');

-- Insert default admin PIN
INSERT INTO public.exam_config (config_key, config_value, description)
VALUES ('admin_pin', 'admin123', 'PIN untuk masuk panel admin');

-- Create trigger for updated_at
CREATE TRIGGER update_exam_config_timestamp
BEFORE UPDATE ON public.exam_config
FOR EACH ROW
EXECUTE FUNCTION public.update_timestamp();