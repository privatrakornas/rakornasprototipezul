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

interface ScoreDistribution {
  range: string;
  count: number;
  percentage: number;
}

interface CategoryDistribution {
  twk: ScoreDistribution[];
  tiu: ScoreDistribution[];
  tkp: ScoreDistribution[];
  total: ScoreDistribution[];
}

interface AdminStats {
  scoreStats: ScoreStats;
  passingStats: PassingStats;
  dailyTrends: DailyTrendData[];
  scoreDistribution: CategoryDistribution;
  isLoading: boolean;
}

// Passing score thresholds
const PASSING_TWK = 65;
const PASSING_TIU = 80;
const PASSING_TKP = 166;

// Score distribution bins
const TOTAL_SCORE_BINS = [
  { min: 0, max: 199, label: '0-199' },
  { min: 200, max: 249, label: '200-249' },
  { min: 250, max: 299, label: '250-299' },
  { min: 300, max: 349, label: '300-349' },
  { min: 350, max: 399, label: '350-399' },
  { min: 400, max: 449, label: '400-449' },
  { min: 450, max: 500, label: '450-500' },
];

const TWK_BINS = [
  { min: 0, max: 39, label: '0-39' },
  { min: 40, max: 54, label: '40-54' },
  { min: 55, max: 64, label: '55-64' },
  { min: 65, max: 79, label: '65-79' },
  { min: 80, max: 100, label: '80-100' },
];

const TIU_BINS = [
  { min: 0, max: 49, label: '0-49' },
  { min: 50, max: 69, label: '50-69' },
  { min: 70, max: 79, label: '70-79' },
  { min: 80, max: 99, label: '80-99' },
  { min: 100, max: 150, label: '100+' },
];

const TKP_BINS = [
  { min: 0, max: 125, label: '0-125' },
  { min: 126, max: 150, label: '126-150' },
  { min: 151, max: 165, label: '151-165' },
  { min: 166, max: 185, label: '166-185' },
  { min: 186, max: 225, label: '186+' },
];

const calculateDistribution = (
  sessions: any[],
  scoreKey: string,
  bins: { min: number; max: number; label: string }[]
): ScoreDistribution[] => {
  const total = sessions.length;
  
  return bins.map(bin => {
    const count = sessions.filter(s => {
      const score = s[scoreKey];
      return score >= bin.min && score <= bin.max;
    }).length;
    
    return {
      range: bin.label,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    };
  });
};

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

    const result: DailyTrendData[] = [];
    dateMap.forEach((value, date) => {
      result.push({
        date,
        total: value.total,
        lulus: value.lulus,
        tidakLulus: value.tidakLulus,
      });
    });

    return result.sort((a, b) => a.date.localeCompare(b.date)).slice(-14);
  }, [finishedSessions]);

  const scoreDistribution = useMemo<CategoryDistribution>(() => {
    return {
      twk: calculateDistribution(finishedSessions, 'twk_score', TWK_BINS),
      tiu: calculateDistribution(finishedSessions, 'tiu_score', TIU_BINS),
      tkp: calculateDistribution(finishedSessions, 'tkp_score', TKP_BINS),
      total: calculateDistribution(finishedSessions, 'total_score', TOTAL_SCORE_BINS),
    };
  }, [finishedSessions]);

  return {
    scoreStats,
    passingStats,
    dailyTrends,
    scoreDistribution,
    isLoading,
  };
};
