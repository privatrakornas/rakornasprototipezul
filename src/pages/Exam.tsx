import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { questions } from '@/data/questions';
import { Clock, ChevronLeft, ChevronRight, Grid3X3 } from 'lucide-react';

const EXAM_TIME = 100 * 60; // 100 minutes in seconds

const Exam = () => {
  const navigate = useNavigate();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [timeLeft, setTimeLeft] = useState(EXAM_TIME);
  const [navOpen, setNavOpen] = useState(false);
  const userName = localStorage.getItem('userName') || 'Peserta';

  // Anti-cheat: detect tab switch
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        alert('Anda terdeteksi meninggalkan halaman ujian!');
        localStorage.removeItem('userName');
        navigate('/');
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [navigate]);

  // Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAnswer = (key: string) => {
    setAnswers(prev => ({ ...prev, [questions[currentQuestion].id]: key }));
  };

  const handleSubmit = useCallback(() => {
    const unanswered = questions.filter(q => !answers[q.id]).length;
    if (unanswered > 0 && timeLeft > 0) {
      alert(`Seluruh soal harus dijawab terlebih dahulu. Masih ada ${unanswered} soal belum dijawab.`);
      return;
    }
    localStorage.setItem('examAnswers', JSON.stringify(answers));
    navigate('/results');
  }, [answers, navigate, timeLeft]);

  const question = questions[currentQuestion];
  const isAnswered = (id: number) => answers[id] !== undefined;

  const handleNavClick = (idx: number) => {
    setCurrentQuestion(idx);
    setNavOpen(false);
  };

  // Question Navigation Grid Component
  const QuestionNavGrid = () => (
    <>
      <div className="p-3 md:p-4 border-b">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-semibold text-xs md:text-sm">Navigasi Soal</h3>
          <div className="flex items-center gap-2 md:gap-3 text-[10px] md:text-xs">
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded bg-[hsl(var(--answered))]" />
              <span>{Object.keys(answers).length}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded bg-[hsl(var(--unanswered))] border" />
              <span>{110 - Object.keys(answers).length}</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-3 md:p-4 scrollbar-thin">
        <div className="grid grid-cols-5 gap-1.5 md:gap-2">
          {questions.map((q, idx) => (
            <button
              key={q.id}
              onClick={() => handleNavClick(idx)}
              className={`w-8 h-8 md:w-10 md:h-10 rounded text-[10px] md:text-xs font-medium border transition-all flex flex-col items-center justify-center ${
                currentQuestion === idx
                  ? 'nav-btn-current'
                  : isAnswered(q.id)
                  ? 'nav-btn-answered'
                  : 'nav-btn-unanswered'
              }`}
            >
              <span className="leading-none">{q.id}</span>
              {answers[q.id] && (
                <span className="text-[8px] md:text-[10px] font-bold leading-none mt-0.5">{answers[q.id]}</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Fixed Header */}
      <header className="metallic-maroon py-2 md:py-3 sticky top-0 z-50">
        <div className="container mx-auto flex justify-between items-center px-3 md:px-4">
          {/* Left: Title & Username */}
          <div className="text-left min-w-0 flex-1">
            <span className="text-white font-semibold block text-sm md:text-base truncate">CAT SKD - RAKORNAS</span>
            <span className="text-white/80 text-xs md:text-sm truncate block">{userName}</span>
          </div>
          
          {/* Right: Timer & Submit Button */}
          <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
            <div className={`flex items-center gap-1 md:gap-2 text-white font-mono text-base md:text-xl ${timeLeft < 300 ? 'timer-danger' : timeLeft < 600 ? 'timer-warning' : ''}`}>
              <Clock className="w-4 h-4 md:w-5 md:h-5" />
              {formatTime(timeLeft)}
            </div>
            <Button 
              onClick={handleSubmit} 
              variant="destructive" 
              size="sm" 
              className="bg-red-600 hover:bg-red-700 text-xs md:text-sm px-2 md:px-4"
            >
              <span className="hidden sm:inline">Selesai & </span>Submit
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Main Question Panel */}
        <main className="flex-1 p-3 md:p-6 overflow-y-auto pb-20 lg:pb-6">
          <Card className="p-4 md:p-6 animate-fade-in">
            <div className="flex flex-col gap-2 mb-3 md:mb-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <span className="text-muted-foreground text-xs md:text-sm whitespace-nowrap">Soal {question.id} / 110</span>
              </div>
              <div className="px-2 md:px-3 py-1.5 md:py-2 bg-accent/20 text-accent rounded-lg text-xs md:text-sm font-medium leading-relaxed">
                {question.category} - {question.code}
              </div>
            </div>

            <p className="text-sm md:text-lg leading-relaxed mb-4 md:mb-6 whitespace-pre-line">{question.text}</p>

            {question.hasImage && (
              <p className="text-muted-foreground italic mb-4 text-sm">[Soal bergambar - Gambar ditampilkan di sini]</p>
            )}

            <div className="space-y-2 md:space-y-3">
              {question.options.map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => handleAnswer(opt.key)}
                  className={`answer-option w-full text-left flex gap-2 md:gap-3 p-3 md:p-4 ${
                    answers[question.id] === opt.key ? 'answer-option-selected' : ''
                  }`}
                >
                  <span className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-secondary flex items-center justify-center font-semibold flex-shrink-0 text-xs md:text-sm">
                    {opt.key}
                  </span>
                  <span className="text-sm md:text-base">{opt.text}</span>
                </button>
              ))}
            </div>

            {/* Navigation Buttons - Stack on mobile */}
            <div className="flex flex-col sm:flex-row justify-between gap-2 mt-6 md:mt-8">
              <Button
                variant="outline"
                onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
                disabled={currentQuestion === 0}
                className="w-full sm:w-auto order-2 sm:order-1 py-3 md:py-2"
              >
                <ChevronLeft className="w-4 h-4 mr-2" /> Sebelumnya
              </Button>
              <Button
                onClick={() => setCurrentQuestion(currentQuestion === 109 ? 0 : currentQuestion + 1)}
                className="w-full sm:w-auto order-1 sm:order-2 py-3 md:py-2"
              >
                Selanjutnya <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </Card>
        </main>

        {/* Desktop: Right Sidebar - Question Navigation */}
        <aside className="hidden lg:flex w-64 bg-card border-l flex-col h-[calc(100vh-56px)] sticky top-14">
          <QuestionNavGrid />
        </aside>

        {/* Mobile: Floating Navigation Button */}
        <div className="lg:hidden fixed bottom-4 right-4 z-50">
          <Sheet open={navOpen} onOpenChange={setNavOpen}>
            <SheetTrigger asChild>
              <Button 
                size="lg" 
                className="rounded-full w-14 h-14 shadow-lg bg-primary hover:bg-primary/90"
              >
                <Grid3X3 className="w-6 h-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 p-0 flex flex-col">
              <QuestionNavGrid />
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </div>
  );
};

export default Exam;
