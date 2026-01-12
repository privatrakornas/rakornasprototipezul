-- ============================================
-- 1. TABEL PROFILES (Data Peserta)
-- ============================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_fingerprint TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  email TEXT,
  instansi TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles (public read/write for exam simulation)
CREATE POLICY "Anyone can view profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Anyone can create profiles" ON public.profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update profiles" ON public.profiles FOR UPDATE USING (true);

-- ============================================
-- 2. TABEL QUESTIONS (Bank Soal)
-- ============================================
CREATE TABLE IF NOT EXISTS public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_number INTEGER NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('TWK', 'TIU', 'TKP')),
  question_text TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  option_e TEXT NOT NULL,
  correct_answer CHAR(1) CHECK (correct_answer IN ('A', 'B', 'C', 'D', 'E')),
  -- For TKP, store points for each option
  points_a INTEGER DEFAULT 0,
  points_b INTEGER DEFAULT 0,
  points_c INTEGER DEFAULT 0,
  points_d INTEGER DEFAULT 0,
  points_e INTEGER DEFAULT 0,
  explanation TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(question_number, category)
);

-- Enable RLS
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for questions (public read only)
CREATE POLICY "Anyone can view questions" ON public.questions FOR SELECT USING (true);

-- ============================================
-- 3. TABEL USER_ANSWERS (Jawaban Per Soal untuk Realtime Scoring)
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.exam_sessions(id) ON DELETE CASCADE,
  question_number INTEGER NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('TWK', 'TIU', 'TKP')),
  selected_answer CHAR(1) CHECK (selected_answer IN ('A', 'B', 'C', 'D', 'E')),
  is_correct BOOLEAN DEFAULT false,
  points_earned INTEGER DEFAULT 0,
  answered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(session_id, question_number)
);

-- Enable RLS
ALTER TABLE public.user_answers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_answers (public read/write for exam simulation)
CREATE POLICY "Anyone can view user_answers" ON public.user_answers FOR SELECT USING (true);
CREATE POLICY "Anyone can create user_answers" ON public.user_answers FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update user_answers" ON public.user_answers FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete user_answers" ON public.user_answers FOR DELETE USING (true);

-- ============================================
-- 4. INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_profiles_device_fingerprint ON public.profiles(device_fingerprint);
CREATE INDEX IF NOT EXISTS idx_questions_category ON public.questions(category);
CREATE INDEX IF NOT EXISTS idx_questions_number ON public.questions(question_number);
CREATE INDEX IF NOT EXISTS idx_user_answers_session ON public.user_answers(session_id);
CREATE INDEX IF NOT EXISTS idx_user_answers_question ON public.user_answers(question_number);

-- ============================================
-- 5. TRIGGER FUNCTIONS FOR updated_at
-- ============================================
CREATE OR REPLACE FUNCTION public.update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Apply triggers
DROP TRIGGER IF EXISTS update_profiles_timestamp ON public.profiles;
CREATE TRIGGER update_profiles_timestamp
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

DROP TRIGGER IF EXISTS update_questions_timestamp ON public.questions;
CREATE TRIGGER update_questions_timestamp
  BEFORE UPDATE ON public.questions
  FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

DROP TRIGGER IF EXISTS update_user_answers_timestamp ON public.user_answers;
CREATE TRIGGER update_user_answers_timestamp
  BEFORE UPDATE ON public.user_answers
  FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

-- ============================================
-- 6. ENABLE REALTIME FOR ALL TABLES
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.questions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_answers;