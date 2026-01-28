import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Flame } from 'lucide-react';

interface NavigationEvent {
  timestamp: string;
  remainingTimeSeconds: number;
  questionNumber: number;
  action: string;
  previousQuestion?: number;
}

interface TimelineHeatmapProps {
  navigationLog: NavigationEvent[];
}

const TOTAL_QUESTIONS = 110;
const GRID_COLS = 11; // 11 columns x 10 rows = 110

const getCategoryFromQuestion = (qNum: number): { name: string; color: string } => {
  if (qNum >= 1 && qNum <= 30) return { name: 'TWK', color: 'hsl(var(--chart-1))' };
  if (qNum >= 31 && qNum <= 65) return { name: 'TIU', color: 'hsl(var(--chart-2))' };
  return { name: 'TKP', color: 'hsl(var(--chart-3))' };
};

const formatDuration = (seconds: number): string => {
  if (seconds === 0) return 'Tidak dikunjungi';
  if (seconds < 60) return `${seconds} detik`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (secs === 0) return `${mins} menit`;
  return `${mins}m ${secs}s`;
};

// Get heat color based on time intensity (0-1)
const getHeatColor = (intensity: number, visited: boolean): string => {
  if (!visited) return 'hsl(var(--muted))';
  
  // Color scale from cool (low time) to hot (high time)
  // Green -> Yellow -> Orange -> Red
  if (intensity < 0.25) {
    // Green to Yellow-Green
    return `hsl(120, ${60 + intensity * 40}%, ${45 - intensity * 10}%)`;
  } else if (intensity < 0.5) {
    // Yellow-Green to Yellow
    const t = (intensity - 0.25) / 0.25;
    return `hsl(${120 - t * 60}, 70%, ${35 + t * 10}%)`;
  } else if (intensity < 0.75) {
    // Yellow to Orange
    const t = (intensity - 0.5) / 0.25;
    return `hsl(${60 - t * 30}, 80%, ${45 - t * 5}%)`;
  } else {
    // Orange to Red
    const t = (intensity - 0.75) / 0.25;
    return `hsl(${30 - t * 30}, ${80 + t * 20}%, ${40 - t * 10}%)`;
  }
};

