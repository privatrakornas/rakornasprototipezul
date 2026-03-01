
-- Create social media links table
CREATE TABLE public.social_media_links (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  platform text NOT NULL,
  username text NOT NULL DEFAULT '',
  link text NOT NULL DEFAULT '',
  is_visible boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.social_media_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view social media links" ON public.social_media_links FOR SELECT USING (true);
CREATE POLICY "Anyone can insert social media links" ON public.social_media_links FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update social media links" ON public.social_media_links FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete social media links" ON public.social_media_links FOR DELETE USING (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.social_media_links;

-- Insert default platforms
INSERT INTO public.social_media_links (platform, username, link, is_visible, display_order) VALUES
  ('instagram', '', '', false, 1),
  ('telegram', '', '', false, 2),
  ('tiktok', '', '', false, 3),
  ('whatsapp', '', '', false, 4),
  ('youtube', '', '', false, 5),
  ('facebook', '', '', false, 6);
