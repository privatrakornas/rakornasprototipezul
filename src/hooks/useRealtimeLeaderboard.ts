import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Passing grade constants
const PASSING_GRADE = {
  TWK: 65,
  TIU: 80,
  TKP: 166,
};

// Total exam time in minutes
const TOTAL_EXAM_TIME = 100;
const TOTAL_QUESTIONS = 110;

export interface LeaderboardEntry {
  id: string;
  name: string;
  twk_score: number;
  tiu_score: number;
  tkp_score: number;
  total_score: number;
  duration_minutes?: number | null;
  created_at?: string;
  // Real-time fields
  status: 'ongoing' | 'finished' | 'disqualified';
  started_at?: string | null;
  answered_count?: number;
  total_questions?: number;
}

// Check if a participant passes all subjects
export const isLulus = (entry: LeaderboardEntry): boolean => {
  return (
    entry.twk_score >= PASSING_GRADE.TWK &&
    entry.tiu_score >= PASSING_GRADE.TIU &&
    entry.tkp_score >= PASSING_GRADE.TKP
  );
};

// 5-level sorting comparator
const sortByPriority = (a: LeaderboardEntry, b: LeaderboardEntry): number => {
  // Priority 0: Ongoing exams at top (to see live progress)
  if (a.status !== b.status) {
    if (a.status === 'disqualified') return 1;
    if (b.status === 'disqualified') return -1;
    if (a.status === 'ongoing') return -1;
    if (b.status === 'ongoing') return 1;
  }

  // Priority 1: Pass status (LULUS first) - only for finished exams
  if (a.status === 'finished' && b.status === 'finished') {
    const aLulus = isLulus(a);
    const bLulus = isLulus(b);
    if (aLulus !== bLulus) {
      return aLulus ? -1 : 1;
    }
  }

  // Priority 2: Total score (highest first)
  if (b.total_score !== a.total_score) {
    return b.total_score - a.total_score;
  }

  // Priority 3: TKP score (highest first)
  if (b.tkp_score !== a.tkp_score) {
    return b.tkp_score - a.tkp_score;
  }

  // Priority 4: TIU score (highest first)
  if (b.tiu_score !== a.tiu_score) {
    return b.tiu_score - a.tiu_score;
  }

  // Priority 5: TWK score (highest first)
  return b.twk_score - a.twk_score;
};

