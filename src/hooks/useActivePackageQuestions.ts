import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Question } from '@/data/questions';

/**
 * Hook to fetch questions from the active exam package in the database.
 * Falls back to hardcoded questions if no active package is found or on error.
 */
export const useActivePackageQuestions = () => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activePackageName, setActivePackageName] = useState<string | null>(null);

  useEffect(() => {
    const fetchActivePackageQuestions = async () => {
      try {
        // 1. Find the active package (is_active = true, prefer is_default if multiple)
        const { data: packages, error: pkgError } = await supabase
          .from('exam_packages')
          .select('id, name')
          .eq('is_active', true)
          .order('is_default', { ascending: false })
          .limit(1);

        if (pkgError) throw pkgError;

        if (!packages || packages.length === 0) {
          // No active package - fall back to hardcoded questions
          console.log('[ActivePackage] No active package found, using hardcoded questions');
          const { questions: fallbackQuestions } = await import('@/data/questions');
          setQuestions(fallbackQuestions);
          setActivePackageName('Default (Hardcoded)');
          setIsLoading(false);
          return;
        }

        const activePackage = packages[0];
        setActivePackageName(activePackage.name);
        console.log(`[ActivePackage] Using package: ${activePackage.name} (${activePackage.id})`);

        // 2. Fetch all questions for this package
        const { data: dbQuestions, error: qError } = await supabase
          .from('questions')
          .select('*')
          .eq('package_id', activePackage.id)
          .order('category')
          .order('question_number');

        if (qError) throw qError;

        if (!dbQuestions || dbQuestions.length === 0) {
          console.log('[ActivePackage] Active package has no questions, using hardcoded questions');
          const { questions: fallbackQuestions } = await import('@/data/questions');
          setQuestions(fallbackQuestions);
          setActivePackageName('Default (Hardcoded)');
          setIsLoading(false);
          return;
        }

        // 3. Transform DB questions to Question interface
        const transformed: Question[] = dbQuestions.map((q) => {
          const options = [
            { key: 'A', text: q.option_a, ...(q.category === 'TKP' ? { score: q.points_a ?? 0 } : {}) },
            { key: 'B', text: q.option_b, ...(q.category === 'TKP' ? { score: q.points_b ?? 0 } : {}) },
            { key: 'C', text: q.option_c, ...(q.category === 'TKP' ? { score: q.points_c ?? 0 } : {}) },
            { key: 'D', text: q.option_d, ...(q.category === 'TKP' ? { score: q.points_d ?? 0 } : {}) },
            { key: 'E', text: q.option_e, ...(q.category === 'TKP' ? { score: q.points_e ?? 0 } : {}) },
          ];

          return {
            id: q.question_number,
            category: q.category as 'TWK' | 'TIU' | 'TKP',
            code: q.category,
            text: q.question_text,
            options,
            correctAnswer: q.correct_answer ?? undefined,
            explanation: q.explanation ?? '',
          };
        });

        console.log(`[ActivePackage] Loaded ${transformed.length} questions from DB`);
        setQuestions(transformed);
      } catch (err) {
        console.error('[ActivePackage] Error fetching questions, falling back:', err);
        setError(String(err));
        // Fallback to hardcoded questions on any error
        const { questions: fallbackQuestions } = await import('@/data/questions');
        setQuestions(fallbackQuestions);
        setActivePackageName('Default (Hardcoded)');
      } finally {
        setIsLoading(false);
      }
    };

    fetchActivePackageQuestions();
  }, []);

  return { questions, isLoading, error, activePackageName };
};
