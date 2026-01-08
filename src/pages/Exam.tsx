import { useState, useEffect, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { questions } from '@/data/questions';
import { Clock, ChevronLeft, ChevronRight, Grid3X3 } from 'lucide-react';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import LatexText from '@/components/LatexText';

const EXAM_TIME = 100 * 60; // 100 minutes in seconds
const MAX_DURATION_MINUTES = 100; // Cap duration at 100 minutes

// Memoized Question Navigation Grid - prevents re-renders from timer
interface QuestionNavGridProps {
  answers: Record<number, string>;
  currentQuestion: number;
  onNavClick: (idx: number) => void;
}

const QuestionNavGrid = memo(({ answers, currentQuestion, onNavClick }: QuestionNavGridProps) => {
  const isAnswered = (id: number) => answers[id] !== undefined;

  return (
    <div className="flex flex-col h-full">
      {/* Header - compact */}
      <div className="px-2 py-1.5 border-b flex-shrink-0">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-semibold text-xs">Navigasi Soal</h3>
          <div className="flex items-center gap-2 text-[10px]">
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded bg-[hsl(var(--answered))]" />
              <span className="font-medium">{Object.keys(answers).length}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded bg-[hsl(var(--unanswered))] border" />
              <span className="font-medium">{110 - Object.keys(answers).length}</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Grid 10 kolom x 11 baris = 110 tombol - tersebar vertikal */}
      <div className="flex-1 p-2 overflow-hidden">
        <div className="grid grid-cols-10 gap-1 h-full" style={{ gridTemplateRows: 'repeat(11, 1fr)' }}>
          {questions.map((q, idx) => {
            const answered = isAnswered(q.id);
            const selectedLetter = answers[q.id];
            return (
              <button
                key={q.id}
                onClick={() => onNavClick(idx)}
                className={`w-full h-full min-h-[24px] max-h-[36px] rounded font-bold border transition-all flex flex-col items-center justify-center hover:opacity-80 ${
                  currentQuestion === idx
                    ? 'nav-btn-current'
                    : answered
                    ? 'nav-btn-answered'
                    : 'nav-btn-unanswered'
                }`}
                title={selectedLetter ? `Soal ${q.id}: ${selectedLetter}` : `Soal ${q.id}`}
              >
                <span className="text-[8px] leading-none opacity-70">{q.id}</span>
                {answered && (
                  <span className="text-xs leading-none font-extrabold">{selectedLetter}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
});

QuestionNavGrid.displayName = 'QuestionNavGrid';

const Exam = () => {
  const navigate = useNavigate();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [timeLeft, setTimeLeft] = useState(EXAM_TIME);
  const [navOpen, setNavOpen] = useState(false);
  const [examStartedAt] = useState<string>(() => {
    // Get or set the exam start time
    const storedStartTime = sessionStorage.getItem('examStartedAt');
    if (storedStartTime) {
      return storedStartTime;
    }
    const startTime = new Date().toISOString();
    sessionStorage.setItem('examStartedAt', startTime);
    return startTime;
  });
  const userName = sessionStorage.getItem('userName') || 'Peserta';

  // Anti-cheat: detect tab switch
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        alert('Anda terdeteksi meninggalkan halaman ujian!');
        sessionStorage.removeItem('examSession');
        sessionStorage.removeItem('userName');
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
    
    // Calculate real duration based on started_at and current time
    const finishedAt = new Date().toISOString();
    const startTime = new Date(examStartedAt).getTime();
    const endTime = new Date(finishedAt).getTime();
    const realDurationMs = endTime - startTime;
    
    // Convert to minutes and cap at MAX_DURATION_MINUTES (100 min) to handle timeout/lag
    let durationMinutes = Math.ceil(realDurationMs / (1000 * 60));
    if (durationMinutes > MAX_DURATION_MINUTES) {
      durationMinutes = MAX_DURATION_MINUTES;
    }
    
    // Store all timing data
    localStorage.setItem('examAnswers', JSON.stringify(answers));
    localStorage.setItem('examDuration', String(durationMinutes));
    localStorage.setItem('examStartedAt', examStartedAt);
    localStorage.setItem('examFinishedAt', finishedAt);
    
    navigate('/results');
  }, [answers, navigate, timeLeft, examStartedAt]);

  const handleNavClick = useCallback((idx: number) => {
    setCurrentQuestion(idx);
    setNavOpen(false);
  }, []);

  const question = questions[currentQuestion];
  
  // Soal 61-65 adalah soal bacaan panjang, izinkan scroll
  const isLongQuestion = question.id >= 61 && question.id <= 65;

  return (
    <div className="h-screen bg-gradient-to-b from-white to-secondary flex flex-col overflow-hidden">
      {/* Fixed Header */}
      <header className="metallic-maroon py-2 flex-shrink-0">
        <div className="container mx-auto flex justify-between items-center px-3 md:px-4">
          {/* Left: Title & Username */}
          <div className="text-left min-w-0 flex-1">
            <span className="text-white font-semibold block text-sm md:text-base truncate">CAT SKD - RAKORNAS</span>
            <span className="text-white/80 text-xs md:text-sm truncate block">{userName}</span>
          </div>
          
          {/* Right: Timer & Submit Button */}
          <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
            <div className={`flex items-center gap-1 md:gap-2 font-mono text-base md:text-xl font-bold ${timeLeft < 300 ? 'text-red-300 timer-danger' : timeLeft < 600 ? 'text-yellow-300 timer-warning' : 'text-white'}`}>
              <Clock className="w-4 h-4 md:w-5 md:h-5" />
              {formatTime(timeLeft)}
            </div>
            <Button 
              onClick={handleSubmit} 
              size="sm" 
              className="bg-primary hover:bg-primary/90 text-white text-xs md:text-sm px-3 md:px-5 font-semibold"
            >
              <span className="hidden sm:inline">Selesai & </span>Submit
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row min-h-0">
        {/* Main Question Panel */}
        <main className={`flex-1 p-2 md:p-3 pb-16 lg:pb-3 min-h-0 ${isLongQuestion ? 'overflow-y-auto' : 'overflow-hidden'}`}>
          <Card className={`p-2 md:p-3 animate-fade-in h-full flex flex-col ${isLongQuestion ? '' : 'overflow-hidden'}`}>
            {/* Question Header - Compact */}
            <div className="flex items-center justify-between gap-2 mb-1.5 flex-shrink-0">
              <span className="text-muted-foreground text-[11px]">Soal {question.id}/110</span>
              <span className="px-1.5 py-0.5 bg-accent/20 text-accent rounded text-[10px] font-medium">
                {question.category} - {question.code}
              </span>
            </div>

            {/* Question Text - Adaptive font & tight leading */}
            <div className={`text-sm md:text-base leading-snug mb-2 whitespace-pre-line ${isLongQuestion ? '' : 'flex-shrink-0'}`}>
              <LatexText>{question.text}</LatexText>
            </div>

            {/* Gambar Soal */}
            {question.imageUrl && (
              <div className="mb-2 flex-shrink-0">
                <img 
                  src={question.imageUrl} 
                  alt={`Gambar soal ${question.id}`}
                  className="max-w-full max-h-24 md:max-h-32 h-auto rounded-lg border shadow-sm object-contain"
                  onError={(e) => {
                    const target = e.currentTarget;
                    target.style.display = 'none';
                    const fallback = document.createElement('div');
                    fallback.className = 'bg-red-50 dark:bg-red-900/20 p-2 rounded-lg border border-red-200 dark:border-red-800 text-xs';
                    
                    const errorText = document.createElement('p');
                    errorText.className = 'text-red-600 dark:text-red-400 font-medium';
                    errorText.textContent = '⚠️ Gambar gagal dimuat';
                    
                    fallback.appendChild(errorText);
                    target.parentNode?.appendChild(fallback);
                  }}
                />
              </div>
            )}
            
            {question.hasImage && !question.imageUrl && (
              <p className="text-muted-foreground italic mb-2 text-[11px] bg-yellow-50 dark:bg-yellow-900/20 p-1.5 rounded-lg border border-yellow-200 dark:border-yellow-800 flex-shrink-0">
                [Soal bergambar - Upload gambar di database untuk soal ini]
              </p>
            )}

            {/* Pilihan Jawaban - scrollable only if needed */}
            <div className={`flex-1 min-h-0 ${isLongQuestion ? '' : 'overflow-y-auto'}`}>
              {question.optionImageUrls ? (
                // Grid layout untuk pilihan jawaban bergambar (figural)
                <div className="grid grid-cols-5 gap-1.5">
                  {question.options.map((opt) => {
                    const optionImage = question.optionImageUrls?.[opt.key as 'A' | 'B' | 'C' | 'D' | 'E'];
                    return (
                      <button
                        key={opt.key}
                        onClick={() => handleAnswer(opt.key)}
                        className={`relative flex flex-col items-center p-1.5 rounded-lg border-2 transition-all ${
                          answers[question.id] === opt.key 
                            ? 'border-primary bg-primary/10 ring-2 ring-primary/30' 
                            : 'border-border hover:border-primary/50 hover:bg-accent/50'
                        }`}
                      >
                        <span className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-secondary flex items-center justify-center font-semibold text-[9px]">
                          {opt.key}
                        </span>
                        {optionImage ? (
                          <img 
                            src={optionImage} 
                            alt={`Pilihan ${opt.key}`}
                            className="w-full h-auto rounded mt-3 max-h-16 object-contain"
                            onError={(e) => {
                              const target = e.currentTarget;
                              target.style.display = 'none';
                              const fallback = document.createElement('div');
                              fallback.className = 'w-full aspect-square bg-red-50 dark:bg-red-900/20 rounded flex items-center justify-center mt-3 p-1';
                              const errorSpan = document.createElement('span');
                              errorSpan.className = 'text-red-500 text-[8px] text-center';
                              errorSpan.textContent = 'Gagal';
                              fallback.appendChild(errorSpan);
                              target.parentNode?.appendChild(fallback);
                            }}
                          />
                        ) : (
                          <div className="w-full aspect-square bg-muted rounded flex items-center justify-center mt-3">
                            <span className="text-muted-foreground text-[9px]">{opt.key}</span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                // Layout standar untuk pilihan jawaban teks - compact
                <div className="space-y-1">
                  {question.options.map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() => handleAnswer(opt.key)}
                      className={`answer-option w-full text-left flex gap-2 p-1.5 md:p-2 ${
                        answers[question.id] === opt.key ? 'answer-option-selected' : ''
                      }`}
                    >
                      <span className="w-5 h-5 rounded-full bg-secondary flex items-center justify-center font-semibold flex-shrink-0 text-[11px]">
                        {opt.key}
                      </span>
                      <span className="text-xs md:text-sm leading-snug"><LatexText>{opt.text}</LatexText></span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Navigation Buttons - Compact, always at bottom */}
            <div className="flex justify-between gap-2 mt-2 pt-1.5 border-t flex-shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
                disabled={currentQuestion === 0}
                className="border-primary text-primary hover:bg-primary/10 h-8 text-xs"
              >
                <ChevronLeft className="w-3 h-3 mr-0.5" /> Prev
              </Button>
              <Button
                size="sm"
                onClick={() => setCurrentQuestion(currentQuestion === 109 ? 0 : currentQuestion + 1)}
                className="bg-primary hover:bg-primary/90 h-8 text-xs"
              >
                Next <ChevronRight className="w-3 h-3 ml-0.5" />
              </Button>
            </div>
          </Card>
        </main>

        {/* Desktop: Right Sidebar - Question Navigation */}
        <aside className="hidden lg:flex w-64 bg-card border-l flex-col flex-shrink-0">
          <QuestionNavGrid 
            answers={answers} 
            currentQuestion={currentQuestion} 
            onNavClick={handleNavClick} 
          />
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
            <SheetContent side="right" className="w-[280px] p-0 flex flex-col">
              <VisuallyHidden>
                <SheetTitle>Navigasi Soal</SheetTitle>
              </VisuallyHidden>
              <QuestionNavGrid 
                answers={answers} 
                currentQuestion={currentQuestion} 
                onNavClick={handleNavClick} 
              />
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </div>
  );
};

export default Exam;
