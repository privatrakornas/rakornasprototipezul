import { useState, useEffect, useCallback, memo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogHeader, DialogFooter } from '@/components/ui/dialog';
import { questions } from '@/data/questions';
import { Clock, ChevronLeft, ChevronRight, Grid3X3, ZoomIn, X, AlertTriangle, ShieldAlert } from 'lucide-react';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import LatexText from '@/components/LatexText';
import { useExamSession } from '@/hooks/useExamSession';
import { useToast } from '@/hooks/use-toast';
import { useContentProtection } from '@/hooks/useContentProtection';
import { supabase } from '@/integrations/supabase/client';

const EXAM_TIME = 100 * 60; // 100 minutes in seconds
const MAX_DURATION_MINUTES = 100; // Cap duration at 100 minutes
const MIN_DURATION_MINUTES = 45; // Minimum 45 minutes before submit
const STATUS_CHECK_INTERVAL = 10000; // Check status every 10 seconds

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
  const { toast } = useToast();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [timeLeft, setTimeLeft] = useState(EXAM_TIME);
  const [navOpen, setNavOpen] = useState(false);
  const [zoomImage, setZoomImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [violationDialogOpen, setViolationDialogOpen] = useState(false);
  const [isAbortingSession, setIsAbortingSession] = useState(false);
  const sessionInitializedRef = useRef(false);
  const autoSubmitTriggeredRef = useRef(false);
  const statusCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const { createSession, updateScores, finishSession, abortSession } = useExamSession();
  
  // ============ CONTENT PROTECTION - ANTI-CHEAT ============
  // Disable right-click, copy-paste, keyboard shortcuts, etc.
  useContentProtection({
    showWarning: true,
    warningMessage: '⚠️ Aktivitas mencurigakan terdeteksi! Tindakan ini tercatat.',
  });
  
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
  const deviceFingerprint = sessionStorage.getItem('deviceFingerprint') || 'unknown';

  // Calculate elapsed time in minutes
  const getElapsedMinutes = useCallback(() => {
    const elapsedSeconds = EXAM_TIME - timeLeft;
    return Math.floor(elapsedSeconds / 60);
  }, [timeLeft]);

  // Check if minimum time requirement is met
  const canSubmit = getElapsedMinutes() >= MIN_DURATION_MINUTES;

  // ============ REAL-TIME STATUS VALIDATION ============
  // Check if session was aborted by admin or system every X seconds
  // If status is no longer 'ongoing', force logout immediately
  useEffect(() => {
    const checkSessionStatus = async () => {
      const sessionId = sessionStorage.getItem('examSessionId');
      if (!sessionId) return;

      try {
        const { data, error } = await supabase
          .from('exam_sessions')
          .select('status')
          .eq('id', sessionId)
          .single();

        if (error) {
          console.error('[STATUS CHECK] Error checking session status:', error);
          return;
        }

        // If status is not 'ongoing', force logout
        if (data && data.status !== 'ongoing') {
          console.log(`[STATUS CHECK] Session status changed to "${data.status}" - forcing logout`);
          
          // Clear session data
          sessionStorage.removeItem('examSession');
          sessionStorage.removeItem('userName');
          sessionStorage.removeItem('examStartedAt');
          sessionStorage.removeItem('examSessionId');
          
          // Show notification and redirect
          toast({
            title: 'Sesi Ujian Berakhir',
            description: `Status ujian Anda: ${data.status}. Anda akan dialihkan ke halaman login.`,
            variant: 'destructive',
            duration: 5000,
          });
          
          navigate('/');
        }
      } catch (err) {
        console.error('[STATUS CHECK] Error:', err);
      }
    };

    // Check immediately on mount
    checkSessionStatus();

    // Set up interval to check periodically
    statusCheckIntervalRef.current = setInterval(checkSessionStatus, STATUS_CHECK_INTERVAL);

    return () => {
      if (statusCheckIntervalRef.current) {
        clearInterval(statusCheckIntervalRef.current);
      }
    };
  }, [navigate, toast]);

  // Create exam session on mount
  useEffect(() => {
    const initSession = async () => {
      // Check if we already have a session
      const existingSessionId = sessionStorage.getItem('examSessionId');
      if (existingSessionId || sessionInitializedRef.current) {
        return;
      }
      
      sessionInitializedRef.current = true;
      await createSession(userName, deviceFingerprint, examStartedAt);
    };
    
    initSession();
  }, [userName, deviceFingerprint, examStartedAt, createSession]);

  // Anti-cheat: detect tab/window switch -> Show violation dialog
  // CRITICAL: Do NOT redirect immediately - wait for user confirmation and DB update
  useEffect(() => {
    const antiCheatTriggeredRef = { current: false };

    const handleViolation = () => {
      // Prevent multiple triggers and skip if already submitting or dialog open
      if (antiCheatTriggeredRef.current || isSubmitting || violationDialogOpen) return;
      
      antiCheatTriggeredRef.current = true;
      console.log('[ANTI-CHEAT] Detected tab/window switch - showing violation dialog');
      
      // Show the violation dialog - user must click button to proceed
      setViolationDialogOpen(true);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleViolation();
      }
    };

    const handleBlur = () => {
      handleViolation();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
    };
  }, [isSubmitting, violationDialogOpen]);

  // Handle violation dialog confirmation - AWAIT database update before redirect
  const handleViolationConfirm = useCallback(async () => {
    setIsAbortingSession(true);
    console.log('[ANTI-CHEAT] User confirmed violation, updating database...');

    // STEP 1: FORCE UPDATE DATABASE FIRST - set status to 'aborted'
    let updateSuccess = false;
    let retryCount = 0;
    const maxRetries = 3;

    while (!updateSuccess && retryCount < maxRetries) {
      console.log(`[ANTI-CHEAT] Attempt ${retryCount + 1} to update database with status 'aborted'...`);
      updateSuccess = await abortSession();
      
      if (!updateSuccess) {
        retryCount++;
        if (retryCount < maxRetries) {
          // Wait 500ms before retry
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    }

    // STEP 2: Check if update succeeded
    if (!updateSuccess) {
      console.error('[ANTI-CHEAT] Failed to update database after retries');
      setIsAbortingSession(false);
      toast({
        title: 'Gagal menyimpan status ujian',
        description: 'Koneksi bermasalah. Mohon coba lagi.',
        variant: 'destructive',
        duration: 6000,
      });
      return;
    }

    console.log('[ANTI-CHEAT] Database updated successfully with status "aborted", now redirecting');

    // STEP 3: Clear local session ONLY AFTER backend status is confirmed updated
    sessionStorage.removeItem('examSession');
    sessionStorage.removeItem('userName');
    sessionStorage.removeItem('examStartedAt');
    sessionStorage.removeItem('examSessionId');
    
    // STEP 4: FINALLY redirect to home
    navigate('/');
  }, [navigate, abortSession, toast]);

  // Handle submit function
  const handleSubmit = useCallback(async (isAutoSubmit = false) => {
    // Prevent double submission
    if (isSubmitting) return;
    
    // Check minimum time if not auto-submit
    if (!isAutoSubmit && !canSubmit) {
      toast({
        title: "Waktu Pengerjaan Belum Cukup",
        description: `Periksa Kembali dan Kerjakan dengan Benar. Waktu pengerjaan minimal ${MIN_DURATION_MINUTES} menit. Sisa waktu: ${Math.ceil((MIN_DURATION_MINUTES * 60 - (EXAM_TIME - timeLeft)) / 60)} menit lagi.`,
        variant: "destructive",
        duration: 5000,
      });
      return;
    }

    // Check unanswered questions only if not auto-submit
    const unanswered = questions.filter(q => !answers[q.id]).length;
    if (!isAutoSubmit && unanswered > 0 && timeLeft > 0) {
      const confirmSubmit = window.confirm(
        `Masih ada ${unanswered} soal belum dijawab. Yakin ingin submit?`
      );
      if (!confirmSubmit) return;
    }
    
    setIsSubmitting(true);
    
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
    
    // Finish the exam session (MUST succeed before navigation)
    const finishedOk = await finishSession(durationMinutes);
    if (!finishedOk) {
      setIsSubmitting(false);
      toast({
        title: 'Gagal submit ujian',
        description: 'Status ujian gagal disimpan. Pastikan koneksi stabil lalu coba lagi.',
        variant: 'destructive',
        duration: 6000,
      });
      return;
    }

    // Store all timing data
    localStorage.setItem('examAnswers', JSON.stringify(answers));
    localStorage.setItem('examDuration', String(durationMinutes));
    localStorage.setItem('examStartedAt', examStartedAt);
    localStorage.setItem('examFinishedAt', finishedAt);

    navigate('/results');
  }, [answers, navigate, timeLeft, examStartedAt, finishSession, canSubmit, toast, isSubmitting]);

  // Timer with auto-submit
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          // Auto-submit when time is up
          if (!autoSubmitTriggeredRef.current) {
            autoSubmitTriggeredRef.current = true;
            handleSubmit(true);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [handleSubmit]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAnswer = (key: string) => {
    const currentQ = questions[currentQuestion];
    setAnswers(prev => {
      const newAnswers = { ...prev, [currentQ.id]: key };
      // Update scores in real-time with last answered question info
      updateScores(newAnswers, {
        id: currentQ.id,
        category: currentQ.category,
        answer: key,
      });
      return newAnswers;
    });
  };

  const handleNavClick = useCallback((idx: number) => {
    setCurrentQuestion(idx);
    setNavOpen(false);
  }, []);

  const question = questions[currentQuestion];

  // Calculate remaining time until submit is allowed
  const minutesUntilCanSubmit = Math.max(0, MIN_DURATION_MINUTES - getElapsedMinutes());

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
            <div className="relative">
              <Button 
                onClick={() => handleSubmit(false)} 
                size="sm" 
                disabled={!canSubmit || isSubmitting}
                className={`text-xs md:text-sm px-3 md:px-5 font-semibold transition-all ${
                  canSubmit 
                    ? 'bg-primary hover:bg-primary/90 text-white' 
                    : 'bg-gray-400 cursor-not-allowed text-gray-200'
                }`}
                title={!canSubmit ? `Tunggu ${minutesUntilCanSubmit} menit lagi` : 'Submit ujian'}
              >
                {isSubmitting ? (
                  'Menyimpan...'
                ) : (
                  <>
                    <span className="hidden sm:inline">Selesai & </span>Submit
                  </>
                )}
              </Button>
              {!canSubmit && (
                <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[9px] text-yellow-200 whitespace-nowrap flex items-center gap-0.5">
                  <AlertTriangle className="w-2.5 h-2.5" />
                  Min. {minutesUntilCanSubmit}m lagi
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        {/* Main Question Panel - Mobile: scrollable content area */}
        <main className="flex-1 p-2 md:p-3 pb-24 lg:pb-3 min-h-0 overflow-y-auto">
          <Card className="p-2 md:p-3 animate-fade-in flex flex-col min-h-full">
            {/* Question Header - Compact */}
            <div className="flex items-center justify-between gap-2 mb-1.5 flex-shrink-0">
              <span className="text-muted-foreground text-[11px]">Soal {question.id}/110</span>
              <span className="px-1.5 py-0.5 bg-accent/20 text-accent rounded text-[10px] font-medium">
                {question.category} - {question.code}
              </span>
            </div>

            {/* Question Text - Adaptive font & tight leading */}
            <div className="text-sm md:text-base leading-snug mb-2 whitespace-pre-line flex-shrink-0">
              <LatexText>{question.text}</LatexText>
            </div>

            {/* Gambar Soal - dengan zoom untuk soal figural 61-65 */}
            {question.imageUrl && (
              <div className={`mb-2 flex-shrink-0 relative ${[61, 62, 63, 64, 65].includes(question.id) ? 'w-full' : 'inline-block'}`}>
                {/* Gambar figural dengan ukuran lebih besar di mobile */}
                {[61, 62, 63, 64, 65].includes(question.id) ? (
                  <div 
                    className="relative w-full bg-muted/30 rounded-xl p-3 border-2 border-dashed border-primary/30 cursor-zoom-in active:scale-[0.98] transition-transform"
                    onClick={() => setZoomImage(question.imageUrl!)}
                  >
                    {/* Zoom indicator overlay */}
                    <div className="absolute top-2 right-2 z-10 px-2 py-1 rounded-full bg-primary text-primary-foreground text-[10px] font-medium flex items-center gap-1 shadow-lg">
                      <ZoomIn className="w-3 h-3" />
                      <span className="hidden sm:inline">Perbesar</span>
                    </div>
                    
                    <img 
                      src={question.imageUrl} 
                      alt={`Gambar soal figural ${question.id}`}
                      className="w-full max-h-48 sm:max-h-56 md:max-h-64 h-auto mx-auto rounded-lg object-contain"
                      onError={(e) => {
                        const target = e.currentTarget;
                        target.style.display = 'none';
                      }}
                    />
                    
                    {/* Label instruksi */}
                    <p className="text-xs text-center text-primary font-medium mt-2 flex items-center justify-center gap-1.5">
                      <ZoomIn className="w-4 h-4" />
                      Ketuk gambar untuk memperbesar
                    </p>
                  </div>
                ) : (
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
                )}
              </div>
            )}
            
            {question.hasImage && !question.imageUrl && (
              <p className="text-muted-foreground italic mb-2 text-[11px] bg-yellow-50 dark:bg-yellow-900/20 p-1.5 rounded-lg border border-yellow-200 dark:border-yellow-800 flex-shrink-0">
                [Soal bergambar - Upload gambar di database untuk soal ini]
              </p>
            )}

            {/* Pilihan Jawaban - always visible, parent scrolls */}
            <div className="flex-1 min-h-0 pb-4">
              {question.optionImageUrls ? (
                // Grid layout untuk pilihan jawaban bergambar (figural)
                <>
                  <div className="flex items-center justify-end mb-1">
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <ZoomIn className="w-3 h-3" /> Tap gambar untuk zoom
                    </span>
                  </div>
                  <div className="grid grid-cols-5 gap-1.5">
                    {question.options.map((opt) => {
                      const optionImage = question.optionImageUrls?.[opt.key as 'A' | 'B' | 'C' | 'D' | 'E'];
                      return (
                        <div key={opt.key} className="relative flex flex-col items-center">
                          {/* Zoom button */}
                          {optionImage && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setZoomImage(optionImage);
                              }}
                              className="absolute top-0 right-0 z-10 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
                              title="Perbesar gambar"
                            >
                              <ZoomIn className="w-3 h-3" />
                            </button>
                          )}
                          <button
                            onClick={() => handleAnswer(opt.key)}
                            className={`w-full relative flex flex-col items-center p-1.5 rounded-lg border-2 transition-all ${
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
                                className="w-full h-auto rounded mt-3 max-h-16 object-contain cursor-zoom-in"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setZoomImage(optionImage);
                                }}
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
                        </div>
                      );
                    })}
                  </div>
                </>
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

      {/* Fullscreen Zoom Image Modal - Optimized for Mobile */}
      <Dialog open={!!zoomImage} onOpenChange={() => setZoomImage(null)}>
        <DialogContent className="w-screen h-screen max-w-none max-h-none p-0 m-0 flex flex-col items-center justify-center bg-black border-none rounded-none [&>button]:hidden">
          <VisuallyHidden>
            <DialogTitle>Gambar Diperbesar</DialogTitle>
          </VisuallyHidden>
          
          {/* Large Close Button - Easy to tap on mobile */}
          <button
            onClick={() => setZoomImage(null)}
            className="absolute top-4 right-4 z-50 w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm text-white flex items-center justify-center hover:bg-white/30 active:bg-white/40 transition-colors shadow-lg border border-white/20"
            aria-label="Tutup gambar"
          >
            <X className="w-7 h-7" />
          </button>
          
          {/* Close instruction text */}
          <p className="absolute top-5 left-4 text-white/70 text-xs flex items-center gap-1">
            <X className="w-3 h-3" /> Ketuk untuk tutup
          </p>
          
          {/* Fullscreen Image Container */}
          <div 
            className="w-full h-full flex items-center justify-center p-4"
            onClick={() => setZoomImage(null)}
          >
            {zoomImage && (
              <img
                src={zoomImage}
                alt="Gambar diperbesar"
                className="max-w-full max-h-full object-contain"
                onClick={(e) => e.stopPropagation()}
              />
            )}
          </div>
          
          {/* Bottom hint */}
          <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/50 text-xs">
            Ketuk di luar gambar atau tombol X untuk menutup
          </p>
        </DialogContent>
      </Dialog>

      {/* Violation Dialog - Shown when anti-cheat detects tab/window switch */}
      <Dialog open={violationDialogOpen} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="w-5 h-5" />
              Pelanggaran Terdeteksi!
            </DialogTitle>
            <DialogDescription className="text-left pt-2">
              Anda terdeteksi <strong>meninggalkan halaman ujian</strong>. 
              Sesuai aturan, ujian Anda akan <strong>dibatalkan</strong> dan status akan dicatat sebagai <strong>"Aborted"</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 text-sm">
            <p className="text-destructive font-medium">⚠️ Peringatan:</p>
            <ul className="list-disc list-inside mt-1 text-muted-foreground text-xs space-y-1">
              <li>Skor Anda tidak akan masuk ke papan peringkat</li>
              <li>Anda harus mendaftar ulang untuk mengikuti ujian</li>
              <li>Aktivitas ini tercatat di sistem</li>
            </ul>
          </div>
          <DialogFooter>
            <Button 
              onClick={handleViolationConfirm}
              disabled={isAbortingSession}
              variant="destructive"
              className="w-full"
            >
              {isAbortingSession ? 'Menyimpan Status...' : 'Kembali ke Login'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Exam;
