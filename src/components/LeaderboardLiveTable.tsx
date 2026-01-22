import { memo, useState, useEffect, useRef, useCallback } from 'react';
import { Table, TableBody, TableHead, TableHeader, TableRow, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Radio, Clock, Timer, CheckCircle, XCircle, Play, Pause, RotateCw } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import type { LeaderboardEntry } from '@/hooks/useRealtimeLeaderboard';
import { isLulus } from '@/hooks/useRealtimeLeaderboard';

const PASSING_GRADE = { TWK: 65, TIU: 80, TKP: 166 };
const TOTAL_QUESTIONS = 110;
const TOTAL_EXAM_TIME = 100;

interface LeaderboardLiveTableProps {
  data: LeaderboardEntry[];
}

// Live countdown timer component
const LiveCountdown = memo(({ startedAt }: { startedAt: string | null | undefined }) => {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!startedAt) return;

    const calculateTimeLeft = () => {
      const startTime = new Date(startedAt).getTime();
      const now = Date.now();
      const elapsedMs = now - startTime;
      const totalMs = TOTAL_EXAM_TIME * 60 * 1000;
      const remainingMs = Math.max(0, totalMs - elapsedMs);
      return Math.floor(remainingMs / 1000);
    };

    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [startedAt]);

  if (timeLeft === null || !startedAt) {
    return (
      <span className="text-yellow-600 font-medium flex items-center gap-1">
        <Timer className="w-3 h-3 animate-pulse" />
        Memulai...
      </span>
    );
  }

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  const isUrgent = timeLeft < 300;
  const isWarning = timeLeft < 600;

  return (
    <span 
      className={`font-mono font-bold flex items-center gap-1 ${
        isUrgent 
          ? 'text-red-600 animate-pulse' 
          : isWarning 
            ? 'text-yellow-600' 
            : 'text-blue-600'
      }`}
    >
      <Clock className={`w-3 h-3 ${isUrgent ? 'animate-bounce' : ''}`} />
      {formattedTime}
    </span>
  );
}, (prev, next) => prev.startedAt === next.startedAt);

LiveCountdown.displayName = 'LiveCountdown';

const getScoreClass = (score: number, type: 'TWK' | 'TIU' | 'TKP'): string => {
  const pg = PASSING_GRADE[type];
  if (score < pg) {
    return 'text-red-600 dark:text-red-500 font-semibold';
  }
  return '';
};

