import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CheckCircle, Clock, AlertTriangle } from 'lucide-react';

const Rules = () => {
  const navigate = useNavigate();
  const userName = localStorage.getItem('userName') || 'Peserta';

  return (
    <div className="min-h-screen bg-background">
      <header className="metallic-maroon py-3 md:py-4">
        <div className="container mx-auto text-center px-4">
          <h1 className="text-lg md:text-2xl font-bold text-white">PETUNJUK PENGERJAAN</h1>
          <p className="text-white/80 text-xs md:text-sm">Simulasi CAT SKD - RAKORNAS</p>
        </div>
      </header>

      <main className="container mx-auto py-4 md:py-8 px-3 md:px-4">
        <Card className="max-w-3xl mx-auto p-4 md:p-8">
          <p className="text-base md:text-lg mb-4 md:mb-6">Selamat datang, <strong>{userName}</strong>!</p>

          <div className="space-y-4 md:space-y-6">
            <div className="flex gap-3 md:gap-4">
              <Clock className="w-5 h-5 md:w-6 md:h-6 text-accent flex-shrink-0 mt-0.5 md:mt-1" />
              <div>
                <h3 className="font-semibold text-sm md:text-base">Waktu Pengerjaan</h3>
                <p className="text-muted-foreground text-xs md:text-base">Anda memiliki waktu 100 menit untuk mengerjakan 110 soal.</p>
              </div>
            </div>

            <div className="flex gap-3 md:gap-4">
              <CheckCircle className="w-5 h-5 md:w-6 md:h-6 text-success flex-shrink-0 mt-0.5 md:mt-1" />
              <div>
                <h3 className="font-semibold text-sm md:text-base">Komposisi Soal</h3>
                <ul className="text-muted-foreground list-disc ml-4 text-xs md:text-base">
                  <li>TWK (Tes Wawasan Kebangsaan): 30 soal</li>
                  <li>TIU (Tes Intelegensia Umum): 35 soal</li>
                  <li>TKP (Tes Karakteristik Pribadi): 45 soal</li>
                </ul>
              </div>
            </div>

            <div className="flex gap-3 md:gap-4">
              <AlertTriangle className="w-5 h-5 md:w-6 md:h-6 text-warning flex-shrink-0 mt-0.5 md:mt-1" />
              <div>
                <h3 className="font-semibold text-sm md:text-base">Perhatian</h3>
                <ul className="text-muted-foreground list-disc ml-4 text-xs md:text-base">
                  <li>Jangan minimize browser atau buka tab lain</li>
                  <li>Semua soal harus dijawab sebelum submit</li>
                  <li>Jawaban dapat diubah selama waktu belum habis</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-6 md:mt-8 flex justify-center">
            <Button onClick={() => navigate('/exam')} size="lg" className="px-8 md:px-12 w-full sm:w-auto">
              Mulai Ujian
            </Button>
          </div>
        </Card>
      </main>
    </div>
  );
};

export default Rules;
