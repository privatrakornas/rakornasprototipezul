import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trophy, Medal, Award, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

// Passing grade constants
const PASSING_GRADE = {
  TWK: 65,
  TIU: 80,
  TKP: 166,
};

interface LeaderboardEntry {
  id: string;
  name: string;
  twk_score: number;
  tiu_score: number;
  tkp_score: number;
  total_score: number;
  created_at?: string;
}

// Check if a participant passes all subjects
const isLulus = (entry: LeaderboardEntry): boolean => {
  return (
    entry.twk_score >= PASSING_GRADE.TWK &&
    entry.tiu_score >= PASSING_GRADE.TIU &&
    entry.tkp_score >= PASSING_GRADE.TKP
  );
};

// 5-level sorting comparator
const sortByPriority = (a: LeaderboardEntry, b: LeaderboardEntry): number => {
  // Priority 1: Pass status (LULUS first)
  const aLulus = isLulus(a);
  const bLulus = isLulus(b);
  if (aLulus !== bLulus) {
    return aLulus ? -1 : 1;
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

const Leaderboard = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      // Use secure RPC function that hides sensitive data and handles deduplication
      const { data: results, error } = await supabase
        .rpc('get_leaderboard');

      if (error) {
        console.error('Error fetching leaderboard:', error);
        loadFromLocalStorage();
        return;
      }

      if (results && results.length > 0) {
        // Data is already sorted and deduplicated by the secure function
        setData(results);
      } else {
        loadFromLocalStorage();
      }
    } catch (error) {
      console.error('Error:', error);
      loadFromLocalStorage();
    } finally {
      setIsLoading(false);
    }
  };

  const loadFromLocalStorage = () => {
    const saved = JSON.parse(localStorage.getItem('leaderboard') || '[]');
    const converted = saved.map((entry: any, idx: number) => ({
      id: `local-${idx}`,
      name: entry.name,
      twk_score: entry.twk,
      tiu_score: entry.tiu,
      tkp_score: entry.tkp,
      total_score: entry.total,
      ip_address: null,
      device_fingerprint: null,
    }));
    // Sort using the 5-level priority
    const sorted = converted.sort(sortByPriority);
    setData(sorted);
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-4 h-4 md:w-5 md:h-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="w-4 h-4 md:w-5 md:h-5 text-gray-400" />;
    if (rank === 3) return <Award className="w-4 h-4 md:w-5 md:h-5 text-amber-600" />;
    return <span className="w-4 md:w-5 text-center text-sm">{rank}</span>;
  };

  // Get score cell class based on passing grade
  const getScoreClass = (score: number, type: 'TWK' | 'TIU' | 'TKP'): string => {
    const passingGrade = PASSING_GRADE[type];
    if (score < passingGrade) {
      return 'text-red-600 dark:text-red-500 font-semibold';
    }
    return '';
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="metallic-maroon py-3 md:py-4">
        <div className="container mx-auto text-center px-4">
          <h1 className="text-lg md:text-2xl font-bold text-white flex items-center justify-center gap-2">
            <Trophy className="w-5 h-5 md:w-6 md:h-6" /> LEADERBOARD
          </h1>
        </div>
      </header>

      {/* Centered Title Section */}
      <div className="text-center py-4 md:py-8 px-4">
        <h2 className="text-2xl md:text-4xl font-extrabold uppercase tracking-wide text-foreground">RAKORNAS</h2>
        <p className="text-sm md:text-xl capitalize text-muted-foreground mt-1 md:mt-2">Rangking Topskor Nasional</p>
      </div>

      <main className="container mx-auto pb-6 md:pb-8 px-3 md:px-4">
        <Card className="max-w-4xl mx-auto p-3 md:p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">Memuat data...</span>
            </div>
          ) : data.length === 0 ? (
            <p className="text-center text-muted-foreground py-6 md:py-8 text-sm md:text-base">Belum ada data peserta</p>
          ) : (
            <div className="overflow-x-auto -mx-3 md:mx-0">
              {/* Legend */}
              <div className="flex justify-end mb-2 px-2 md:px-0">
                <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded">
                  Keterangan: <span className="text-green-600 dark:text-green-400 font-medium">L</span> = Lulus, <span className="text-red-600 dark:text-red-400 font-medium">TL</span> = Tidak Lulus
                </span>
              </div>
              <Table className="min-w-[520px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 md:w-16 text-xs md:text-sm">Rank</TableHead>
                    <TableHead className="text-xs md:text-sm">Nama</TableHead>
                    <TableHead className="text-center text-xs md:text-sm">TWK</TableHead>
                    <TableHead className="text-center text-xs md:text-sm">TIU</TableHead>
                    <TableHead className="text-center text-xs md:text-sm">TKP</TableHead>
                    <TableHead className="text-center text-xs md:text-sm">Total</TableHead>
                    <TableHead className="text-center text-xs md:text-sm">Keterangan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((entry, idx) => {
                    const rank = idx + 1;
                    const lulus = isLulus(entry);
                    let rowClass = '';
                    if (rank <= 3 && lulus) {
                      rowClass = 'bg-yellow-100/70 dark:bg-yellow-900/30';
                    } else if (rank <= 10 && lulus) {
                      rowClass = 'bg-slate-100/70 dark:bg-slate-800/30';
                    } else if (!lulus) {
                      rowClass = 'bg-red-50/50 dark:bg-red-950/20';
                    }
                    return (
                      <TableRow key={entry.id} className={rowClass}>
                        <TableCell className="flex items-center justify-center py-2 md:py-4">
                          {getRankIcon(rank)}
                        </TableCell>
                        <TableCell className="font-medium text-xs md:text-sm py-2 md:py-4">{entry.name}</TableCell>
                        <TableCell className={`text-center text-xs md:text-sm py-2 md:py-4 ${getScoreClass(entry.twk_score, 'TWK')}`}>
                          {entry.twk_score}
                        </TableCell>
                        <TableCell className={`text-center text-xs md:text-sm py-2 md:py-4 ${getScoreClass(entry.tiu_score, 'TIU')}`}>
                          {entry.tiu_score}
                        </TableCell>
                        <TableCell className={`text-center text-xs md:text-sm py-2 md:py-4 ${getScoreClass(entry.tkp_score, 'TKP')}`}>
                          {entry.tkp_score}
                        </TableCell>
                        <TableCell className="text-center font-bold text-xs md:text-sm py-2 md:py-4">{entry.total_score}</TableCell>
                        <TableCell className="text-center text-xs md:text-sm py-2 md:py-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            lulus 
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300' 
                              : 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'
                          }`}>
                            {lulus ? 'Lulus' : 'Tidak Lulus'}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="mt-4 md:mt-6 flex flex-col sm:flex-row justify-center gap-2 md:gap-3">
            <Button onClick={() => navigate('/')} className="w-full sm:w-auto text-sm">
              Kembali ke Beranda
            </Button>
            <Button 
              onClick={() => navigate('/results')} 
              className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white text-sm"
            >
              Kembali ke Hasil Ujian
            </Button>
          </div>
        </Card>
      </main>
    </div>
  );
};

export default Leaderboard;
