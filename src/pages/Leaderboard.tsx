import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trophy, Medal, Award } from 'lucide-react';

interface LeaderboardEntry {
  name: string;
  twk: number;
  tiu: number;
  tkp: number;
  total: number;
  date: string;
}

const Leaderboard = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('leaderboard') || '[]');
    // Sort by total, then TKP, then TIU, then TWK
    const sorted = saved.sort((a: LeaderboardEntry, b: LeaderboardEntry) => {
      if (b.total !== a.total) return b.total - a.total;
      if (b.tkp !== a.tkp) return b.tkp - a.tkp;
      if (b.tiu !== a.tiu) return b.tiu - a.tiu;
      return b.twk - a.twk;
    });
    setData(sorted);
  }, []);

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-4 h-4 md:w-5 md:h-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="w-4 h-4 md:w-5 md:h-5 text-gray-400" />;
    if (rank === 3) return <Award className="w-4 h-4 md:w-5 md:h-5 text-amber-600" />;
    return <span className="w-4 md:w-5 text-center text-sm">{rank}</span>;
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
          {data.length === 0 ? (
            <p className="text-center text-muted-foreground py-6 md:py-8 text-sm md:text-base">Belum ada data peserta</p>
          ) : (
            <div className="overflow-x-auto -mx-3 md:mx-0">
              <Table className="min-w-[480px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 md:w-16 text-xs md:text-sm">Rank</TableHead>
                    <TableHead className="text-xs md:text-sm">Nama</TableHead>
                    <TableHead className="text-center text-xs md:text-sm">TWK</TableHead>
                    <TableHead className="text-center text-xs md:text-sm">TIU</TableHead>
                    <TableHead className="text-center text-xs md:text-sm">TKP</TableHead>
                    <TableHead className="text-center text-xs md:text-sm">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((entry, idx) => {
                    const rank = idx + 1;
                    let rowClass = '';
                    if (rank <= 3) {
                      rowClass = 'bg-yellow-100/70 dark:bg-yellow-900/30';
                    } else if (rank <= 10) {
                      rowClass = 'bg-slate-100/70 dark:bg-slate-800/30';
                    }
                    return (
                      <TableRow key={idx} className={rowClass}>
                        <TableCell className="flex items-center justify-center py-2 md:py-4">
                          {getRankIcon(rank)}
                        </TableCell>
                        <TableCell className="font-medium text-xs md:text-sm py-2 md:py-4">{entry.name}</TableCell>
                        <TableCell className="text-center text-xs md:text-sm py-2 md:py-4">{entry.twk}</TableCell>
                        <TableCell className="text-center text-xs md:text-sm py-2 md:py-4">{entry.tiu}</TableCell>
                        <TableCell className="text-center text-xs md:text-sm py-2 md:py-4">{entry.tkp}</TableCell>
                        <TableCell className="text-center font-bold text-xs md:text-sm py-2 md:py-4">{entry.total}</TableCell>
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
