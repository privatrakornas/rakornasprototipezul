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

      <main className="container mx-auto py-8 px-4">
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
                {data.map((entry, idx) => (
                  <TableRow key={idx} className={idx < 3 ? 'bg-secondary/50' : ''}>
                    <TableCell className="flex items-center justify-center">
                      {getRankIcon(idx + 1)}
                    </TableCell>
                    <TableCell className="font-medium">{entry.name}</TableCell>
                    <TableCell className="text-center">{entry.twk}</TableCell>
                    <TableCell className="text-center">{entry.tiu}</TableCell>
                    <TableCell className="text-center">{entry.tkp}</TableCell>
                    <TableCell className="text-center font-bold">{entry.total}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          <div className="mt-6 text-center">
            <Button onClick={() => navigate('/')}>Kembali ke Beranda</Button>
          </div>
        </Card>
      </main>
    </div>
  );
};

export default Leaderboard;
