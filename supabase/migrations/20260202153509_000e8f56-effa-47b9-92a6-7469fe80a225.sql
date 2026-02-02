-- Create exam_packages table to manage multiple exam sets
CREATE TABLE public.exam_packages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  twk_count INTEGER NOT NULL DEFAULT 0,
  tiu_count INTEGER NOT NULL DEFAULT 0,
  tkp_count INTEGER NOT NULL DEFAULT 0,
  total_questions INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add package_id to questions table
ALTER TABLE public.questions 
ADD COLUMN package_id UUID REFERENCES public.exam_packages(id) ON DELETE CASCADE;

-- Enable RLS
ALTER TABLE public.exam_packages ENABLE ROW LEVEL SECURITY;

-- RLS policies for exam_packages
CREATE POLICY "Anyone can view exam packages" 
ON public.exam_packages 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can insert exam packages" 
ON public.exam_packages 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update exam packages" 
ON public.exam_packages 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete exam packages" 
ON public.exam_packages 
FOR DELETE 
USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_exam_packages_updated_at
BEFORE UPDATE ON public.exam_packages
FOR EACH ROW
EXECUTE FUNCTION public.update_timestamp();

-- Add RLS policy for questions insert
CREATE POLICY "Anyone can insert questions" 
ON public.questions 
FOR INSERT 
WITH CHECK (true);

-- Add RLS policy for questions update
CREATE POLICY "Anyone can update questions" 
ON public.questions 
FOR UPDATE 
USING (true);

-- Add RLS policy for questions delete
CREATE POLICY "Anyone can delete questions" 
ON public.questions 
FOR DELETE 
USING (true);

-- Create the default package and assign existing questions
INSERT INTO public.exam_packages (name, description, is_default, is_active, twk_count, tiu_count, tkp_count, total_questions)
VALUES ('Paket Default', 'Paket soal default yang berisi 110 soal (TWK: 30, TIU: 35, TKP: 45)', true, true, 30, 35, 45, 110);

-- Update existing questions to reference the default package
UPDATE public.questions 
SET package_id = (SELECT id FROM public.exam_packages WHERE is_default = true LIMIT 1)
WHERE package_id IS NULL;