const LiveRow = memo(({ entry, rank }: { entry: LeaderboardEntry; rank: number }) => {
  const lulus = isLulus(entry);
  const progressPercent = ((entry.answered_count || 0) / TOTAL_QUESTIONS) * 100;
  
  return (
    <TableRow 
      key={entry.id} 
      className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-900/30 dark:via-indigo-900/30 dark:to-purple-900/30 border-l-4 border-blue-500 transition-all duration-300 hover:shadow-md"
    >
      <TableCell className="py-2">
        <div className="flex items-center justify-center">
          <Radio className="w-4 h-4 text-blue-500 animate-pulse" />
        </div>
      </TableCell>
      <TableCell className="font-medium text-xs py-2">
        <div className="flex flex-col gap-1">
          <span className="font-semibold">{entry.name}</span>
          <div className="flex items-center gap-1.5">
            <Progress value={progressPercent} className="h-1.5 w-16" />
            <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium whitespace-nowrap">
              ({entry.answered_count || 0}/{TOTAL_QUESTIONS})
            </span>
          </div>
        </div>
      </TableCell>
      <TableCell className="text-center text-xs py-2">
        <LiveCountdown startedAt={entry.started_at} />
      </TableCell>
      <TableCell className={`text-center text-xs py-2 ${getScoreClass(entry.twk_score, 'TWK')}`}>
        {entry.twk_score}
      </TableCell>
      <TableCell className={`text-center text-xs py-2 ${getScoreClass(entry.tiu_score, 'TIU')}`}>
        {entry.tiu_score}
      </TableCell>
      <TableCell className={`text-center text-xs py-2 ${getScoreClass(entry.tkp_score, 'TKP')}`}>
        {entry.tkp_score}
      </TableCell>
      <TableCell className="text-center font-bold text-xs py-2">
        {entry.total_score}
      </TableCell>
      <TableCell className="text-center py-2">
        <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
          lulus 
            ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300'
            : 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'
        }`}>
          {lulus ? <CheckCircle className="w-2.5 h-2.5" /> : <XCircle className="w-2.5 h-2.5" />}
          {lulus ? 'L' : 'TL'}
        </span>
      </TableCell>
    </TableRow>
  );
}, (prevProps, nextProps) => {
  const prev = prevProps.entry;
  const next = nextProps.entry;
  return (
    prevProps.rank === nextProps.rank &&
    prev.id === next.id &&
    prev.twk_score === next.twk_score &&
    prev.tiu_score === next.tiu_score &&
    prev.tkp_score === next.tkp_score &&
    prev.total_score === next.total_score &&
    prev.answered_count === next.answered_count &&
    prev.started_at === next.started_at
  );
});

LiveRow.displayName = 'LiveRow';

const LeaderboardLiveTable = memo(({ data }: LeaderboardLiveTableProps) => {
  const [autoScroll, setAutoScroll] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollDirectionRef = useRef<'down' | 'up'>('down');
  const scrollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Filter ongoing entries with strict zombie/ghost cleanup
  // CRITICAL: Only show entries with status === 'ongoing'
  // Aborted/abandoned/disqualified entries are removed by realtime handler immediately
  const liveData = data
    .filter(e => {
      // FILTER 1: STRICT - Only show 'ongoing' status 
      // NOT finished, NOT aborted, NOT abandoned, NOT disqualified
      if (e.status !== 'ongoing') {
        console.log(`[LIVE TABLE] Filtering out non-ongoing: ${e.name} (status=${e.status})`);
        return false;
      }
      
      // FILTER 2: Must have started_at for timer calculation
      if (!e.started_at) return true;

      const startedMs = new Date(e.started_at).getTime();
      if (Number.isNaN(startedMs)) return true;

      const elapsedMs = Date.now() - startedMs;
      const totalExamMs = TOTAL_EXAM_TIME * 60 * 1000;
      
      // FILTER 3: Hide if timer exceeded (with 30s tolerance for network lag)
      // Timer is calculated from database started_at, not local countdown
      const hardExpired = elapsedMs > totalExamMs + 30_000;
      if (hardExpired) {
        console.log(`[LIVE TABLE] Hiding expired entry: ${e.name} (elapsed > exam time + 30s)`);
        return false;
      }
      
      // FILTER 4: CLEANUP TIMER 00:00 with zero scores - ghost/inactive entries
      const timeLeftMs = totalExamMs - elapsedMs;
      const isTimerZero = timeLeftMs <= 0;
      const hasZeroScores = e.twk_score === 0 && e.tiu_score === 0 && e.tkp_score === 0;
      
      if (isTimerZero && hasZeroScores) {
        console.log(`[LIVE TABLE] Hiding ghost entry: ${e.name} (timer=0, scores=0)`);
        return false;
      }

      return true;
    })
    .sort((a, b) => {
      if (b.total_score !== a.total_score) return b.total_score - a.total_score;
      if (b.tkp_score !== a.tkp_score) return b.tkp_score - a.tkp_score;
      if (b.tiu_score !== a.tiu_score) return b.tiu_score - a.tiu_score;
      return b.twk_score - a.twk_score;
    });

  // Auto scroll logic
  const startAutoScroll = useCallback(() => {
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current);
    }

    scrollIntervalRef.current = setInterval(() => {
      const container = scrollContainerRef.current;
      if (!container) return;

      const { scrollTop, scrollHeight, clientHeight } = container;
      const maxScroll = scrollHeight - clientHeight;
      const scrollStep = 1; // pixels per interval

      if (scrollDirectionRef.current === 'down') {
        if (scrollTop >= maxScroll - 5) {
          // Reached bottom, change direction
          scrollDirectionRef.current = 'up';
        } else {
          container.scrollTop = scrollTop + scrollStep;
        }
      } else {
        if (scrollTop <= 5) {
          // Reached top, change direction
          scrollDirectionRef.current = 'down';
        } else {
          container.scrollTop = scrollTop - scrollStep;
        }
      }
    }, 50); // Scroll every 50ms for smooth animation
  }, []);

  const stopAutoScroll = useCallback(() => {
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }
  }, []);

  const toggleAutoScroll = useCallback(() => {
    if (autoScroll) {
      stopAutoScroll();
      setAutoScroll(false);
    } else {
      setAutoScroll(true);
      startAutoScroll();
    }
  }, [autoScroll, startAutoScroll, stopAutoScroll]);

  const resetScroll = useCallback(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
      scrollDirectionRef.current = 'down';
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAutoScroll();
    };
  }, [stopAutoScroll]);

  // Restart auto scroll when data changes and autoScroll is on
  useEffect(() => {
    if (autoScroll) {
      stopAutoScroll();
      startAutoScroll();
    }
  }, [liveData.length, autoScroll, startAutoScroll, stopAutoScroll]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 animate-pulse" />
          <h3 className="font-bold text-sm">Live Score</h3>
          {liveData.length > 0 && (
            <span className="px-1.5 py-0.5 bg-red-500 rounded-full text-[10px] font-bold animate-pulse">
              LIVE
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs font-medium">
            {liveData.length} sedang ujian
          </span>
        </div>
      </div>
      
      {/* Auto Scroll Controls */}
      <div className="flex items-center justify-between gap-2 px-3 py-1.5 bg-muted/50 border-x">
        <span className="text-[10px] text-muted-foreground">
          Mode Proyektor
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleAutoScroll}
            className={`h-6 px-2 text-[10px] gap-1 ${autoScroll ? 'bg-blue-100 dark:bg-blue-900/50 border-blue-500' : ''}`}
          >
            {autoScroll ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            {autoScroll ? 'Stop' : 'Auto Scroll'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={resetScroll}
            className="h-6 px-2 text-[10px] gap-1"
          >
            <RotateCw className="w-3 h-3" />
          </Button>
        </div>
      </div>
      
      {/* Table with fixed height and scroll */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto border border-t-0 bg-background scroll-smooth"
        style={{ maxHeight: '450px' }}
      >
        <Table>
          <TableHeader className="sticky top-0 bg-gradient-to-r from-blue-500 to-indigo-500 z-10">
            <TableRow>
              <TableHead className="w-10 text-[10px] text-white font-semibold">Rank</TableHead>
              <TableHead className="text-[10px] text-white font-semibold">Nama</TableHead>
              <TableHead className="text-center text-[10px] text-white font-semibold">Timer</TableHead>
              <TableHead className="text-center text-[10px] text-white font-semibold">TWK</TableHead>
              <TableHead className="text-center text-[10px] text-white font-semibold">TIU</TableHead>
              <TableHead className="text-center text-[10px] text-white font-semibold">TKP</TableHead>
              <TableHead className="text-center text-[10px] text-white font-semibold">Total</TableHead>
              <TableHead className="text-center text-[10px] text-white font-semibold">Ket</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {liveData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32">
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <Radio className="w-8 h-8 mb-2 opacity-30" />
                    <span className="text-sm">Tidak ada peserta sedang ujian</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              liveData.map((entry, idx) => (
                <LiveRow 
                  key={entry.id} 
                  entry={entry} 
                  rank={idx + 1}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>
      
      {/* Footer legend */}
      <div className="px-2 py-1.5 bg-muted/50 border border-t-0 rounded-b-lg text-[10px] text-muted-foreground flex items-center justify-between">
        <span>
          <span className="text-green-600 dark:text-green-400 font-medium">L</span> = Lulus, 
          <span className="text-red-600 dark:text-red-400 font-medium ml-1">TL</span> = Tidak Lulus
        </span>
        <span className="text-blue-600 dark:text-blue-400">
          Update real-time setiap jawaban
        </span>
      </div>
    </div>
  );
});

LeaderboardLiveTable.displayName = 'LeaderboardLiveTable';

export default LeaderboardLiveTable;
