import { memo } from 'react';
import { Table, TableBody, TableHead, TableHeader, TableRow, TableCell } from '@/components/ui/table';
import { Trophy, Medal, Award, CheckCircle, XCircle, Users } from 'lucide-react';
import { format } from 'date-fns';
import type { LeaderboardEntry } from '@/hooks/useRealtimeLeaderboard';
import { isLulus } from '@/hooks/useRealtimeLeaderboard';

const PASSING_GRADE = { TWK: 65, TIU: 80, TKP: 166 };

interface LeaderboardFinishedTableProps {
  data: LeaderboardEntry[];
}

const getRankIcon = (rank: number) => {
  if (rank === 1) return <Trophy className="w-4 h-4 text-yellow-500" />;
  if (rank === 2) return <Medal className="w-4 h-4 text-gray-400" />;
  if (rank === 3) return <Award className="w-4 h-4 text-amber-600" />;
  return <span className="w-4 text-center text-xs">{rank}</span>;
};

const getScoreClass = (score: number, type: 'TWK' | 'TIU' | 'TKP', isLightText: boolean): string => {
  const pg = PASSING_GRADE[type];
  if (score < pg) {
    return isLightText ? 'text-red-200 font-bold underline' : 'text-red-600 dark:text-red-500 font-semibold';
  }
  return '';
};

const getRowStyle = (rank: number, entry: LeaderboardEntry): { className: string; isLightText: boolean } => {
  const lulus = isLulus(entry);
  
  if (rank === 1) {
    return {
      className: 'bg-gradient-to-r from-yellow-400 via-yellow-500 to-amber-500 text-white shadow-lg',
      isLightText: true
    };
  }
  if (rank === 2) {
    return {
      className: 'bg-gradient-to-r from-gray-300 via-gray-400 to-gray-500 text-white shadow-md',
      isLightText: true
    };
  }
  if (rank === 3) {
    return {
      className: 'bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600 text-white shadow-md',
      isLightText: true
    };
  }
  
  if (rank <= 10) {
    return {
      className: 'bg-green-100 dark:bg-green-900/30 text-gray-900 dark:text-gray-100',
      isLightText: false
    };
  }
  
  if (lulus) {
    return {
      className: 'bg-blue-50 dark:bg-blue-900/20 text-gray-900 dark:text-gray-100',
      isLightText: false
    };
  } else {
    return {
      className: 'bg-red-50 dark:bg-red-900/20 text-gray-900 dark:text-gray-100',
      isLightText: false
    };
  }
};

const FinishedRow = memo(({ entry, rank }: { entry: LeaderboardEntry; rank: number }) => {
  const lulus = isLulus(entry);
  const { className: rowClass, isLightText } = getRowStyle(rank, entry);
  
  return (
    <TableRow key={entry.id} className={rowClass}>
      <TableCell className="flex items-center justify-center py-2">
        {getRankIcon(rank)}
      </TableCell>
      <TableCell className={`font-medium text-xs py-2 ${isLightText ? 'text-white' : ''}`}>
        {entry.name}
      </TableCell>
      <TableCell className={`text-center text-xs py-2 ${isLightText ? 'text-white/90' : ''}`}>
        {entry.duration_minutes != null ? `${entry.duration_minutes} mnt` : '-'}
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
      <TableCell className={`text-center text-[10px] py-2 whitespace-nowrap ${isLightText ? 'text-white/90' : 'text-muted-foreground'}`}>
        {entry.created_at 
          ? format(new Date(entry.created_at), 'dd/MM/yy') 
          : '-'}
      </TableCell>
    </TableRow>
  );
}, (prevProps, nextProps) => {
  const prev = prevProps.entry;
  const next = nextProps.entry;
  return (
    prevProps.rank === nextProps.rank &&
    prev.id === next.id &&
    prev.total_score === next.total_score &&
    prev.duration_minutes === next.duration_minutes
  );
});

FinishedRow.displayName = 'FinishedRow';

const LeaderboardFinishedTable = memo(({ data }: LeaderboardFinishedTableProps) => {
  // Filter and sort finished entries
  const finishedData = data
    .filter(e => e.status === 'finished')
    .sort((a, b) => {
      const aLulus = isLulus(a);
      const bLulus = isLulus(b);
      if (aLulus !== bLulus) return aLulus ? -1 : 1;
      if (b.total_score !== a.total_score) return b.total_score - a.total_score;
      if (b.tkp_score !== a.tkp_score) return b.tkp_score - a.tkp_score;
      if (b.tiu_score !== a.tiu_score) return b.tiu_score - a.tiu_score;
      return b.twk_score - a.twk_score;
    });

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-t-lg">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4" />
          <h3 className="font-bold text-sm">Riwayat Selesai</h3>
        </div>
        <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs font-medium">
          {finishedData.length} peserta
        </span>
      </div>
      
      {/* Table with fixed height and scroll */}
      <div className="flex-1 overflow-y-auto border border-t-0 rounded-b-lg bg-background" style={{ maxHeight: '500px' }}>
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
                <TableHead className="text-center text-[10px]">Tgl</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {finishedData.map((entry, idx) => (
                <FinishedRow 
                  key={entry.id} 
                  entry={entry} 
                  rank={idx + 1}
                />
              ))}
            </TableBody>
          </Table>
        )}
      </div>
      
      {/* Legend */}
      <div className="px-2 py-1.5 bg-muted/50 border border-t-0 rounded-b-lg text-[10px] text-muted-foreground">
        <span className="text-green-600 dark:text-green-400 font-medium">L</span> = Lulus, 
        <span className="text-red-600 dark:text-red-400 font-medium ml-1">TL</span> = Tidak Lulus
      </div>
    </div>
  );
});

LeaderboardFinishedTable.displayName = 'LeaderboardFinishedTable';

export default LeaderboardFinishedTable;
