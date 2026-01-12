import { useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { questions } from '@/data/questions';

const TOTAL_QUESTIONS = 110;

interface ScoreUpdate {
  twk_score: number;
  tiu_score: number;
  tkp_score: number;
  total_score: number;
  answered_count: number;
}

// Calculate scores based on current answers
const calculateScores = (answers: Record<number, string>): ScoreUpdate => {
  let twk = 0, tiu = 0, tkp = 0;
  let answeredCount = 0;

  questions.forEach(q => {
    const userAnswer = answers[q.id];
    if (!userAnswer) return;
    
    answeredCount++;

    if (q.category === 'TKP') {
      const option = q.options.find(o => o.key === userAnswer);
      if (option && option.score !== undefined) {
        tkp += option.score;
      }
    } else {
      if (userAnswer === q.correctAnswer) {
        if (q.category === 'TWK') twk += 5;
        else if (q.category === 'TIU') tiu += 5;
      }
    }
  });

  return {
    twk_score: twk,
    tiu_score: tiu,
    tkp_score: tkp,
    total_score: twk + tiu + tkp,
    answered_count: answeredCount,
  };
};

export const useExamSession = () => {
  const sessionIdRef = useRef<string | null>(null);
  const updateQueueRef = useRef<ScoreUpdate | null>(null);
  const isUpdatingRef = useRef(false);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Create session when exam starts
  const createSession = useCallback(async (name: string, deviceFingerprint: string, startedAt: string) => {
    try {
      const { data, error } = await (supabase
        .from('exam_sessions' as any)
        .insert({
          name,
          device_fingerprint: deviceFingerprint,
          started_at: startedAt,
          status: 'ongoing',
          answered_count: 0,
          total_questions: TOTAL_QUESTIONS,
        })
        .select('id')
        .single() as any);

      if (error) {
        console.error('Failed to create exam session:', error);
        return null;
      }

      sessionIdRef.current = data.id;
      sessionStorage.setItem('examSessionId', data.id);
      return data.id;
    } catch (err) {
      console.error('Error creating session:', err);
      return null;
    }
  }, []);

  // Save individual answer to user_answers table
  const saveUserAnswer = useCallback(async (
    questionId: number,
    category: string,
    selectedAnswer: string,
    isCorrect: boolean,
    pointsEarned: number
  ) => {
    const sessionId = sessionIdRef.current || sessionStorage.getItem('examSessionId');
    if (!sessionId) return;

    try {
      // Upsert the answer (insert or update if exists)
      const { error } = await (supabase
        .from('user_answers' as any)
        .upsert({
          session_id: sessionId,
          question_number: questionId,
          category: category,
          selected_answer: selectedAnswer,
          is_correct: isCorrect,
          points_earned: pointsEarned,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'session_id,question_number',
        }) as any);

      if (error) {
        console.error('Failed to save user answer:', error);
      }
    } catch (err) {
      console.error('Error saving user answer:', err);
    }
  }, []);

  // Debounced update function to prevent too many requests
  const processUpdate = useCallback(async () => {
    if (!sessionIdRef.current || !updateQueueRef.current || isUpdatingRef.current) {
      return;
    }

    isUpdatingRef.current = true;
    const update = updateQueueRef.current;
    updateQueueRef.current = null;

    try {
      const { error } = await (supabase
        .from('exam_sessions' as any)
        .update({
          twk_score: update.twk_score,
          tiu_score: update.tiu_score,
          tkp_score: update.tkp_score,
          total_score: update.total_score,
          answered_count: update.answered_count,
        })
        .eq('id', sessionIdRef.current) as any);

      if (error) {
        console.error('Failed to update session:', error);
      }
    } catch (err) {
      console.error('Error updating session:', err);
    } finally {
      isUpdatingRef.current = false;
      
      // Process any queued updates
      if (updateQueueRef.current) {
        setTimeout(processUpdate, 100);
      }
    }
  }, []);

  // Update scores with debouncing (500ms delay to batch updates)
  const updateScores = useCallback((answers: Record<number, string>, lastAnsweredQuestion?: { id: number; category: string; answer: string }) => {
    const scores = calculateScores(answers);
    updateQueueRef.current = scores;

    // Save individual answer to user_answers table
    if (lastAnsweredQuestion) {
      const q = questions.find(q => q.id === lastAnsweredQuestion.id);
      if (q) {
        let isCorrect = false;
        let pointsEarned = 0;

        if (q.category === 'TKP') {
          const option = q.options.find(o => o.key === lastAnsweredQuestion.answer);
          pointsEarned = option?.score || 0;
          isCorrect = pointsEarned >= 4; // Consider 4-5 as "correct" for TKP
        } else {
          isCorrect = lastAnsweredQuestion.answer === q.correctAnswer;
          pointsEarned = isCorrect ? 5 : 0;
        }

        saveUserAnswer(
          lastAnsweredQuestion.id,
          lastAnsweredQuestion.category,
          lastAnsweredQuestion.answer,
          isCorrect,
          pointsEarned
        );
      }
    }

    // Clear existing timeout
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }

    // Debounce updates to every 500ms
    updateTimeoutRef.current = setTimeout(processUpdate, 500);
  }, [processUpdate, saveUserAnswer]);

  // Finish session when exam is submitted
  const finishSession = useCallback(async (durationMinutes: number) => {
    const sessionId = sessionIdRef.current || sessionStorage.getItem('examSessionId');
    if (!sessionId) return;

    try {
      const { error } = await (supabase
        .from('exam_sessions' as any)
        .update({
          status: 'finished',
          finished_at: new Date().toISOString(),
          duration_minutes: durationMinutes,
        })
        .eq('id', sessionId) as any);

      if (error) {
        console.error('Failed to finish session:', error);
      }
    } catch (err) {
      console.error('Error finishing session:', err);
    }

    // Clear the session
    sessionIdRef.current = null;
    sessionStorage.removeItem('examSessionId');
  }, []);

  // Disqualify session (for anti-cheat)
  const disqualifySession = useCallback(async () => {
    const sessionId = sessionIdRef.current || sessionStorage.getItem('examSessionId');
    if (!sessionId) return;

    try {
      const { error } = await (supabase
        .from('exam_sessions' as any)
        .update({
          status: 'disqualified',
          finished_at: new Date().toISOString(),
        })
        .eq('id', sessionId) as any);

      if (error) {
        console.error('Failed to disqualify session:', error);
      }
    } catch (err) {
      console.error('Error disqualifying session:', err);
    }

    // Clear the session
    sessionIdRef.current = null;
    sessionStorage.removeItem('examSessionId');
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    // Check for existing session
    const existingSessionId = sessionStorage.getItem('examSessionId');
    if (existingSessionId) {
      sessionIdRef.current = existingSessionId;
    }

    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, []);

  return {
    createSession,
    updateScores,
    finishSession,
    disqualifySession,
    sessionId: sessionIdRef.current,
  };
};
