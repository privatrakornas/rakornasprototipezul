import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Trophy, Loader2, Users } from 'lucide-react';
import { useRealtimeLeaderboard } from '@/hooks/useRealtimeLeaderboard';
import LeaderboardFinishedTable from '@/components/LeaderboardFinishedTable';
import SocialMediaWidget from '@/components/SocialMediaWidget';

const Leaderboard = () => {
  const navigate = useNavigate();
  const { data, isLoading } = useRealtimeLeaderboard();

  const finishedCount = data.filter(e => e.status === 'finished').length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-secondary">
      <header className="metallic-maroon py-3 md:py-4">
        <div className="container mx-auto text-center px-4">
          <h1 className="text-lg md:text-2xl font-bold text-white flex items-center justify-center gap-2">
            <Trophy className="w-5 h-5 md:w-6 md:h-6 text-accent" /> 
            LEADERBOARD
          </h1>
          <p className="text-white/80 text-xs md:text-sm">Simulasi CAT SKD - RAKORNAS</p>
        </div>
      </header>

      {/* Centered Title Section */}
      <div className="text-center py-4 md:py-6 px-4">
        <h2 className="text-2xl md:text-4xl font-extrabold uppercase tracking-wide text-primary">RAKORNAS</h2>
        <p className="text-sm md:text-xl capitalize text-muted-foreground mt-1 md:mt-2">Rangking Topskor Nasional</p>
        
        <div className="flex justify-center gap-4 mt-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-100 dark:bg-green-900/40 rounded-full text-green-700 dark:text-green-300 text-sm font-medium">
            <Users className="w-4 h-4" />
            {finishedCount} Peserta
          </div>
        </div>

        {/* Social Media Widget */}
        <div className="mt-3">
          <SocialMediaWidget />
        </div>
      </div>

      <main className="container mx-auto pb-6 md:pb-8 px-3 md:px-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Memuat data...</span>
          </div>
        ) : (
          <>
            {/* Single Table - Full Width */}
            <div className="max-w-5xl mx-auto">
              <Card className="p-3 md:p-5 shadow-xl card-gold-border overflow-hidden">
                <LeaderboardFinishedTable data={data} />
              </Card>
            </div>

            {/* Navigation Buttons */}
            <div className="mt-6 flex flex-col sm:flex-row justify-center gap-2 md:gap-3">
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
          </>
        )}
      </main>
    </div>
  );
};

export default Leaderboard;
