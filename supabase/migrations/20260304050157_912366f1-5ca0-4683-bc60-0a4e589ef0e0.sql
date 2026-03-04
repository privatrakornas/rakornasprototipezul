
-- Create public storage bucket for branding assets
INSERT INTO storage.buckets (id, name, public) VALUES ('branding', 'branding', true);

-- Allow anyone to read branding files
CREATE POLICY "Anyone can view branding files" ON storage.objects FOR SELECT USING (bucket_id = 'branding');

-- Allow anyone to upload branding files (admin-only enforced at app level)
CREATE POLICY "Anyone can upload branding files" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'branding');

-- Allow anyone to update branding files
CREATE POLICY "Anyone can update branding files" ON storage.objects FOR UPDATE USING (bucket_id = 'branding');

-- Allow anyone to delete branding files
CREATE POLICY "Anyone can delete branding files" ON storage.objects FOR DELETE USING (bucket_id = 'branding');
