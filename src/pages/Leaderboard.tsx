import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trophy, Loader2, Radio, Users } from 'lucide-react';
import { useRealtimeLeaderboard } from '@/hooks/useRealtimeLeaderboard';
import LeaderboardRow from '@/components/LeaderboardRow';

const Leaderboard = () => {
  const navigate = useNavigate();
  const { data, isLoading } = useRealtimeLeaderboard();

  // Count ongoing and finished (exclude disqualified)
  const ongoingCount = data.filter(e => e.status === 'ongoing').length;
  const finishedCount = data.filter(e => e.status === 'finished').length;

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
                  {data
                    .filter(entry => entry.status !== 'disqualified')
                    .map((entry, idx) => (
                      <LeaderboardRow 
                        key={entry.id} 
                        entry={entry} 
                        rank={idx + 1} 
                      />
                    ))}
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
