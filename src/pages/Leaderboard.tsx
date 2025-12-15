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
    if (rank === 1) return <Trophy className="w-5 h-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-gray-400" />;
    if (rank === 3) return <Award className="w-5 h-5 text-amber-600" />;
    return <span className="w-5 text-center">{rank}</span>;
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="metallic-maroon py-4">
        <div className="container mx-auto text-center">
          <h1 className="text-2xl font-bold text-white flex items-center justify-center gap-2">
            <Trophy className="w-6 h-6" /> LEADERBOARD
          </h1>
        </div>
      </header>

      {/* Centered Title Section */}
      <div className="text-center py-8">
        <h2 className="text-4xl font-extrabold uppercase tracking-wide text-foreground">RAKORNAS</h2>
        <p className="text-xl capitalize text-muted-foreground mt-2">Rangking Topskor Nasional</p>
      </div>

      <main className="container mx-auto pb-8 px-4">
        <Card className="max-w-4xl mx-auto p-6">
          {data.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Belum ada data peserta</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Rank</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead className="text-center">TWK</TableHead>
                  <TableHead className="text-center">TIU</TableHead>
                  <TableHead className="text-center">TKP</TableHead>
                  <TableHead className="text-center">Total</TableHead>
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
                      <TableCell className="flex items-center justify-center">
                        {getRankIcon(rank)}
                      </TableCell>
                      <TableCell className="font-medium">{entry.name}</TableCell>
                      <TableCell className="text-center">{entry.twk}</TableCell>
                      <TableCell className="text-center">{entry.tiu}</TableCell>
                      <TableCell className="text-center">{entry.tkp}</TableCell>
                      <TableCell className="text-center font-bold">{entry.total}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}

          <div className="mt-6 flex justify-center gap-3">
            <Button onClick={() => navigate('/')}>Kembali ke Beranda</Button>
            <Button 
              onClick={() => navigate('/results')} 
              className="bg-green-600 hover:bg-green-700 text-white"
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
