import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface DailyTrendData {
  date: string;
  total: number;
  lulus: number;
  tidakLulus: number;
}

interface ScoreStats {
  avgTwk: number;
  avgTiu: number;
  avgTkp: number;
  avgTotal: number;
  minTotal: number;
  maxTotal: number;
}

interface PassingStats {
  totalFinished: number;
  totalLulus: number;
  totalTidakLulus: number;
  passRate: number;
}

interface AdminStats {
  scoreStats: ScoreStats;
  passingStats: PassingStats;
  dailyTrends: DailyTrendData[];
  isLoading: boolean;
}

// Passing score thresholds
const PASSING_TWK = 65;
const PASSING_TIU = 80;
const PASSING_TKP = 166;

export const useAdminStats = (isAuthenticated: boolean): AdminStats => {
  const [finishedSessions, setFinishedSessions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchFinishedSessions = useCallback(async () => {
    if (!isAuthenticated) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('exam_sessions')
        .select('id, twk_score, tiu_score, tkp_score, total_score, finished_at, status, created_at')
        .eq('status', 'finished')
        .is('deleted_at', null)
        .order('finished_at', { ascending: false });

      if (error) {
        console.error('Error fetching stats:', error);
        return;
      }

      setFinishedSessions(data || []);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchFinishedSessions();
  }, [fetchFinishedSessions]);

  const scoreStats = useMemo<ScoreStats>(() => {
    if (finishedSessions.length === 0) {
      return {
        avgTwk: 0,
        avgTiu: 0,
        avgTkp: 0,
        avgTotal: 0,
        minTotal: 0,
        maxTotal: 0,
      };
    }

    const totalTwk = finishedSessions.reduce((sum, s) => sum + s.twk_score, 0);
    const totalTiu = finishedSessions.reduce((sum, s) => sum + s.tiu_score, 0);
    const totalTkp = finishedSessions.reduce((sum, s) => sum + s.tkp_score, 0);
    const totalScores = finishedSessions.map(s => s.total_score);

    return {
      avgTwk: Math.round(totalTwk / finishedSessions.length),
      avgTiu: Math.round(totalTiu / finishedSessions.length),
      avgTkp: Math.round(totalTkp / finishedSessions.length),
      avgTotal: Math.round((totalTwk + totalTiu + totalTkp) / finishedSessions.length),
      minTotal: Math.min(...totalScores),
      maxTotal: Math.max(...totalScores),
    };
  }, [finishedSessions]);

  const passingStats = useMemo<PassingStats>(() => {
    const totalFinished = finishedSessions.length;
    
    const lulusList = finishedSessions.filter(
      s => s.twk_score >= PASSING_TWK && s.tiu_score >= PASSING_TIU && s.tkp_score >= PASSING_TKP
    );
    
    const totalLulus = lulusList.length;
    const totalTidakLulus = totalFinished - totalLulus;
    const passRate = totalFinished > 0 ? Math.round((totalLulus / totalFinished) * 100) : 0;

    return {
      totalFinished,
      totalLulus,
      totalTidakLulus,
      passRate,
    };
  }, [finishedSessions]);

  const dailyTrends = useMemo<DailyTrendData[]>(() => {
    if (finishedSessions.length === 0) return [];

    // Group by date
    const dateMap = new Map<string, { total: number; lulus: number; tidakLulus: number }>();

    finishedSessions.forEach(session => {
      const dateStr = session.finished_at 
        ? new Date(session.finished_at).toISOString().split('T')[0]
        : new Date(session.created_at).toISOString().split('T')[0];
      
      const isLulus = session.twk_score >= PASSING_TWK && 
                      session.tiu_score >= PASSING_TIU && 
                      session.tkp_score >= PASSING_TKP;

      const existing = dateMap.get(dateStr) || { total: 0, lulus: 0, tidakLulus: 0 };
      existing.total += 1;
      if (isLulus) {
        existing.lulus += 1;
      } else {
        existing.tidakLulus += 1;
      }
      dateMap.set(dateStr, existing);
    });

    // Convert to array and sort by date
    const result: DailyTrendData[] = [];
    dateMap.forEach((value, date) => {
      result.push({
        date,
        total: value.total,
        lulus: value.lulus,
        tidakLulus: value.tidakLulus,
      });
    });

    return result.sort((a, b) => a.date.localeCompare(b.date)).slice(-14); // Last 14 days
  }, [finishedSessions]);

  return {
    scoreStats,
    passingStats,
    dailyTrends,
    isLoading,
  };
};
