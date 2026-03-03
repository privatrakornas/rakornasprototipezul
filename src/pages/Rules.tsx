import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { usePageConfig } from '@/hooks/useEditableConfig';
import DOMPurify from 'dompurify';

const Rules = () => {
  const navigate = useNavigate();
  const userName = sessionStorage.getItem('userName') || 'Peserta';

  const { get } = usePageConfig([
    'rules_title', 'rules_subtitle', 'rules_time_text', 'rules_start_button',
    'system_twk_count', 'system_tiu_count', 'system_tkp_count',
  ]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-secondary">
      <header className="metallic-maroon py-4 md:py-5">
        <div className="container mx-auto text-center px-4">
          <h1 className="text-lg md:text-2xl font-bold text-white">{get('rules_title')}</h1>
          <p className="text-white/80 text-xs md:text-sm">{get('rules_subtitle')}</p>
        </div>
      </header>

      <main className="container mx-auto py-6 md:py-10 px-3 md:px-4">
        <Card className="max-w-3xl mx-auto p-5 md:p-8 shadow-xl card-gold-border">
          <p className="text-base md:text-lg mb-5 md:mb-7">
            Selamat datang, <strong className="text-primary">{userName}</strong>!
          </p>

          <div className="space-y-5 md:space-y-7">
            {/* Waktu Pengerjaan */}
            <div className="flex gap-3 md:gap-4">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                <Clock className="w-5 h-5 md:w-6 md:h-6 text-accent" />
              </div>
              <div>
                <h3 className="font-semibold text-sm md:text-base text-primary">Waktu Pengerjaan</h3>
                <p
                  className="text-muted-foreground text-xs md:text-base"
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(get('rules_time_text'), { ALLOWED_TAGS: ['strong', 'em', 'b', 'i'] }) }}
                />
              </div>
            </div>

            {/* Komposisi Soal */}
            <div className="flex gap-3 md:gap-4">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-success/20 flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-5 h-5 md:w-6 md:h-6 text-success" />
              </div>
              <div>
                <h3 className="font-semibold text-sm md:text-base text-primary">Komposisi Soal</h3>
                <ul className="text-muted-foreground list-none space-y-1 text-xs md:text-base mt-1">
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary"></span>
                    TWK (Tes Wawasan Kebangsaan): {get('system_twk_count')} soal
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary"></span>
                    TIU (Tes Intelegensia Umum): {get('system_tiu_count')} soal
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary"></span>
                    TKP (Tes Karakteristik Pribadi): {get('system_tkp_count')} soal
                  </li>
                </ul>
              </div>
            </div>

            {/* Perhatian */}
            <div className="flex gap-3 md:gap-4">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-warning/20 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 md:w-6 md:h-6 text-warning" />
              </div>
              <div>
                <h3 className="font-semibold text-sm md:text-base text-primary">Perhatian</h3>
                <ul className="text-muted-foreground list-none space-y-1 text-xs md:text-base mt-1">
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-warning"></span>
                    Jangan minimize browser atau buka tab lain
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-warning"></span>
                    Semua soal harus dijawab sebelum submit
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-warning"></span>
                    Jawaban dapat diubah selama waktu belum habis
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-8 md:mt-10 flex justify-center">
            <Button 
              onClick={() => navigate('/exam')} 
              size="lg" 
              className="px-10 md:px-16 py-4 md:py-5 w-full sm:w-auto text-base md:text-lg font-bold rounded-lg bg-success hover:bg-success/90 text-white shadow-lg"
            >
              {get('rules_start_button')}
            </Button>
          </div>
        </Card>
      </main>
    </div>
  );
};

export default Rules;