export const useRealtimeLeaderboard = () => {
  const [data, setData] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const lastSortedScoresRef = useRef<Map<string, number>>(new Map());
  const sortTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sort data only when total_score changes (debounced)
  const sortDataIfNeeded = useCallback((newData: LeaderboardEntry[]) => {
    const needsSort = newData.some(entry => {
      const lastScore = lastSortedScoresRef.current.get(entry.id);
      return lastScore === undefined || lastScore !== entry.total_score;
    });

    if (needsSort) {
      // Clear existing timeout
      if (sortTimeoutRef.current) {
        clearTimeout(sortTimeoutRef.current);
      }

      // Debounce sorting to prevent constant re-sorting
      sortTimeoutRef.current = setTimeout(() => {
        setData(prev => {
          const sorted = [...prev].sort(sortByPriority);
          // Update score cache
          sorted.forEach(entry => {
            lastSortedScoresRef.current.set(entry.id, entry.total_score);
          });
          return sorted;
        });
      }, 300);
    }
  }, []);

  // Fetch all data - combines ongoing sessions and finished results
  const fetchAllData = useCallback(async () => {
    try {
      // Fetch ongoing sessions (exclude disqualified from view)
      const { data: sessions, error: sessionsError } = await (supabase
        .from('exam_sessions' as any)
        .select('*')
        .in('status', ['ongoing', 'finished']) as any);

      if (sessionsError) {
        console.error('Error fetching sessions:', sessionsError);
      }

      // Fetch finished results using the secure RPC
      const { data: results, error: resultsError } = await supabase
        .rpc('get_leaderboard');

      if (resultsError) {
        console.error('Error fetching leaderboard:', resultsError);
      }

      // Combine and format data
      const ongoingSessions: LeaderboardEntry[] = (sessions || [])
        .filter((s: any) => s.status === 'ongoing')
        .map((s: any) => ({
          id: s.id,
          name: s.name,
          twk_score: s.twk_score,
          tiu_score: s.tiu_score,
          tkp_score: s.tkp_score,
          total_score: s.total_score,
          duration_minutes: s.duration_minutes,
          created_at: s.created_at,
          status: 'ongoing' as const,
          started_at: s.started_at,
          answered_count: s.answered_count,
          total_questions: s.total_questions,
        }));

      const finishedResults: LeaderboardEntry[] = (results || [])
        .filter((entry: any) => !(entry.name === 'Mona Sartika' && entry.total_score === 544))
        .map((r: any) => ({
          id: r.id,
          name: r.name,
          twk_score: r.twk_score,
          tiu_score: r.tiu_score,
          tkp_score: r.tkp_score,
          total_score: r.total_score,
          duration_minutes: r.duration_minutes,
          created_at: r.created_at,
          status: 'finished' as const,
          started_at: r.started_at,
          answered_count: TOTAL_QUESTIONS,
          total_questions: TOTAL_QUESTIONS,
        }));

      // Combine and sort
      const combined = [...ongoingSessions, ...finishedResults];
      combined.sort(sortByPriority);
      
      // Update score cache
      combined.forEach(entry => {
        lastSortedScoresRef.current.set(entry.id, entry.total_score);
      });
      
      setData(combined);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle realtime updates - optimized to update only affected entries
  const handleRealtimeChange = useCallback((payload: any) => {
    const { eventType, new: newRecord, old: oldRecord } = payload;
    
    setData(prevData => {
      let updatedData = [...prevData];
      let shouldSort = false;
      
      if (eventType === 'INSERT') {
        // Check if entry already exists (avoid duplicates)
        const exists = updatedData.some(e => e.id === newRecord.id);
        if (!exists) {
          const newEntry: LeaderboardEntry = {
            id: newRecord.id,
            name: newRecord.name,
            twk_score: newRecord.twk_score || 0,
            tiu_score: newRecord.tiu_score || 0,
            tkp_score: newRecord.tkp_score || 0,
            total_score: newRecord.total_score || 0,
            duration_minutes: newRecord.duration_minutes,
            created_at: newRecord.created_at,
            status: newRecord.status || 'ongoing',
            started_at: newRecord.started_at,
            answered_count: newRecord.answered_count || 0,
            total_questions: newRecord.total_questions || TOTAL_QUESTIONS,
          };
          updatedData.push(newEntry);
          shouldSort = true;
        }
      } else if (eventType === 'UPDATE') {
        const idx = updatedData.findIndex(e => e.id === newRecord.id);
        
        // Handle disqualification - remove from list immediately
        if (newRecord.status === 'disqualified') {
          if (idx !== -1) {
            updatedData = updatedData.filter(e => e.id !== newRecord.id);
          }
          return updatedData;
        }
        
        // Handle status change to finished - update and refetch for final data
        if (newRecord.status === 'finished' && idx !== -1) {
          const oldScore = updatedData[idx].total_score;
          updatedData[idx] = {
            ...updatedData[idx],
            twk_score: newRecord.twk_score || 0,
            tiu_score: newRecord.tiu_score || 0,
            tkp_score: newRecord.tkp_score || 0,
            total_score: newRecord.total_score || 0,
            status: 'finished',
            duration_minutes: newRecord.duration_minutes,
            answered_count: TOTAL_QUESTIONS,
          };
          
          // Sort if score changed
          if (oldScore !== newRecord.total_score) {
            shouldSort = true;
          }
          
          // Also refetch to get accurate final data
          setTimeout(() => fetchAllData(), 500);
        } else if (idx !== -1) {
          // Regular update for ongoing exams
          const oldScore = updatedData[idx].total_score;
          updatedData[idx] = {
            ...updatedData[idx],
            twk_score: newRecord.twk_score || updatedData[idx].twk_score,
            tiu_score: newRecord.tiu_score || updatedData[idx].tiu_score,
            tkp_score: newRecord.tkp_score || updatedData[idx].tkp_score,
            total_score: newRecord.total_score || updatedData[idx].total_score,
            status: newRecord.status || updatedData[idx].status,
            answered_count: newRecord.answered_count ?? updatedData[idx].answered_count,
            duration_minutes: newRecord.duration_minutes,
          };
          
          // Only sort if total_score changed significantly
          if (oldScore !== (newRecord.total_score || updatedData[idx].total_score)) {
            shouldSort = true;
          }
        }
      } else if (eventType === 'DELETE') {
        // Remove deleted session immediately
        updatedData = updatedData.filter(e => e.id !== oldRecord.id);
      }
      
      // Debounced sorting only when needed
      if (shouldSort) {
        sortDataIfNeeded(updatedData);
        return updatedData; // Return unsorted, let debounced sort handle it
      }
      
      return updatedData;
    });
  }, [fetchAllData, sortDataIfNeeded]);

  // Setup realtime subscription
  useEffect(() => {
    fetchAllData();

    // Subscribe to exam_sessions changes
    const channel = supabase
      .channel('leaderboard-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'exam_sessions',
        },
        (payload) => handleRealtimeChange(payload)
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'exam_results',
        },
        () => {
          // Refetch when new result is inserted
          fetchAllData();
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      if (sortTimeoutRef.current) {
        clearTimeout(sortTimeoutRef.current);
      }
    };
  }, [fetchAllData, handleRealtimeChange]);

  return {
    data,
    isLoading,
    refetch: fetchAllData,
    PASSING_GRADE,
    TOTAL_EXAM_TIME,
    TOTAL_QUESTIONS,
  };
};