export const TimelineHeatmap = ({ navigationLog }: TimelineHeatmapProps) => {
  // Calculate time spent per question
  const { timePerQuestion, maxTime, stats } = useMemo(() => {
    if (!navigationLog || navigationLog.length === 0) {
      return { timePerQuestion: {}, maxTime: 0, stats: null };
    }
    
    const timeMap: Record<number, number> = {};
    const visitMap: Record<number, number> = {};
    
    // Sort by remaining time descending
    const sortedLog = [...navigationLog].sort(
      (a, b) => b.remainingTimeSeconds - a.remainingTimeSeconds
    );
    
    for (let i = 0; i < sortedLog.length; i++) {
      const current = sortedLog[i];
      const next = sortedLog[i + 1];
      const duration = next 
        ? current.remainingTimeSeconds - next.remainingTimeSeconds
        : current.remainingTimeSeconds;
      
      const qNum = current.questionNumber;
      timeMap[qNum] = (timeMap[qNum] || 0) + Math.max(0, duration);
      visitMap[qNum] = (visitMap[qNum] || 0) + 1;
    }
    
    const times = Object.values(timeMap);
    const max = times.length > 0 ? Math.max(...times) : 0;
    
    // Stats
    const visitedCount = Object.keys(timeMap).length;
    const avgTime = times.length > 0 ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0;
    const totalTime = times.reduce((a, b) => a + b, 0);
    
    return { 
      timePerQuestion: timeMap, 
      maxTime: max,
      stats: {
        visited: visitedCount,
        notVisited: TOTAL_QUESTIONS - visitedCount,
        avgTime,
        totalTime,
        maxTime: max,
      }
    };
  }, [navigationLog]);

  // Generate grid data for all 110 questions
  const gridData = useMemo(() => {
    const data = [];
    for (let i = 1; i <= TOTAL_QUESTIONS; i++) {
      const time = timePerQuestion[i] || 0;
      const intensity = maxTime > 0 ? time / maxTime : 0;
      const visited = time > 0;
      const category = getCategoryFromQuestion(i);
      
      data.push({
        question: i,
        time,
        intensity,
        visited,
        color: getHeatColor(intensity, visited),
        category,
      });
    }
    return data;
  }, [timePerQuestion, maxTime]);

  if (!navigationLog || navigationLog.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Tidak ada data untuk divisualisasikan.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Summary */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-center">
          <div className="p-2 rounded-lg bg-muted/50">
            <p className="text-lg font-bold text-success">{stats.visited}</p>
            <p className="text-[10px] text-muted-foreground">Dikunjungi</p>
          </div>
          <div className="p-2 rounded-lg bg-muted/50">
            <p className="text-lg font-bold text-muted-foreground">{stats.notVisited}</p>
            <p className="text-[10px] text-muted-foreground">Tidak Dikunjungi</p>
          </div>
          <div className="p-2 rounded-lg bg-muted/50">
            <p className="text-lg font-bold">{formatDuration(stats.avgTime)}</p>
            <p className="text-[10px] text-muted-foreground">Rata-rata</p>
          </div>
          <div className="p-2 rounded-lg bg-muted/50">
            <p className="text-lg font-bold text-destructive">{formatDuration(stats.maxTime)}</p>
            <p className="text-[10px] text-muted-foreground">Terlama</p>
          </div>
          <div className="p-2 rounded-lg bg-muted/50 col-span-2 md:col-span-1">
            <p className="text-lg font-bold">{formatDuration(stats.totalTime)}</p>
            <p className="text-[10px] text-muted-foreground">Total</p>
          </div>
        </div>
      )}

      {/* Heatmap Grid */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Flame className="w-4 h-4 text-orange-500" />
            Heatmap Waktu Pengerjaan (110 Soal)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TooltipProvider delayDuration={100}>
            <div className="space-y-4">
              {/* Category Labels */}
              <div className="flex items-center justify-center gap-4 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: 'hsl(var(--chart-1))' }} />
                  <span>TWK (1-30)</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: 'hsl(var(--chart-2))' }} />
                  <span>TIU (31-65)</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: 'hsl(var(--chart-3))' }} />
                  <span>TKP (66-110)</span>
                </div>
              </div>

              {/* Grid */}
              <div 
                className="grid gap-1 mx-auto"
                style={{ 
                  gridTemplateColumns: `repeat(${GRID_COLS}, minmax(0, 1fr))`,
                  maxWidth: '440px'
                }}
              >
                {gridData.map((item) => (
                  <Tooltip key={item.question}>
                    <TooltipTrigger asChild>
                      <div
                        className="aspect-square rounded-sm cursor-pointer flex items-center justify-center text-[9px] font-medium transition-all hover:scale-110 hover:z-10 hover:shadow-md border border-transparent hover:border-foreground/20"
                        style={{ 
                          backgroundColor: item.color,
                          color: item.visited && item.intensity > 0.4 ? 'white' : 'hsl(var(--foreground))',
                          opacity: item.visited ? 1 : 0.4,
                        }}
                      >
                        {item.question}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-semibold">Soal #{item.question}</span>
                          <Badge 
                            variant="outline" 
                            className="text-[10px] px-1 py-0"
                            style={{ borderColor: item.category.color, color: item.category.color }}
                          >
                            {item.category.name}
                          </Badge>
                        </div>
                        <div className="text-muted-foreground">
                          Waktu: <span className="text-foreground font-medium">{formatDuration(item.time)}</span>
                        </div>
                        {item.visited && (
                          <div className="text-muted-foreground">
                            Intensitas: <span className="text-foreground">{Math.round(item.intensity * 100)}%</span>
                          </div>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>

              {/* Color Legend */}
              <div className="flex items-center justify-center gap-2 text-xs">
                <span className="text-muted-foreground">Cepat</span>
                <div className="flex gap-0.5">
                  {[0, 0.25, 0.5, 0.75, 1].map((intensity) => (
                    <div
                      key={intensity}
                      className="w-6 h-4 rounded-sm"
                      style={{ backgroundColor: getHeatColor(intensity, true) }}
                    />
                  ))}
                </div>
                <span className="text-muted-foreground">Lama</span>
                <span className="mx-2 text-muted-foreground">|</span>
                <div 
                  className="w-4 h-4 rounded-sm opacity-40"
                  style={{ backgroundColor: 'hsl(var(--muted))' }}
                />
                <span className="text-muted-foreground">Tidak Dikunjungi</span>
              </div>
            </div>
          </TooltipProvider>
        </CardContent>
      </Card>
    </div>
  );
};

export default TimelineHeatmap;
