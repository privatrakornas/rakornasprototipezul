import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trophy, Medal, Award, Loader2, Radio, Users } from 'lucide-react';
import { format } from 'date-fns';
import { useRealtimeLeaderboard, isLulus, type LeaderboardEntry } from '@/hooks/useRealtimeLeaderboard';
import { LiveTimer } from '@/components/LiveTimer';

const Leaderboard = () => {
  const navigate = useNavigate();
  const { data, isLoading, TOTAL_EXAM_TIME, TOTAL_QUESTIONS } = useRealtimeLeaderboard();

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-4 h-4 md:w-5 md:h-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="w-4 h-4 md:w-5 md:h-5 text-gray-400" />;
    if (rank === 3) return <Award className="w-4 h-4 md:w-5 md:h-5 text-amber-600" />;
    return <span className="w-4 md:w-5 text-center text-sm">{rank}</span>;
  };

  // Get score cell class based on passing grade and row background
  const getScoreClass = (score: number, type: 'TWK' | 'TIU' | 'TKP', isLightText: boolean, passingGrade: Record<string, number>): string => {
    const pg = passingGrade[type];
    if (score < pg) {
      return isLightText ? 'text-red-200 font-bold underline' : 'text-red-600 dark:text-red-500 font-semibold';
    }
    return '';
  };

  // Get row styling based on rank, status and passing status
  const getRowStyle = (rank: number, entry: LeaderboardEntry): { className: string; isLightText: boolean } => {
    const lulus = isLulus(entry);
    
    // Ongoing exams get a special animated style
    if (entry.status === 'ongoing') {
      return {
        className: 'bg-gradient-to-r from-blue-100 via-indigo-100 to-purple-100 dark:from-blue-900/40 dark:via-indigo-900/40 dark:to-purple-900/40 animate-pulse border-l-4 border-blue-500',
        isLightText: false
      };
    }
    
    // Rank 1-3: Podium with gradient backgrounds
    if (rank === 1) {
      return {
        className: 'bg-gradient-to-r from-yellow-400 via-yellow-500 to-amber-500 text-white shadow-lg',
        isLightText: true
      };
    }
    if (rank === 2) {
      return {
        className: 'bg-gradient-to-r from-gray-300 via-gray-400 to-gray-500 text-white shadow-md',
        isLightText: true
      };
    }
    if (rank === 3) {
      return {
        className: 'bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600 text-white shadow-md',
        isLightText: true
      };
    }
    
    // Rank 4-10: Top 10 with green background
    if (rank <= 10) {
      return {
        className: 'bg-green-100 dark:bg-green-900/30 text-gray-900 dark:text-gray-100',
        isLightText: false
      };
    }
    
    // Rank 11+: Based on passing status
    if (lulus) {
      return {
        className: 'bg-blue-50 dark:bg-blue-900/20 text-gray-900 dark:text-gray-100',
        isLightText: false
      };
    } else {
      return {
        className: 'bg-red-50 dark:bg-red-900/20 text-gray-900 dark:text-gray-100',
        isLightText: false
      };
    }
  };

  // Count ongoing and finished
  const ongoingCount = data.filter(e => e.status === 'ongoing').length;
  const finishedCount = data.filter(e => e.status === 'finished').length;

  // Passing grade constants for display
  const PASSING_GRADE = { TWK: 65, TIU: 80, TKP: 166 };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-secondary">
      <header className="metallic-maroon py-3 md:py-4">
        <div className="container mx-auto text-center px-4">
          <h1 className="text-lg md:text-2xl font-bold text-white flex items-center justify-center gap-2">
            <Trophy className="w-5 h-5 md:w-6 md:h-6 text-accent" /> 
            LIVE LEADERBOARD
            {ongoingCount > 0 && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500 text-white text-xs font-medium animate-pulse">
                <Radio className="w-3 h-3" />
                LIVE
              </span>
            )}
          </h1>
          <p className="text-white/80 text-xs md:text-sm">Simulasi CAT SKD - RAKORNAS</p>
        </div>
      </header>

      {/* Centered Title Section */}
      <div className="text-center py-4 md:py-8 px-4">
        <h2 className="text-2xl md:text-4xl font-extrabold uppercase tracking-wide text-primary">RAKORNAS</h2>
        <p className="text-sm md:text-xl capitalize text-muted-foreground mt-1 md:mt-2">Rangking Topskor Nasional</p>
        
        {/* Stats */}
        <div className="flex justify-center gap-4 mt-3">
          {ongoingCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/40 rounded-full text-blue-700 dark:text-blue-300 text-sm font-medium">
              <Radio className="w-4 h-4 animate-pulse" />
              {ongoingCount} Sedang Ujian
            </div>
          )}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-100 dark:bg-green-900/40 rounded-full text-green-700 dark:text-green-300 text-sm font-medium">
            <Users className="w-4 h-4" />
            {finishedCount} Selesai
          </div>
        </div>
      </div>

      <main className="container mx-auto pb-6 md:pb-8 px-3 md:px-4">
        <Card className="max-w-5xl mx-auto p-3 md:p-6 shadow-xl card-gold-border">
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
              <div className="flex flex-wrap justify-between items-center mb-2 px-2 md:px-0 gap-2">
                <div className="flex items-center gap-2 text-xs">
                  <span className="flex items-center gap-1 px-2 py-1 rounded bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/40 dark:to-purple-900/40">
                    <Radio className="w-3 h-3 text-blue-500 animate-pulse" />
                    Sedang Ujian
                  </span>
                </div>
                <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded">
                  Keterangan: <span className="text-green-600 dark:text-green-400 font-medium">L</span> = Lulus, <span className="text-red-600 dark:text-red-400 font-medium">TL</span> = Tidak Lulus
                </span>
              </div>
              <Table className="min-w-[800px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 md:w-16 text-xs md:text-sm">Rank</TableHead>
                    <TableHead className="text-xs md:text-sm">Nama</TableHead>
                    <TableHead className="text-center text-xs md:text-sm">Durasi / Sisa Waktu</TableHead>
                    <TableHead className="text-center text-xs md:text-sm">TWK</TableHead>
                    <TableHead className="text-center text-xs md:text-sm">TIU</TableHead>
                    <TableHead className="text-center text-xs md:text-sm">TKP</TableHead>
                    <TableHead className="text-center text-xs md:text-sm">Total</TableHead>
                    <TableHead className="text-center text-xs md:text-sm">Keterangan</TableHead>
                    <TableHead className="text-center text-xs md:text-sm">Tanggal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((entry, idx) => {
                    const rank = idx + 1;
                    const lulus = isLulus(entry);
                    const { className: rowClass, isLightText } = getRowStyle(rank, entry);
                    
                    return (
                      <TableRow key={entry.id} className={`transition-all duration-300 ${rowClass}`}>
                        <TableCell className={`flex items-center justify-center py-2 md:py-4 ${isLightText ? '' : ''}`}>
                          {entry.status === 'ongoing' ? (
                            <Radio className="w-4 h-4 text-blue-500 animate-pulse" />
                          ) : (
                            getRankIcon(rank)
                          )}
                        </TableCell>
                        <TableCell className={`font-medium text-xs md:text-sm py-2 md:py-4 ${isLightText ? 'text-white' : ''}`}>
                          <div className="flex flex-col gap-0.5">
                            <span>{entry.name}</span>
                            {entry.status === 'ongoing' && (
                              <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">
                                ({entry.answered_count || 0}/{TOTAL_QUESTIONS} soal)
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className={`text-center text-xs md:text-sm py-2 md:py-4 ${isLightText ? 'text-white/90' : ''}`}>
                          <LiveTimer
                            startedAt={entry.started_at}
                            totalMinutes={TOTAL_EXAM_TIME}
                            status={entry.status}
                            durationMinutes={entry.duration_minutes}
                          />
                        </TableCell>
                        <TableCell className={`text-center text-xs md:text-sm py-2 md:py-4 ${isLightText ? 'text-white' : ''} ${getScoreClass(entry.twk_score, 'TWK', isLightText, PASSING_GRADE)}`}>
                          {entry.twk_score}
                        </TableCell>
                        <TableCell className={`text-center text-xs md:text-sm py-2 md:py-4 ${isLightText ? 'text-white' : ''} ${getScoreClass(entry.tiu_score, 'TIU', isLightText, PASSING_GRADE)}`}>
                          {entry.tiu_score}
                        </TableCell>
                        <TableCell className={`text-center text-xs md:text-sm py-2 md:py-4 ${isLightText ? 'text-white' : ''} ${getScoreClass(entry.tkp_score, 'TKP', isLightText, PASSING_GRADE)}`}>
                          {entry.tkp_score}
                        </TableCell>
                        <TableCell className={`text-center font-bold text-xs md:text-sm py-2 md:py-4 ${isLightText ? 'text-white' : ''}`}>
                          {entry.total_score}
                        </TableCell>
                        <TableCell className="text-center text-xs md:text-sm py-2 md:py-4">
                          {entry.status === 'ongoing' ? (
                            <span className="px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 flex items-center justify-center gap-1">
                              <Radio className="w-3 h-3 animate-pulse" />
                              Berlangsung
                            </span>
                          ) : (
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                              lulus 
                                ? isLightText 
                                  ? 'bg-white/20 text-white border border-white/30' 
                                  : 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300'
                                : isLightText 
                                  ? 'bg-red-200/30 text-white border border-red-200/50' 
                                  : 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'
                            }`}>
                              {lulus ? 'Lulus' : 'Tidak Lulus'}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className={`text-center text-xs md:text-sm py-2 md:py-4 whitespace-nowrap ${isLightText ? 'text-white/90' : 'text-muted-foreground'}`}>
                          {entry.created_at 
                            ? format(new Date(entry.created_at), 'dd-MM-yyyy') 
                            : '-'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="mt-4 md:mt-6 flex flex-col sm:flex-row justify-center gap-2 md:gap-3">
            <Button onClick={() => navigate('/')} className="w-full sm:w-auto text-sm bg-primary hover:bg-primary/90">
              Kembali ke Beranda
            </Button>
            <Button 
              onClick={() => navigate('/results')} 
              variant="outline"
              className="w-full sm:w-auto border-primary text-primary hover:bg-primary/10 text-sm"
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
