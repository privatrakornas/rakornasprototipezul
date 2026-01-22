import { memo } from 'react';
import { TableRow, TableCell } from '@/components/ui/table';
import { Trophy, Medal, Award, Radio } from 'lucide-react';
import { format } from 'date-fns';
import { LiveTimer } from '@/components/LiveTimer';
import type { LeaderboardEntry } from '@/hooks/useRealtimeLeaderboard';
import { isLulus } from '@/hooks/useRealtimeLeaderboard';

const PASSING_GRADE = { TWK: 65, TIU: 80, TKP: 166 };
const TOTAL_QUESTIONS = 110;
const TOTAL_EXAM_TIME = 100;

interface LeaderboardRowProps {
  entry: LeaderboardEntry;
  rank: number;
}

const getRankIcon = (rank: number) => {
  if (rank === 1) return <Trophy className="w-4 h-4 md:w-5 md:h-5 text-yellow-500" />;
  if (rank === 2) return <Medal className="w-4 h-4 md:w-5 md:h-5 text-gray-400" />;
  if (rank === 3) return <Award className="w-4 h-4 md:w-5 md:h-5 text-amber-600" />;
  return <span className="w-4 md:w-5 text-center text-sm">{rank}</span>;
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
  
  // Aborted/Disqualified/Abandoned entries get a special style (should be filtered out, but just in case)
  if (entry.status === 'aborted' || entry.status === 'disqualified' || entry.status === 'abandoned') {
    return {
      className: 'bg-gray-200 dark:bg-gray-800 text-gray-500 dark:text-gray-400 opacity-60 line-through',
      isLightText: false
    };
  }
  
  // Ongoing exams get a special animated style
  if (entry.status === 'ongoing') {
    return {
      className: 'bg-gradient-to-r from-blue-100 via-indigo-100 to-purple-100 dark:from-blue-900/40 dark:via-indigo-900/40 dark:to-purple-900/40 border-l-4 border-blue-500 transition-all duration-500',
      isLightText: false
    };
  }
  
  // Rank 1-3: Podium with gradient backgrounds
  if (rank === 1) {
    return {
      className: 'bg-gradient-to-r from-yellow-400 via-yellow-500 to-amber-500 text-white shadow-lg transition-all duration-500',
      isLightText: true
    };
  }
  if (rank === 2) {
    return {
      className: 'bg-gradient-to-r from-gray-300 via-gray-400 to-gray-500 text-white shadow-md transition-all duration-500',
      isLightText: true
    };
  }
  if (rank === 3) {
    return {
      className: 'bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600 text-white shadow-md transition-all duration-500',
      isLightText: true
    };
  }
  
  // Rank 4-10: Top 10 with green background
  if (rank <= 10) {
    return {
      className: 'bg-green-100 dark:bg-green-900/30 text-gray-900 dark:text-gray-100 transition-all duration-500',
      isLightText: false
    };
  }
  
  // Rank 11+: Based on passing status
  if (lulus) {
    return {
      className: 'bg-blue-50 dark:bg-blue-900/20 text-gray-900 dark:text-gray-100 transition-all duration-500',
      isLightText: false
    };
  } else {
    return {
      className: 'bg-red-50 dark:bg-red-900/20 text-gray-900 dark:text-gray-100 transition-all duration-500',
      isLightText: false
    };
  }
};

const LeaderboardRow = memo(({ entry, rank }: LeaderboardRowProps) => {
  const lulus = isLulus(entry);
  const { className: rowClass, isLightText } = getRowStyle(rank, entry);
  
  // Don't render aborted/disqualified/abandoned entries (hide them completely)
  if (entry.status === 'aborted' || entry.status === 'disqualified' || entry.status === 'abandoned') {
    return null;
  }
  
  return (
    <TableRow className={rowClass}>
      <TableCell className="flex items-center justify-center py-2 md:py-4">
        {entry.status === 'ongoing' ? (
          <Radio className="w-4 h-4 text-blue-500 animate-pulse" />
        ) : (
          getRankIcon(rank)
        )}
      </TableCell>
      <TableCell className={`font-medium text-xs md:text-sm py-2 md:py-4 ${isLightText ? 'text-white' : ''}`}>
        <div className="flex flex-col gap-0.5">
          <span>{entry.name}</span>
          {entry.status === 'ongoing' && (
            <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">
              ({entry.answered_count || 0}/{TOTAL_QUESTIONS} soal)
            </span>
          )}
        </div>
      </TableCell>
      <TableCell className={`text-center text-xs md:text-sm py-2 md:py-4 ${isLightText ? 'text-white/90' : ''}`}>
        <LiveTimer
          startedAt={entry.started_at}
          totalMinutes={TOTAL_EXAM_TIME}
          status={entry.status}
          durationMinutes={entry.duration_minutes}
        />
      </TableCell>
      <TableCell className={`text-center text-xs md:text-sm py-2 md:py-4 ${isLightText ? 'text-white' : ''} ${getScoreClass(entry.twk_score, 'TWK', isLightText)}`}>
        {entry.twk_score}
      </TableCell>
      <TableCell className={`text-center text-xs md:text-sm py-2 md:py-4 ${isLightText ? 'text-white' : ''} ${getScoreClass(entry.tiu_score, 'TIU', isLightText)}`}>
        {entry.tiu_score}
      </TableCell>
      <TableCell className={`text-center text-xs md:text-sm py-2 md:py-4 ${isLightText ? 'text-white' : ''} ${getScoreClass(entry.tkp_score, 'TKP', isLightText)}`}>
        {entry.tkp_score}
      </TableCell>
      <TableCell className={`text-center font-bold text-xs md:text-sm py-2 md:py-4 ${isLightText ? 'text-white' : ''}`}>
        {entry.total_score}
      </TableCell>
      <TableCell className="text-center text-xs md:text-sm py-2 md:py-4">
        {entry.status === 'ongoing' ? (
          <span className="px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 flex items-center justify-center gap-1">
            <Radio className="w-3 h-3 animate-pulse" />
            Berlangsung
          </span>
        ) : (
          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
            lulus 
              ? isLightText 
                ? 'bg-white/20 text-white border border-white/30' 
                : 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300'
              : isLightText 
                ? 'bg-red-200/30 text-white border border-red-200/50' 
                : 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'
          }`}>
            {lulus ? 'Lulus' : 'Tidak Lulus'}
          </span>
        )}
      </TableCell>
      <TableCell className={`text-center text-xs md:text-sm py-2 md:py-4 whitespace-nowrap ${isLightText ? 'text-white/90' : 'text-muted-foreground'}`}>
        {entry.created_at 
          ? format(new Date(entry.created_at), 'dd-MM-yyyy') 
          : '-'}
      </TableCell>
    </TableRow>
  );
}, (prevProps, nextProps) => {
  // Custom comparison - only re-render if relevant data changed
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
    prev.status === next.status &&
    prev.duration_minutes === next.duration_minutes
  );
});

LeaderboardRow.displayName = 'LeaderboardRow';

export default LeaderboardRow;
