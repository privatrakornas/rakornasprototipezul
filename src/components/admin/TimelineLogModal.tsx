import { useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Clock, 
  ChevronRight, 
  ChevronLeft, 
  Grid3X3, 
  Send, 
  Timer,
  Play,
  ArrowRight,
} from 'lucide-react';

interface NavigationEvent {
  timestamp: string;
  remainingTimeSeconds: number;
  questionNumber: number;
  action: string;
  previousQuestion?: number;
}

interface TimelineEntry {
  startTime: string;
  endTime: string;
  durationSeconds: number;
  questionNumber: number;
  action: string;
  actionLabel: string;
  previousQuestion?: number;
}

interface TimelineLogModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  participantName: string;
  navigationLog: NavigationEvent[] | null;
  examDurationMinutes: number;
}

const EXAM_TIME_SECONDS = 100 * 60; // 100 minutes

const formatRemainingTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const formatDuration = (seconds: number): string => {
  if (seconds < 60) {
    return `${seconds} detik`;
  }
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (secs === 0) {
    return `${mins} menit`;
  }
  return `${mins} menit ${secs} detik`;
};

const getActionIcon = (action: string) => {
  switch (action) {
    case 'next':
      return <ChevronRight className="w-4 h-4 text-blue-500" />;
    case 'prev':
      return <ChevronLeft className="w-4 h-4 text-orange-500" />;
    case 'jump':
      return <Grid3X3 className="w-4 h-4 text-purple-500" />;
    case 'submit':
    case 'auto_submit':
      return <Send className="w-4 h-4 text-green-500" />;
    case 'start':
      return <Play className="w-4 h-4 text-emerald-500" />;
    default:
      return <ArrowRight className="w-4 h-4 text-gray-500" />;
  }
};

const getActionLabel = (action: string, prevQ?: number): string => {
  switch (action) {
    case 'next':
      return 'Klik Next';
    case 'prev':
      return 'Klik Previous';
    case 'jump':
      return prevQ ? `Lompat dari Soal ${prevQ}` : 'Lompat Navigasi';
    case 'submit':
      return 'Submit Ujian';
    case 'auto_submit':
      return 'Auto-Submit (Waktu Habis)';
    case 'start':
      return 'Mulai Ujian';
    default:
      return action;
  }
};

const getActionBadgeVariant = (action: string): "default" | "secondary" | "destructive" | "outline" => {
  switch (action) {
    case 'next':
    case 'prev':
      return 'secondary';
    case 'jump':
      return 'outline';
    case 'submit':
    case 'auto_submit':
      return 'default';
    default:
      return 'secondary';
  }
};

export const TimelineLogModal = ({
  open,
  onOpenChange,
  participantName,
  navigationLog,
  examDurationMinutes,
}: TimelineLogModalProps) => {
  // Process navigation log into timeline entries
  const timelineEntries = useMemo((): TimelineEntry[] => {
    if (!navigationLog || navigationLog.length === 0) return [];
    
    const entries: TimelineEntry[] = [];
    
    // Sort by remaining time (descending - higher time = earlier in exam)
    const sortedLog = [...navigationLog].sort(
      (a, b) => b.remainingTimeSeconds - a.remainingTimeSeconds
    );
    
    for (let i = 0; i < sortedLog.length; i++) {
      const current = sortedLog[i];
      const next = sortedLog[i + 1];
      
      // Duration is the difference between current remaining time and next event's remaining time
      const durationSeconds = next 
        ? current.remainingTimeSeconds - next.remainingTimeSeconds
        : current.remainingTimeSeconds; // Last event - duration until 0
      
      entries.push({
        startTime: formatRemainingTime(current.remainingTimeSeconds),
        endTime: formatRemainingTime(next?.remainingTimeSeconds ?? 0),
        durationSeconds: Math.max(0, durationSeconds),
        questionNumber: current.questionNumber,
        action: current.action,
        actionLabel: getActionLabel(current.action, current.previousQuestion),
        previousQuestion: current.previousQuestion,
      });
    }
    
    return entries;
  }, [navigationLog]);
  
  // Calculate statistics
  const stats = useMemo(() => {
    if (!navigationLog || navigationLog.length === 0) return null;
    
    const totalEvents = navigationLog.length;
    const nextCount = navigationLog.filter(e => e.action === 'next').length;
    const prevCount = navigationLog.filter(e => e.action === 'prev').length;
    const jumpCount = navigationLog.filter(e => e.action === 'jump').length;
    
    // Find most visited questions
    const questionVisits: Record<number, number> = {};
    navigationLog.forEach(e => {
      questionVisits[e.questionNumber] = (questionVisits[e.questionNumber] || 0) + 1;
    });
    
    const mostVisited = Object.entries(questionVisits)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([q, count]) => ({ question: parseInt(q), count }));
    
    return {
      totalEvents,
      nextCount,
      prevCount,
      jumpCount,
      mostVisited,
    };
  }, [navigationLog]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Timer className="w-5 h-5 text-primary" />
            Jejak Alur Pengerjaan
          </DialogTitle>
          <DialogDescription>
            Timeline navigasi untuk <strong>{participantName}</strong>
            {examDurationMinutes && ` (Durasi: ${examDurationMinutes} menit)`}
          </DialogDescription>
        </DialogHeader>
        
        {!navigationLog || navigationLog.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Tidak ada data log navigasi tersedia.</p>
            <p className="text-xs mt-1">
              Data ini hanya tersedia untuk peserta yang submit setelah fitur ini diaktifkan.
            </p>
          </div>
        ) : (
          <>
            {/* Statistics Summary */}
            {stats && (
              <div className="grid grid-cols-4 gap-2 p-3 bg-muted/50 rounded-lg mb-3">
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary">{stats.totalEvents}</p>
                  <p className="text-xs text-muted-foreground">Total Aksi</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-500">{stats.nextCount}</p>
                  <p className="text-xs text-muted-foreground">Next</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-orange-500">{stats.prevCount}</p>
                  <p className="text-xs text-muted-foreground">Previous</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-500">{stats.jumpCount}</p>
                  <p className="text-xs text-muted-foreground">Lompat</p>
                </div>
              </div>
            )}
            
            {/* Most Visited Questions */}
            {stats && stats.mostVisited.length > 0 && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2 px-1">
                <span>Soal paling sering dikunjungi:</span>
                {stats.mostVisited.map(({ question, count }) => (
                  <Badge key={question} variant="outline" className="text-xs">
                    No. {question} ({count}x)
                  </Badge>
                ))}
              </div>
            )}
            
            {/* Timeline List */}
            <ScrollArea className="flex-1 min-h-0 pr-4">
              <div className="space-y-2">
                {timelineEntries.map((entry, idx) => (
                  <div 
                    key={idx}
                    className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                  >
                    {/* Timeline indicator */}
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                        {getActionIcon(entry.action)}
                      </div>
                      {idx < timelineEntries.length - 1 && (
                        <div className="w-0.5 h-4 bg-muted-foreground/20 mt-1" />
                      )}
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">
                            Soal No. {entry.questionNumber}
                          </span>
                          <Badge variant={getActionBadgeVariant(entry.action)} className="text-xs">
                            {entry.actionLabel}
                          </Badge>
                        </div>
                        <span className="text-xs font-medium text-primary whitespace-nowrap">
                          {formatDuration(entry.durationSeconds)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        <span>
                          {entry.startTime} → {entry.endTime}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </>
        )}
        
        <div className="flex justify-end pt-3 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Tutup
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TimelineLogModal;
