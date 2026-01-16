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
  status: 'ongoing' | 'finished' | 'disqualified' | 'abandoned';
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

  // HYBRID FETCHING: Fetch from exam_sessions (new) and exam_results (old)
  const fetchAllData = useCallback(async () => {
    try {
      // === QUERY 1: Fetch from exam_sessions (new data) ===
      // Get all sessions except explicitly abandoned/disqualified
      const { data: sessions, error: sessionsError } = await supabase
        .from('exam_sessions')
        .select('*')
        .not('status', 'in', '("abandoned","disqualified")');

      if (sessionsError) {
        console.error('Error fetching sessions:', sessionsError);
      }

      // Map exam_sessions to LeaderboardEntry format
      const sessionsAsEntries: LeaderboardEntry[] = (sessions || []).map((s: any) => ({
        id: s.id,
        name: s.name,
        twk_score: s.twk_score || 0,
        tiu_score: s.tiu_score || 0,
        tkp_score: s.tkp_score || 0,
        total_score: s.total_score || 0,
        duration_minutes: s.duration_minutes,
        created_at: s.created_at,
        // Treat NULL or unknown status as 'finished' for old data display
        status: (s.status === 'ongoing' ? 'ongoing' : 'finished') as LeaderboardEntry['status'],
        started_at: s.started_at,
        answered_count: s.answered_count || 0,
        total_questions: s.total_questions || TOTAL_QUESTIONS,
        source: 'sessions' as const, // Track data source for dedup
      }));

      // === QUERY 2: Fetch from exam_results (old/legacy data) ===
      const { data: results, error: resultsError } = await supabase
        .from('exam_results')
        .select('*');

      if (resultsError) {
        console.error('Error fetching results:', resultsError);
      }

      // Map exam_results to LeaderboardEntry format (same structure)
      const resultsAsEntries: LeaderboardEntry[] = (results || []).map((r: any) => ({
        id: `results-${r.id}`, // Prefix to avoid ID collision
        name: r.name,
        twk_score: r.twk_score || 0,
        tiu_score: r.tiu_score || 0,
        tkp_score: r.tkp_score || 0,
        total_score: r.total_score || 0,
        duration_minutes: r.duration_minutes,
        created_at: r.created_at || r.finished_at,
        status: 'finished' as LeaderboardEntry['status'], // All results are finished
        started_at: r.started_at,
        answered_count: TOTAL_QUESTIONS, // Assume all answered
        total_questions: TOTAL_QUESTIONS,
        source: 'results' as const,
      }));

      // === MERGE & DEDUPLICATE ===
      // Create a map for deduplication: key = name + total_score
      const entriesMap = new Map<string, LeaderboardEntry>();

      // Add sessions first (they take priority)
      sessionsAsEntries.forEach(entry => {
        const key = `${entry.name.toLowerCase().trim()}_${entry.total_score}`;
        entriesMap.set(key, entry);
      });

      // Add results only if no duplicate exists
      resultsAsEntries.forEach(entry => {
        const key = `${entry.name.toLowerCase().trim()}_${entry.total_score}`;
        if (!entriesMap.has(key)) {
          entriesMap.set(key, entry);
        }
      });

      // Convert map back to array
      const allEntries = Array.from(entriesMap.values());

      // Sort by priority
      allEntries.sort(sortByPriority);

      // Update score cache
      allEntries.forEach(entry => {
        lastSortedScoresRef.current.set(entry.id, entry.total_score);
      });

      console.log(`Hybrid fetch complete: ${sessionsAsEntries.length} sessions + ${resultsAsEntries.length} results = ${allEntries.length} unique entries`);

      setData(allEntries);
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

         // Remove immediately if moved out of leaderboard views
         if (newRecord.status === 'disqualified' || newRecord.status === 'abandoned') {
           if (idx !== -1) {
             updatedData = updatedData.filter(e => e.id !== newRecord.id);
           }
           return updatedData;
         }

         if (idx !== -1) {
           const oldScore = updatedData[idx].total_score;
           updatedData[idx] = {
             ...updatedData[idx],
             twk_score: newRecord.twk_score ?? updatedData[idx].twk_score,
             tiu_score: newRecord.tiu_score ?? updatedData[idx].tiu_score,
             tkp_score: newRecord.tkp_score ?? updatedData[idx].tkp_score,
             total_score: newRecord.total_score ?? updatedData[idx].total_score,
             status: (newRecord.status || updatedData[idx].status) as LeaderboardEntry['status'],
             started_at: newRecord.started_at ?? updatedData[idx].started_at,
             answered_count: newRecord.answered_count ?? updatedData[idx].answered_count,
             total_questions: newRecord.total_questions ?? updatedData[idx].total_questions,
             duration_minutes: newRecord.duration_minutes,
             created_at: newRecord.created_at ?? updatedData[idx].created_at,
           };

           if (oldScore !== (newRecord.total_score ?? oldScore)) {
             shouldSort = true;
           }
         } else {
           // Entry not found yet; add it if it's relevant
           if (newRecord.status === 'ongoing' || newRecord.status === 'finished') {
             updatedData.push({
               id: newRecord.id,
               name: newRecord.name,
               twk_score: newRecord.twk_score || 0,
               tiu_score: newRecord.tiu_score || 0,
               tkp_score: newRecord.tkp_score || 0,
               total_score: newRecord.total_score || 0,
               duration_minutes: newRecord.duration_minutes,
               created_at: newRecord.created_at,
               status: (newRecord.status || 'ongoing') as LeaderboardEntry['status'],
               started_at: newRecord.started_at,
               answered_count: newRecord.answered_count || 0,
               total_questions: newRecord.total_questions || TOTAL_QUESTIONS,
             });
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

  // Handle user_answers changes - recalculate scores for specific session
  const handleUserAnswerChange = useCallback(async (payload: any) => {
    const { new: newRecord } = payload;
    if (!newRecord?.session_id) return;

    // Fetch updated session data for this specific session
    const { data: session, error } = await (supabase
      .from('exam_sessions' as any)
      .select('*')
      .eq('id', newRecord.session_id)
      .single() as any);

    if (error || !session) return;

    // Update the specific entry in our data
    setData(prevData => {
      const idx = prevData.findIndex(e => e.id === session.id);
      if (idx === -1) return prevData;

      const oldScore = prevData[idx].total_score;
      const updatedData = [...prevData];
      updatedData[idx] = {
        ...updatedData[idx],
        twk_score: session.twk_score || 0,
        tiu_score: session.tiu_score || 0,
        tkp_score: session.tkp_score || 0,
        total_score: session.total_score || 0,
        answered_count: session.answered_count || 0,
      };

      // Sort if score changed
      if (oldScore !== session.total_score) {
        sortDataIfNeeded(updatedData);
      }

      return updatedData;
    });
  }, [sortDataIfNeeded]);

  // Setup realtime subscription
  useEffect(() => {
    fetchAllData();

    // Subscribe to exam_sessions, exam_results, and user_answers changes
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
          event: '*',
          schema: 'public',
          table: 'user_answers',
        },
        (payload) => handleUserAnswerChange(payload)
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
  }, [fetchAllData, handleRealtimeChange, handleUserAnswerChange]);

  return {
    data,
    isLoading,
    refetch: fetchAllData,
    PASSING_GRADE,
    TOTAL_EXAM_TIME,
    TOTAL_QUESTIONS,
  };
};
