import { useState, memo } from 'react';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Trophy, 
  Medal, 
  Award, 
  CheckCircle, 
  XCircle, 
  Users, 
  Radio,
  Eye,
  Clock,
  Loader2
} from 'lucide-react';
import { format, differenceInSeconds } from 'date-fns';
import { useRealtimeLeaderboard, isLulus, type LeaderboardEntry } from '@/hooks/useRealtimeLeaderboard';
import ExamMirrorModal from './ExamMirrorModal';

const PASSING_GRADE = { TWK: 65, TIU: 80, TKP: 166 };
const TOTAL_EXAM_TIME = 100 * 60; // 100 minutes in seconds

// Rank icons
const getRankIcon = (rank: number) => {
  if (rank === 1) return <Trophy className="w-4 h-4 text-yellow-500" />;
  if (rank === 2) return <Medal className="w-4 h-4 text-gray-400" />;
  if (rank === 3) return <Award className="w-4 h-4 text-amber-600" />;
  return <span className="w-4 text-center text-xs">{rank}</span>;
};

// Score styling - uses semantic colors
const getScoreClass = (score: number, type: 'TWK' | 'TIU' | 'TKP', isLightText: boolean): string => {
  const pg = PASSING_GRADE[type];
  if (score < pg) {
    return isLightText ? 'text-destructive-foreground font-bold underline opacity-80' : 'text-destructive font-semibold';
  }
  return '';
};

// Row styling based on rank - using gradient classes for medals
const getRowStyle = (rank: number, entry: LeaderboardEntry): { className: string; isLightText: boolean } => {
  const lulus = isLulus(entry);
  
  if (rank === 1) return { className: 'bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-white shadow-lg', isLightText: true };
  if (rank === 2) return { className: 'bg-gradient-to-r from-slate-300 via-slate-400 to-slate-500 text-white shadow-md', isLightText: true };
  if (rank === 3) return { className: 'bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600 text-white shadow-md', isLightText: true };
  if (rank <= 10) return { className: 'bg-accent text-accent-foreground', isLightText: false };
  
  if (lulus) {
    return { className: 'bg-muted/50 text-foreground', isLightText: false };
  }
  return { className: 'bg-destructive/10 text-foreground', isLightText: false };
};

