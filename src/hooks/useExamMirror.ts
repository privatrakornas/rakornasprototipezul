import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { questions } from '@/data/questions';

export interface MirrorSession {
  id: string;
  name: string;
  status: string;
  started_at: string | null;
  finished_at: string | null;
  twk_score: number;
  tiu_score: number;
  tkp_score: number;
  total_score: number;
  answered_count: number;
  total_questions: number;
  duration_minutes: number | null;
  current_question_index: number; // Track participant's current question
}

export interface UserAnswer {
  question_number: number;
  selected_answer: string | null;
  points_earned: number | null;
  is_correct: boolean | null;
  answered_at: string;
}

export const useExamMirror = (sessionId: string | null) => {
  const [session, setSession] = useState<MirrorSession | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0); // 0-indexed for UI
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Fetch session data and answers
  const fetchSessionData = useCallback(async () => {
    if (!sessionId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      // Fetch session details
      const { data: sessionData, error: sessionError } = await supabase
        .from('exam_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (sessionError) {
        console.error('[ExamMirror] Error fetching session:', sessionError);
        setIsLoading(false);
        return;
      }

      // Get name from profiles if not in session
      let name = (sessionData as any).name || '';
      if (!name && sessionData.device_fingerprint) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('name')
          .eq('device_fingerprint', sessionData.device_fingerprint)
          .single();
        name = profile?.name || `Peserta (${sessionData.device_fingerprint.slice(0, 8)})`;
      }

      // Get current_question_index (1-indexed in DB, convert to 0-indexed)
      const dbQuestionIndex = (sessionData as any).current_question_index || 1;
      setCurrentQuestionIndex(dbQuestionIndex - 1);

      setSession({
        id: sessionData.id,
        name,
        status: sessionData.status,
        started_at: sessionData.started_at,
        finished_at: sessionData.finished_at,
        twk_score: sessionData.twk_score || 0,
        tiu_score: sessionData.tiu_score || 0,
        tkp_score: sessionData.tkp_score || 0,
        total_score: sessionData.total_score || 0,
        answered_count: sessionData.answered_count || 0,
        total_questions: sessionData.total_questions || 110,
        duration_minutes: sessionData.duration_minutes,
        current_question_index: dbQuestionIndex,
      });

      // Fetch all answers for this session
      const { data: answersData, error: answersError } = await supabase
        .from('user_answers')
        .select('*')
        .eq('session_id', sessionId);

      if (answersError) {
        console.error('[ExamMirror] Error fetching answers:', answersError);
      } else {
        const answersMap: Record<number, string> = {};
        (answersData || []).forEach((ans: any) => {
          if (ans.selected_answer) {
            answersMap[ans.question_number] = ans.selected_answer;
          }
        });
        setAnswers(answersMap);
      }
    } catch (err) {
      console.error('[ExamMirror] Fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  // Handle realtime answer updates
  const handleAnswerChange = useCallback((payload: any) => {
    const { new: newRecord } = payload;
    if (!newRecord || newRecord.session_id !== sessionId) return;

    console.log('[ExamMirror] Answer update:', newRecord.question_number, newRecord.selected_answer);

    setAnswers(prev => ({
      ...prev,
      [newRecord.question_number]: newRecord.selected_answer,
    }));
  }, [sessionId]);

  // Handle realtime session updates (including current_question_index)
  const handleSessionChange = useCallback((payload: any) => {
    const { new: newRecord } = payload;
    if (!newRecord || newRecord.id !== sessionId) return;

    // Check if question position changed
    if (newRecord.current_question_index !== undefined) {
      console.log('[ExamMirror] Question position update:', newRecord.current_question_index);
      setCurrentQuestionIndex(newRecord.current_question_index - 1); // Convert to 0-indexed
    }

    setSession(prev => prev ? {
      ...prev,
      status: newRecord.status || prev.status,
      twk_score: newRecord.twk_score ?? prev.twk_score,
      tiu_score: newRecord.tiu_score ?? prev.tiu_score,
      tkp_score: newRecord.tkp_score ?? prev.tkp_score,
      total_score: newRecord.total_score ?? prev.total_score,
      answered_count: newRecord.answered_count ?? prev.answered_count,
      finished_at: newRecord.finished_at ?? prev.finished_at,
      duration_minutes: newRecord.duration_minutes ?? prev.duration_minutes,
      current_question_index: newRecord.current_question_index ?? prev.current_question_index,
    } : null);
  }, [sessionId]);

  // Setup and cleanup
  useEffect(() => {
    if (!sessionId) return;

    // Fetch initial data
    fetchSessionData();

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`exam-mirror-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_answers',
          filter: `session_id=eq.${sessionId}`,
        },
        handleAnswerChange
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'exam_sessions',
          filter: `id=eq.${sessionId}`,
        },
        handleSessionChange
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [sessionId, fetchSessionData, handleAnswerChange, handleSessionChange]);

  return {
    session,
    answers,
    isLoading,
    questions,
    currentQuestionIndex, // Realtime synced question position (0-indexed)
    setCurrentQuestionIndex, // Allow manual override for review mode
    refetch: fetchSessionData,
  };
};
