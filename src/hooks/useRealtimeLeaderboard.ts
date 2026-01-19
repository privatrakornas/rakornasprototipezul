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
  device_fingerprint?: string;
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

// Store profile name map globally for realtime updates
let profileNameMapCache = new Map<string, string>();

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
    console.log('[Leaderboard] Starting hybrid fetch...');
    
    try {
      // === QUERY 1: Fetch from exam_sessions (new data) ===
      // NOTE: exam_sessions does NOT have 'name' column!
      // We need to join with profiles table using device_fingerprint
      // IMPORTANT: Only fetch 'ongoing' or 'finished' status - exclude abandoned/disqualified
      const { data: newSessions, error: sessionsError } = await supabase
        .from('exam_sessions')
        .select('*')
        .in('status', ['ongoing', 'finished']);

      if (sessionsError) {
        console.error('[Leaderboard] Error fetching sessions:', sessionsError);
      }
      console.log('[Leaderboard] Sessions fetched:', newSessions?.length || 0);

      // === QUERY 1B: Fetch profiles to get names for sessions ===
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('device_fingerprint, name');

      if (profilesError) {
        console.error('[Leaderboard] Error fetching profiles:', profilesError);
      }
      console.log('[Leaderboard] Profiles fetched:', profiles?.length || 0);

      // Create a lookup map: device_fingerprint -> name
      const profileNameMap = new Map<string, string>();
      (profiles || []).forEach((p: any) => {
        if (p.device_fingerprint && p.name) {
          profileNameMap.set(p.device_fingerprint, p.name);
        }
      });
      // Update cache for realtime updates
      profileNameMapCache = profileNameMap;

      // === QUERY 2: Fetch from exam_results (old/legacy data) ===
      // IMPORTANT: direct SELECT on exam_results is blocked by RLS.
      // Use the security-definer RPC instead.
      const { data: oldResults, error: resultsError } = await supabase
        .rpc('get_leaderboard', {
          page_limit: 500,
          page_offset: 0,
        });

      if (resultsError) {
        console.error('[Leaderboard] Error fetching results:', resultsError);
      }
      console.log('[Leaderboard] Results fetched:', oldResults?.length || 0);

      // === MAPPING: Sessions to LeaderboardEntry ===
      // Get name from profiles using device_fingerprint lookup
      const mappedSessions: LeaderboardEntry[] = (newSessions || []).map((s: any) => {
        // exam_sessions mungkin TIDAK punya kolom name (tergantung skema).
        // Jadi: pakai name jika ada, kalau tidak ambil dari profiles map, terakhir fallback ke device_fingerprint.
        const fallbackName = s.device_fingerprint
          ? `Peserta (${String(s.device_fingerprint).slice(0, 8)})`
          : 'Peserta (Tanpa Nama)';

        const nameSafe = (s.name as string | undefined) || profileNameMap.get(s.device_fingerprint) || fallbackName;

        return {
          id: s.id,
          name: nameSafe,
          twk_score: s.twk_score || 0,
          tiu_score: s.tiu_score || 0,
          tkp_score: s.tkp_score || 0,
          total_score: s.total_score || 0,
          duration_minutes: s.duration_minutes,
          created_at: s.created_at,
          status: (s.status === 'ongoing' ? 'ongoing' : 'finished') as LeaderboardEntry['status'],
          started_at: s.started_at,
          answered_count: s.answered_count || 0,
          total_questions: s.total_questions || TOTAL_QUESTIONS,
          device_fingerprint: s.device_fingerprint,
        };
      });

      // === MAPPING: Legacy Results to LeaderboardEntry (CRITICAL!) ===
      // exam_results HAS name column directly
      const mappedOldData: LeaderboardEntry[] = (oldResults || []).map((item: any) => ({
        id: `legacy-${item.id}`, // Prefix to avoid ID collision
        name: item.name || 'Unknown', // Name is directly available in exam_results
        twk_score: item.twk_score || 0,
        tiu_score: item.tiu_score || 0,
        tkp_score: item.tkp_score || 0,
        total_score: item.total_score || 0,
        duration_minutes: item.duration_minutes,
        created_at: item.created_at || item.finished_at,
        status: 'finished' as LeaderboardEntry['status'], // All old results are finished
        started_at: item.started_at,
        answered_count: TOTAL_QUESTIONS, // Assume all answered
        total_questions: TOTAL_QUESTIONS,
        device_fingerprint: item.device_fingerprint,
      }));

      console.log('[Leaderboard] Mapped sessions:', mappedSessions.length);
      console.log('[Leaderboard] Mapped old data:', mappedOldData.length);

      // === MERGE & DEDUPLICATE ===
      // Use Map with key = lowercase name + total_score to avoid duplicates
      const entriesMap = new Map<string, LeaderboardEntry>();

      // Add NEW sessions first (they take priority)
      mappedSessions.forEach(entry => {
        const key = `${entry.name.toLowerCase().trim()}_${entry.total_score}`;
        entriesMap.set(key, entry);
      });

      // Add OLD results only if no duplicate exists
      mappedOldData.forEach(entry => {
        const key = `${entry.name.toLowerCase().trim()}_${entry.total_score}`;
        if (!entriesMap.has(key)) {
          entriesMap.set(key, entry);
        }
      });

      // Convert map back to array
      const allEntries = Array.from(entriesMap.values());
      console.log('[Leaderboard] After dedup:', allEntries.length, 'unique entries');

      // Sort by priority
      allEntries.sort(sortByPriority);

      // Update score cache
      allEntries.forEach(entry => {
        lastSortedScoresRef.current.set(entry.id, entry.total_score);
      });

      // Log some sample entries for debugging
      console.log('[Leaderboard] Sample entries:', allEntries.slice(0, 5).map(e => ({
        name: e.name,
        score: e.total_score,
        id: e.id.substring(0, 10)
      })));

      setData(allEntries);
    } catch (error) {
      console.error('[Leaderboard] Fetch error:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle realtime updates - optimized to update only affected entries
  const handleRealtimeChange = useCallback((payload: any) => {
    const { eventType, new: newRecord, old: oldRecord } = payload;
    
    console.log(`[Leaderboard Realtime] ${eventType}:`, newRecord?.id, 'status:', newRecord?.status);
    
    setData(prevData => {
      let updatedData = [...prevData];
      let shouldSort = false;
      
      if (eventType === 'INSERT') {
        // CRITICAL: Only add if status is 'ongoing' - ignore abandoned/disqualified from the start
        if (newRecord.status === 'abandoned' || newRecord.status === 'disqualified') {
          console.log(`[Leaderboard Realtime] Ignoring INSERT with status: ${newRecord.status}`);
          return prevData;
        }
        
        // Check if entry already exists (avoid duplicates)
        const exists = updatedData.some(e => e.id === newRecord.id);
        if (!exists) {
          // For INSERT from exam_sessions, get name from profile cache
          // since exam_sessions doesn't have name column
          const nameFromCache = newRecord.device_fingerprint 
            ? profileNameMapCache.get(newRecord.device_fingerprint) 
            : null;
          
          const newEntry: LeaderboardEntry = {
            id: newRecord.id,
            name: nameFromCache || 'Loading...', // Use cache or placeholder
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
            device_fingerprint: newRecord.device_fingerprint,
          };
          
          // Fetch name from profiles if not in cache
          if (!nameFromCache && newRecord.device_fingerprint) {
            supabase
              .from('profiles')
              .select('name')
              .eq('device_fingerprint', newRecord.device_fingerprint)
              .single()
              .then(({ data: profile }) => {
                if (profile?.name) {
                  // Update cache
                  profileNameMapCache.set(newRecord.device_fingerprint, profile.name);
                  // Update state
                  setData(prev => prev.map(e => 
                    e.id === newRecord.id ? { ...e, name: profile.name } : e
                  ));
                }
              });
          }
          
          updatedData.push(newEntry);
          shouldSort = true;
        }
      } else if (eventType === 'UPDATE') {
        const idx = updatedData.findIndex(e => e.id === newRecord.id);

        // CRITICAL: Remove IMMEDIATELY if status changed to abandoned/disqualified
        // This ensures Live Score table updates instantly when user is kicked out
        if (newRecord.status === 'disqualified' || newRecord.status === 'abandoned') {
          console.log(`[Leaderboard Realtime] REMOVING entry due to status: ${newRecord.status}`, newRecord.id);
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
            const nameFromCache = newRecord.device_fingerprint 
              ? profileNameMapCache.get(newRecord.device_fingerprint) 
              : null;
            
            const newEntry: LeaderboardEntry = {
              id: newRecord.id,
              name: nameFromCache || 'Loading...',
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
              device_fingerprint: newRecord.device_fingerprint,
            };
            
            // Fetch name if not in cache
            if (!nameFromCache && newRecord.device_fingerprint) {
              supabase
                .from('profiles')
                .select('name')
                .eq('device_fingerprint', newRecord.device_fingerprint)
                .single()
                .then(({ data: profile }) => {
                  if (profile?.name) {
                    profileNameMapCache.set(newRecord.device_fingerprint, profile.name);
                    setData(prev => prev.map(e => 
                      e.id === newRecord.id ? { ...e, name: profile.name } : e
                    ));
                  }
                });
            }
            
            updatedData.push(newEntry);
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
  }, [sortDataIfNeeded]);

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