// Format remaining time
const formatRemainingTime = (startedAt: string | null | undefined): string => {
  if (!startedAt) return '--:--';
  const started = new Date(startedAt);
  const now = new Date();
  const elapsed = differenceInSeconds(now, started);
  const remaining = Math.max(0, TOTAL_EXAM_TIME - elapsed);
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

// Finished Row Component
const FinishedRow = memo(({ 
  entry, 
  rank, 
  onNameClick 
}: { 
  entry: LeaderboardEntry; 
  rank: number;
  onNameClick: (entry: LeaderboardEntry) => void;
}) => {
  const lulus = isLulus(entry);
  const { className: rowClass, isLightText } = getRowStyle(rank, entry);
  
  return (
    <TableRow className={rowClass}>
      <TableCell className="flex items-center justify-center py-2">
        {getRankIcon(rank)}
      </TableCell>
      <TableCell className="py-2">
        <button
          onClick={() => onNameClick(entry)}
          className={`font-medium text-xs hover:underline cursor-pointer flex items-center gap-1.5 group ${
            isLightText ? 'text-white hover:text-white/80' : 'text-primary hover:text-primary/80'
          }`}
        >
          <Eye className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
          {entry.name}
        </button>
      </TableCell>
      <TableCell className={`text-center text-xs py-2 ${isLightText ? 'text-white/90' : ''}`}>
        {entry.duration_minutes != null ? `${entry.duration_minutes}m` : '-'}
      </TableCell>
      <TableCell className={`text-center text-xs py-2 ${isLightText ? 'text-white' : ''} ${getScoreClass(entry.twk_score, 'TWK', isLightText)}`}>
        {entry.twk_score}
      </TableCell>
      <TableCell className={`text-center text-xs py-2 ${isLightText ? 'text-white' : ''} ${getScoreClass(entry.tiu_score, 'TIU', isLightText)}`}>
        {entry.tiu_score}
      </TableCell>
      <TableCell className={`text-center text-xs py-2 ${isLightText ? 'text-white' : ''} ${getScoreClass(entry.tkp_score, 'TKP', isLightText)}`}>
        {entry.tkp_score}
      </TableCell>
      <TableCell className={`text-center font-bold text-xs py-2 ${isLightText ? 'text-white' : ''}`}>
        {entry.total_score}
      </TableCell>
      <TableCell className="text-center py-2">
        <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
          lulus 
            ? isLightText 
              ? 'bg-white/20 text-white border border-white/30' 
              : 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300'
            : isLightText 
              ? 'bg-red-200/30 text-white border border-red-200/50' 
              : 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'
        }`}>
          {lulus ? <CheckCircle className="w-2.5 h-2.5" /> : <XCircle className="w-2.5 h-2.5" />}
          {lulus ? 'L' : 'TL'}
        </span>
      </TableCell>
    </TableRow>
  );
});

FinishedRow.displayName = 'FinishedRow';

// Live Row Component
const LiveRow = memo(({ 
  entry, 
  rank,
  onNameClick 
}: { 
  entry: LeaderboardEntry; 
  rank: number;
  onNameClick: (entry: LeaderboardEntry) => void;
}) => {
  return (
    <TableRow className="bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
      <TableCell className="py-2 text-center">
        <span className="text-xs font-medium">{rank}</span>
      </TableCell>
      <TableCell className="py-2">
        <button
          onClick={() => onNameClick(entry)}
          className="font-medium text-xs text-primary hover:text-primary/80 hover:underline cursor-pointer flex items-center gap-1.5 group"
        >
          <Eye className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
          {entry.name}
          <Badge variant="destructive" className="ml-1 animate-pulse text-[9px] py-0 px-1 gap-0.5">
            <Radio className="w-2 h-2" />
            LIVE
          </Badge>
        </button>
      </TableCell>
      <TableCell className="text-center text-xs py-2">
        <div className="flex items-center justify-center gap-1 text-blue-600 dark:text-blue-400">
          <Clock className="w-3 h-3" />
          <span className="font-mono">{formatRemainingTime(entry.started_at)}</span>
        </div>
      </TableCell>
      <TableCell className="text-center text-xs py-2">{entry.twk_score}</TableCell>
      <TableCell className="text-center text-xs py-2">{entry.tiu_score}</TableCell>
      <TableCell className="text-center text-xs py-2">{entry.tkp_score}</TableCell>
      <TableCell className="text-center font-bold text-xs py-2">{entry.total_score}</TableCell>
      <TableCell className="text-center text-xs py-2">
        <span className="text-muted-foreground">
          {entry.answered_count || 0}/{entry.total_questions || 110}
        </span>
      </TableCell>
    </TableRow>
  );
});

LiveRow.displayName = 'LiveRow';

// Main Component
const AdminLeaderboardMirror = () => {
  const { data, isLoading } = useRealtimeLeaderboard();
  const [mirrorModalOpen, setMirrorModalOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<LeaderboardEntry | null>(null);

  // Split data
  const finishedData = data
    .filter(e => e.status === 'finished')
    .sort((a, b) => {
      const aLulus = isLulus(a);
      const bLulus = isLulus(b);
      if (aLulus !== bLulus) return aLulus ? -1 : 1;
      if (b.total_score !== a.total_score) return b.total_score - a.total_score;
      const aDur = a.duration_minutes ?? 999;
      const bDur = b.duration_minutes ?? 999;
      if (aDur !== bDur) return aDur - bDur;
      return 0;
    });

  const liveData = data.filter(e => e.status === 'ongoing');

  const handleNameClick = (entry: LeaderboardEntry) => {
    setSelectedSession(entry);
    setMirrorModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Memuat leaderboard...</span>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Finished Table */}
        <Card className="p-0 overflow-hidden shadow-lg border-2 border-green-500/30">
          <div className="flex items-center justify-between gap-2 px-3 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <h3 className="font-bold text-sm">Riwayat Selesai</h3>
            </div>
            <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs font-medium">
              {finishedData.length} peserta
            </span>
          </div>
          
          <div className="overflow-y-auto" style={{ maxHeight: '60vh' }}>
            {finishedData.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                Belum ada peserta selesai
              </div>
            ) : (
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead className="w-10 text-[10px]">#</TableHead>
                    <TableHead className="text-[10px]">Nama</TableHead>
                    <TableHead className="text-center text-[10px]">Durasi</TableHead>
                    <TableHead className="text-center text-[10px]">TWK</TableHead>
                    <TableHead className="text-center text-[10px]">TIU</TableHead>
                    <TableHead className="text-center text-[10px]">TKP</TableHead>
                    <TableHead className="text-center text-[10px]">Total</TableHead>
                    <TableHead className="text-center text-[10px]">Ket</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {finishedData.map((entry, idx) => (
                    <FinishedRow 
                      key={entry.id} 
                      entry={entry} 
                      rank={idx + 1}
                      onNameClick={handleNameClick}
                    />
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
          
          <div className="px-2 py-1.5 bg-muted/50 border-t text-[10px] text-muted-foreground">
            <Eye className="w-3 h-3 inline mr-1" />
            Klik nama peserta untuk Mode Intip
          </div>
        </Card>

        {/* Right: Live Table */}
        <Card className="p-0 overflow-hidden shadow-lg border-2 border-blue-500/50">
          <div className="flex items-center justify-between gap-2 px-3 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 animate-pulse" />
              <h3 className="font-bold text-sm">Live Score</h3>
            </div>
            <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs font-medium">
              {liveData.length} aktif
            </span>
          </div>
          
          <div className="overflow-y-auto" style={{ maxHeight: '60vh' }}>
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead className="w-10 text-[10px]">#</TableHead>
                  <TableHead className="text-[10px]">Nama</TableHead>
                  <TableHead className="text-center text-[10px]">Timer</TableHead>
                  <TableHead className="text-center text-[10px]">TWK</TableHead>
                  <TableHead className="text-center text-[10px]">TIU</TableHead>
                  <TableHead className="text-center text-[10px]">TKP</TableHead>
                  <TableHead className="text-center text-[10px]">Total</TableHead>
                  <TableHead className="text-center text-[10px]">Progress</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {liveData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground text-sm">
                      Tidak ada peserta sedang ujian
                    </TableCell>
                  </TableRow>
                ) : (
                  liveData.map((entry, idx) => (
                    <LiveRow 
                      key={entry.id} 
                      entry={entry} 
                      rank={idx + 1}
                      onNameClick={handleNameClick}
                    />
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          
          <div className="px-2 py-1.5 bg-muted/50 border-t text-[10px] text-muted-foreground">
            <Eye className="w-3 h-3 inline mr-1" />
            Klik nama peserta untuk Mode Intip (Realtime)
          </div>
        </Card>
      </div>

      {/* Exam Mirror Modal */}
      <ExamMirrorModal
        open={mirrorModalOpen}
        onOpenChange={setMirrorModalOpen}
        sessionId={selectedSession?.id.replace('legacy-', '') || null}
        sessionName={selectedSession?.name || ''}
        isLive={selectedSession?.status === 'ongoing'}
      />
    </>
  );
};

export default AdminLeaderboardMirror;
