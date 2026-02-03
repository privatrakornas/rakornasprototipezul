import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Question } from '@/data/questions';

interface DbQuestion {
  id: string;
  question_number: number;
  category: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  option_e: string;
  correct_answer: string | null;
  points_a: number | null;
  points_b: number | null;
  points_c: number | null;
  points_d: number | null;
  points_e: number | null;
  explanation: string | null;
}

// Transform DB question format to app Question format
const transformQuestion = (dbQ: DbQuestion): Question => {
  const category = dbQ.category as 'TWK' | 'TIU' | 'TKP';
  
  // For TKP questions, include scores in options
  const options = category === 'TKP' 
    ? [
        { key: 'A', text: dbQ.option_a, score: dbQ.points_a ?? 1 },
        { key: 'B', text: dbQ.option_b, score: dbQ.points_b ?? 1 },
        { key: 'C', text: dbQ.option_c, score: dbQ.points_c ?? 1 },
        { key: 'D', text: dbQ.option_d, score: dbQ.points_d ?? 1 },
        { key: 'E', text: dbQ.option_e, score: dbQ.points_e ?? 1 },
      ]
    : [
        { key: 'A', text: dbQ.option_a },
        { key: 'B', text: dbQ.option_b },
        { key: 'C', text: dbQ.option_c },
        { key: 'D', text: dbQ.option_d },
        { key: 'E', text: dbQ.option_e },
      ];

  return {
    id: dbQ.question_number,
    category,
    code: category,
    text: dbQ.question_text,
    options,
    correctAnswer: dbQ.correct_answer ?? undefined,
    explanation: dbQ.explanation || '',
  };
};

export const useActivePackageQuestions = () => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activePackage, setActivePackage] = useState<{ id: string; name: string } | null>(null);

  const fetchActivePackageQuestions = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // First, find the active package (is_active = true)
      // If multiple packages are active, prefer the one that is also default
      // If no package is active, fall back to the default package
      const { data: packages, error: pkgError } = await supabase
        .from('exam_packages')
        .select('id, name, is_active, is_default')
        .or('is_active.eq.true,is_default.eq.true')
        .order('is_active', { ascending: false })
        .order('is_default', { ascending: false });

      if (pkgError) throw pkgError;

      if (!packages || packages.length === 0) {
        throw new Error('Tidak ada paket ujian yang tersedia');
      }

      // Find the best package: prefer active, then default
      const activePkg = packages.find(p => p.is_active) || packages.find(p => p.is_default);
      
      if (!activePkg) {
        throw new Error('Tidak ada paket ujian aktif');
      }

      setActivePackage({ id: activePkg.id, name: activePkg.name });

      // Fetch questions from the active package
      const { data: dbQuestions, error: qError } = await supabase
        .from('questions')
        .select('*')
        .eq('package_id', activePkg.id)
        .order('question_number', { ascending: true });

      if (qError) throw qError;

      if (!dbQuestions || dbQuestions.length === 0) {
        throw new Error(`Paket "${activePkg.name}" tidak memiliki soal`);
      }

      // Transform to app Question format
      const transformedQuestions = dbQuestions.map(transformQuestion);
      setQuestions(transformedQuestions);
      
      console.log(`[useActivePackageQuestions] Loaded ${transformedQuestions.length} questions from "${activePkg.name}"`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gagal memuat soal ujian';
      console.error('[useActivePackageQuestions] Error:', message);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActivePackageQuestions();
  }, [fetchActivePackageQuestions]);

  return {
    questions,
    isLoading,
    error,
    activePackage,
    refetch: fetchActivePackageQuestions,
  };
};
