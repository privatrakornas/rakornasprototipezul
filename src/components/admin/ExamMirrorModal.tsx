import { useState, memo, useEffect, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { 
  X, 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  Eye, 
  Radio, 
  CheckCircle, 
  User,
  ZoomIn,
  BookOpen,
  MousePointer
} from 'lucide-react';
import { useExamMirror } from '@/hooks/useExamMirror';
import LatexText from '@/components/LatexText';
import { Skeleton } from '@/components/ui/skeleton';
import { questions } from '@/data/questions';

interface ExamMirrorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string | null;
  sessionName: string;
  isLive?: boolean;
}

// Memoized Question Nav Grid for Mirror View
interface MirrorNavGridProps {
  answers: Record<number, string>;
  currentQuestion: number;
  participantQuestion?: number; // The question participant is viewing (for live mode)
  onNavClick: (idx: number) => void;
  isReviewMode?: boolean;
}

const MirrorNavGrid = memo(({ answers, currentQuestion, participantQuestion, onNavClick, isReviewMode }: MirrorNavGridProps) => {
  const isAnswered = (id: number) => answers[id] !== undefined;

  return (
    <div className="flex flex-col h-full">
      <div className="px-2 py-1.5 border-b flex-shrink-0">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-semibold text-xs">
            {isReviewMode ? 'Review Mode' : 'Live Tracking'}
          </h3>
          <div className="flex items-center gap-2 text-[10px]">
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded bg-green-500" />
              <span className="font-medium">{Object.keys(answers).length}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded bg-muted border" />
              <span className="font-medium">{110 - Object.keys(answers).length}</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex-1 p-2 overflow-y-auto">
        <div className="grid grid-cols-10 gap-1" style={{ gridTemplateRows: 'repeat(11, minmax(24px, 1fr))' }}>
          {questions.map((q, idx) => {
            const answered = isAnswered(q.id);
            const selectedLetter = answers[q.id];
            const isParticipantViewing = !isReviewMode && participantQuestion === idx;
            const isAdminViewing = currentQuestion === idx;
            
            return (
              <button
                key={q.id}
                onClick={() => onNavClick(idx)}
                className={`w-full h-full min-h-[24px] max-h-[36px] rounded font-bold border transition-all flex flex-col items-center justify-center hover:opacity-80 relative ${
                  isAdminViewing
                    ? 'bg-primary text-primary-foreground border-primary ring-2 ring-primary/50'
                    : isParticipantViewing
                    ? 'bg-amber-500 text-white border-amber-500 animate-pulse'
                    : answered
                    ? 'bg-green-500 text-white border-green-500'
                    : 'bg-muted border-border text-muted-foreground'
                }`}
                title={`Soal ${q.id}${selectedLetter ? `: ${selectedLetter}` : ''}${isParticipantViewing ? ' (Peserta di sini)' : ''}`}
              >
                <span className="text-[8px] leading-none opacity-70">{q.id}</span>
                {answered && (
                  <span className="text-xs leading-none font-extrabold">{selectedLetter}</span>
                )}
                {/* Indicator for participant's current position */}
                {isParticipantViewing && !isAdminViewing && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 rounded-full border border-white flex items-center justify-center">
                    <MousePointer className="w-2 h-2 text-amber-900" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
      
      {/* Legend for live mode */}
      {!isReviewMode && (
        <div className="px-2 py-1.5 border-t flex-shrink-0 text-[10px] text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded bg-amber-500 animate-pulse" />
              <span>Posisi Peserta</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

MirrorNavGrid.displayName = 'MirrorNavGrid';

// Timer display component
const LiveTimer = memo(({ startedAt }: { startedAt: string | null }) => {
  const [timeDisplay, setTimeDisplay] = useState('--:--');

  useEffect(() => {
    if (!startedAt) {
      setTimeDisplay('--:--');
      return;
    }

    const updateTimer = () => {
      const started = new Date(startedAt).getTime();
      const now = Date.now();
      const elapsed = Math.floor((now - started) / 1000);
      const remaining = Math.max(0, 100 * 60 - elapsed); // 100 minutes max
      
      const mins = Math.floor(remaining / 60);
      const secs = remaining % 60;
      setTimeDisplay(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  return (
    <span className="font-mono text-lg font-bold">{timeDisplay}</span>
  );
});

LiveTimer.displayName = 'LiveTimer';

const ExamMirrorModal = ({ 
  open, 
  onOpenChange, 
  sessionId, 
  sessionName,
  isLive = false 
}: ExamMirrorModalProps) => {
  const [localQuestion, setLocalQuestion] = useState(0); // Admin's viewing position
  const [isFollowingParticipant, setIsFollowingParticipant] = useState(true); // Auto-follow toggle
  const [zoomImage, setZoomImage] = useState<string | null>(null);
  const prevQuestionIndexRef = useRef<number>(0);
  
  const { 
    session, 
    answers, 
    isLoading, 
    currentQuestionIndex, // Realtime synced from participant
    setCurrentQuestionIndex 
  } = useExamMirror(open ? sessionId : null);
  
  // Determine if this is review mode (finished session)
  const isReviewMode = session?.status !== 'ongoing';
  
  // For live mode with auto-follow, sync admin's view to participant's position
  useEffect(() => {
    if (!isReviewMode && isFollowingParticipant && currentQuestionIndex !== prevQuestionIndexRef.current) {
      console.log('[ExamMirror] Auto-syncing to participant position:', currentQuestionIndex);
      setLocalQuestion(currentQuestionIndex);
      prevQuestionIndexRef.current = currentQuestionIndex;
    }
  }, [currentQuestionIndex, isReviewMode, isFollowingParticipant]);
  
  const question = questions[localQuestion];

  const handleNavClick = useCallback((idx: number) => {
    setLocalQuestion(idx);
    // If admin manually navigates, temporarily disable auto-follow in live mode
    if (!isReviewMode && isFollowingParticipant) {
      setIsFollowingParticipant(false);
    }
  }, [isReviewMode, isFollowingParticipant]);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setLocalQuestion(0);
      setIsFollowingParticipant(true);
      prevQuestionIndexRef.current = 0;
    }
  }, [open]);

  // Toggle auto-follow function
  const toggleFollowParticipant = useCallback(() => {
    if (!isFollowingParticipant) {
      // Re-enable and immediately sync to participant's current position
      setIsFollowingParticipant(true);
      setLocalQuestion(currentQuestionIndex);
    } else {
      setIsFollowingParticipant(false);
    }
  }, [isFollowingParticipant, currentQuestionIndex]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[100vw] max-h-[100vh] w-screen h-screen p-0 m-0 border-none rounded-none gap-0 [&>button]:hidden">
          <VisuallyHidden>
            <DialogTitle>Mode Intip - {sessionName}</DialogTitle>
          </VisuallyHidden>

          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-4">
                <Skeleton className="w-48 h-8 mx-auto" />
                <Skeleton className="w-64 h-4 mx-auto" />
                <p className="text-muted-foreground">Memuat data ujian...</p>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col bg-gradient-to-b from-background to-secondary/30">
              {/* Header - Admin Mirror View */}
              <header className="bg-gradient-to-r from-indigo-600 to-purple-600 py-2 flex-shrink-0 shadow-lg">
                <div className="container mx-auto flex justify-between items-center px-3 md:px-4">
                  {/* Left: Mode Intip Badge + Participant Name */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <Badge variant="secondary" className="flex items-center gap-1 bg-white/20 text-white border-white/30">
                      <Eye className="w-3 h-3" />
                      Mode Intip
                    </Badge>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-white/80" />
                        <span className="text-white font-semibold text-sm md:text-base truncate">
                          {session?.name || sessionName}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-white/70 text-xs">
                        <span>{session?.answered_count || 0}/{session?.total_questions || 110} soal</span>
                        {!isReviewMode && session?.status === 'ongoing' && (
                          <Badge variant="destructive" className="animate-pulse text-[10px] py-0 px-1.5 gap-1">
                            <Radio className="w-2.5 h-2.5" />
                            LIVE
                          </Badge>
                        )}
                        {isReviewMode && (
                          <Badge variant="secondary" className="bg-accent/20 text-accent-foreground text-[10px] py-0 px-1.5 gap-1">
                            <BookOpen className="w-2.5 h-2.5" />
                            Review Mode
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    {/* Auto-follow toggle for live mode */}
                    {!isReviewMode && session?.status === 'ongoing' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={toggleFollowParticipant}
                        className={`text-white hover:bg-white/20 text-xs h-7 px-2 ${
                          isFollowingParticipant ? 'bg-white/20' : 'opacity-70'
                        }`}
                      >
                        <MousePointer className="w-3 h-3 mr-1" />
                        {isFollowingParticipant ? 'Mengikuti' : 'Tidak Mengikuti'}
                      </Button>
                    )}
                  </div>
                  
                  {/* Center: Score Display */}
                  <div className="hidden md:flex items-center gap-4 text-white text-sm">
                    <div className="text-center">
                      <p className="text-white/60 text-[10px]">TWK</p>
                      <p className="font-bold">{session?.twk_score || 0}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-white/60 text-[10px]">TIU</p>
                      <p className="font-bold">{session?.tiu_score || 0}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-white/60 text-[10px]">TKP</p>
                      <p className="font-bold">{session?.tkp_score || 0}</p>
                    </div>
                    <div className="text-center border-l border-white/30 pl-4">
                      <p className="text-white/60 text-[10px]">Total</p>
                      <p className="font-bold text-lg">{session?.total_score || 0}</p>
                    </div>
                  </div>

                  {/* Right: Timer & Close Button */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {isLive && session?.status === 'ongoing' && (
                      <div className="flex items-center gap-1.5 text-white">
                        <Clock className="w-4 h-4" />
                        <LiveTimer startedAt={session?.started_at || null} />
                      </div>
                    )}
                    {session?.status === 'finished' && session?.duration_minutes && (
                      <div className="flex items-center gap-1.5 text-white text-sm">
                        <Clock className="w-4 h-4" />
                        <span>{session.duration_minutes} menit</span>
                      </div>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onOpenChange(false)}
                      className="text-white hover:bg-white/20 h-8 w-8 p-0"
                    >
                      <X className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              </header>

              {/* Main Content */}
              <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
                {/* Question Panel */}
                <main className="flex-1 p-2 md:p-4 min-h-0 overflow-y-auto">
                  <Card className="p-3 md:p-4 h-full flex flex-col">
                    {/* Question Header */}
                    <div className="flex items-center justify-between gap-2 mb-2 flex-shrink-0">
                      <span className="text-muted-foreground text-sm">Soal {question.id}/110</span>
                      <Badge variant="outline" className="text-xs">
                        {question.category} - {question.code}
                      </Badge>
                    </div>

                    {/* Question Text */}
                    <div className="text-sm md:text-base leading-relaxed mb-3 whitespace-pre-line flex-shrink-0">
                      <LatexText>{question.text}</LatexText>
                    </div>

                    {/* Question Image */}
                    {question.imageUrl && (
                      <div className="mb-3 flex-shrink-0">
                        <div 
                          className="relative inline-block cursor-zoom-in"
                          onClick={() => setZoomImage(question.imageUrl!)}
                        >
                          <img 
                            src={question.imageUrl} 
                            alt={`Gambar soal ${question.id}`}
                            className="max-w-full max-h-48 md:max-h-64 rounded-lg border shadow-sm object-contain"
                          />
                          <div className="absolute top-2 right-2 px-2 py-1 rounded-full bg-black/60 text-white text-[10px] flex items-center gap-1">
                            <ZoomIn className="w-3 h-3" />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Answer Options - Read Only with Visual Indicator */}
                    <div className="flex-1 min-h-0 overflow-y-auto">
                      {question.optionImageUrls ? (
                        // Image-based options
                        <div className="grid grid-cols-5 gap-2">
                          {question.options.map((opt) => {
                            const isSelected = answers[question.id] === opt.key;
                            const optionImage = question.optionImageUrls?.[opt.key as 'A' | 'B' | 'C' | 'D' | 'E'];
                            return (
                              <div 
                                key={opt.key} 
                                className={`relative flex flex-col items-center p-2 rounded-lg border-2 transition-all ${
                                  isSelected 
                                    ? 'border-green-500 bg-green-50 dark:bg-green-900/30 ring-2 ring-green-500/30' 
                                    : 'border-border'
                                }`}
                              >
                                <span className={`absolute top-1 left-1 w-5 h-5 rounded-full flex items-center justify-center font-semibold text-[10px] ${
                                  isSelected ? 'bg-green-500 text-white' : 'bg-muted'
                                }`}>
                                  {opt.key}
                                </span>
                                {isSelected && (
                                  <CheckCircle className="absolute top-1 right-1 w-4 h-4 text-green-500" />
                                )}
                                {optionImage && (
                                  <img 
                                    src={optionImage} 
                                    alt={`Pilihan ${opt.key}`}
                                    className="w-full h-auto rounded mt-4 max-h-20 object-contain"
                                  />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        // Text-based options
                        <div className="space-y-2">
                          {question.options.map((opt) => {
                            const isSelected = answers[question.id] === opt.key;
                            return (
                              <div
                                key={opt.key}
                                className={`flex items-start gap-3 p-2.5 md:p-3 rounded-lg border-2 transition-all ${
                                  isSelected 
                                    ? 'border-green-500 bg-green-50 dark:bg-green-900/30 ring-2 ring-green-500/30' 
                                    : 'border-border bg-card'
                                }`}
                              >
                                <span className={`w-6 h-6 rounded-full flex items-center justify-center font-semibold flex-shrink-0 text-sm ${
                                  isSelected ? 'bg-green-500 text-white' : 'bg-muted'
                                }`}>
                                  {opt.key}
                                </span>
                                <span className="text-sm md:text-base flex-1">
                                  <LatexText>{opt.text}</LatexText>
                                </span>
                                {isSelected && (
                                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Navigation Buttons - Admin controls for review or manual navigation */}
                    <div className="flex justify-between gap-2 mt-3 pt-3 border-t flex-shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setLocalQuestion(Math.max(0, localQuestion - 1));
                          if (!isReviewMode) setIsFollowingParticipant(false);
                        }}
                        disabled={localQuestion === 0}
                        className="h-9"
                      >
                        <ChevronLeft className="w-4 h-4 mr-1" /> Prev
                      </Button>
                      <span className="flex items-center text-sm text-muted-foreground">
                        {localQuestion + 1} / 110
                      </span>
                      <Button
                        size="sm"
                        onClick={() => {
                          setLocalQuestion(localQuestion === 109 ? 0 : localQuestion + 1);
                          if (!isReviewMode) setIsFollowingParticipant(false);
                        }}
                        className="h-9"
                      >
                        Next <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </Card>
                </main>

                {/* Right Sidebar - Question Navigation */}
                <aside className="hidden lg:flex w-64 bg-card border-l flex-col flex-shrink-0">
                  <MirrorNavGrid 
                    answers={answers} 
                    currentQuestion={localQuestion}
                    participantQuestion={isReviewMode ? undefined : currentQuestionIndex}
                    onNavClick={handleNavClick}
                    isReviewMode={isReviewMode}
                  />
                </aside>
              </div>

              {/* Mobile Score Bar */}
              <div className="md:hidden flex items-center justify-around py-2 px-3 bg-card border-t text-xs">
                <div className="text-center">
                  <p className="text-muted-foreground">TWK</p>
                  <p className="font-bold">{session?.twk_score || 0}</p>
                </div>
                <div className="text-center">
                  <p className="text-muted-foreground">TIU</p>
                  <p className="font-bold">{session?.tiu_score || 0}</p>
                </div>
                <div className="text-center">
                  <p className="text-muted-foreground">TKP</p>
                  <p className="font-bold">{session?.tkp_score || 0}</p>
                </div>
                <div className="text-center border-l pl-4">
                  <p className="text-muted-foreground">Total</p>
                  <p className="font-bold text-primary">{session?.total_score || 0}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Zoom Image Dialog */}
      <Dialog open={!!zoomImage} onOpenChange={() => setZoomImage(null)}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-2 flex items-center justify-center">
          <VisuallyHidden>
            <DialogTitle>Gambar Diperbesar</DialogTitle>
          </VisuallyHidden>
          {zoomImage && (
            <img
              src={zoomImage}
              alt="Gambar diperbesar"
              className="max-w-full max-h-[90vh] object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ExamMirrorModal;
