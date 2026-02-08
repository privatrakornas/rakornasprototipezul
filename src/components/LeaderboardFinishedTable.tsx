import { memo, useState, useMemo, useCallback } from 'react';
import { Table, TableBody, TableHead, TableHeader, TableRow, TableCell } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Trophy, 
  Medal, 
  Award, 
  CheckCircle, 
  XCircle, 
  Users, 
  Search, 
  Filter, 
  X,
  ChevronDown,
  Timer,
  ShieldAlert,
  AlertTriangle,
} from 'lucide-react';
import { format } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { LeaderboardEntry } from '@/hooks/useRealtimeLeaderboard';
import { isLulus } from '@/hooks/useRealtimeLeaderboard';
import TimelineLogModal from '@/components/admin/TimelineLogModal';
import AnomalyExportPanel from '@/components/admin/AnomalyExportPanel';
import { analyzeNavigationAnomalies, type NavigationEvent } from '@/utils/anomalyDetection';

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

interface FinishedRowProps {
  entry: LeaderboardEntry;
  rank: number;
  onViewTimeline?: (entry: LeaderboardEntry) => void;
  anomalyRisk?: 'low' | 'medium' | 'high' | 'critical';
  anomalyScore?: number;
}

const getAnomalyBadge = (risk: string, score: number, isLightText: boolean) => {
  if (risk === 'low') return null;
  
  if (risk === 'critical') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className={`inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-bold ${
              isLightText 
                ? 'bg-red-500/80 text-white' 
                : 'bg-destructive text-destructive-foreground'
            }`}>
              <ShieldAlert className="w-2.5 h-2.5" />
              !
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            <p className="font-semibold text-destructive">Risiko Kritis ({score}/100)</p>
            <p className="text-muted-foreground">Pola mencurigakan terdeteksi</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  
  if (risk === 'high') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className={`inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-bold ${
              isLightText 
                ? 'bg-orange-500/80 text-white' 
                : 'bg-orange-500 text-white'
            }`}>
              <AlertTriangle className="w-2.5 h-2.5" />
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            <p className="font-semibold text-orange-600">Risiko Tinggi ({score}/100)</p>
            <p className="text-muted-foreground">Perlu investigasi lebih lanjut</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  
  if (risk === 'medium') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className={`inline-flex items-center px-1 py-0.5 rounded text-[9px] ${
              isLightText 
                ? 'bg-yellow-500/60 text-white' 
                : 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400'
            }`}>
              <AlertTriangle className="w-2.5 h-2.5" />
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            <p className="font-semibold text-yellow-600">Risiko Sedang ({score}/100)</p>
            <p className="text-muted-foreground">Beberapa pola perlu perhatian</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  
  return null;
};

const FinishedRow = memo(({ entry, rank, onViewTimeline, anomalyRisk, anomalyScore }: FinishedRowProps) => {
  const lulus = isLulus(entry);
  const { className: rowClass, isLightText } = getRowStyle(rank, entry);
  const hasNavigationLog = entry.navigation_log && Array.isArray(entry.navigation_log) && entry.navigation_log.length > 0;
  
  return (
    <TableRow key={entry.id} className={rowClass}>
      <TableCell className="flex items-center justify-center py-2">
        {getRankIcon(rank)}
      </TableCell>
      <TableCell className={`font-medium text-xs py-2 ${isLightText ? 'text-white' : ''}`}>
        <div className="flex items-center gap-1">
          <span>{entry.name}</span>
          {/* Anomaly Badge */}
          {anomalyRisk && anomalyScore !== undefined && getAnomalyBadge(anomalyRisk, anomalyScore, isLightText)}
          {/* Timeline Log Button */}
          {hasNavigationLog && onViewTimeline && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewTimeline(entry);
                    }}
                    className={`p-0.5 rounded hover:bg-white/20 transition-colors ${isLightText ? 'text-white/80' : 'text-primary'}`}
                  >
                    <Timer className="w-3.5 h-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Lihat Log Pengerjaan</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
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
    prev.duration_minutes === next.duration_minutes &&
    prevProps.onViewTimeline === nextProps.onViewTimeline &&
    prevProps.anomalyRisk === nextProps.anomalyRisk &&
    prevProps.anomalyScore === nextProps.anomalyScore
  );
});

FinishedRow.displayName = 'FinishedRow';

type StatusFilter = 'all' | 'lulus' | 'tidak_lulus';
type RiskFilter = 'all' | 'high_critical' | 'medium' | 'low';

const LeaderboardFinishedTable = memo(({ data }: LeaderboardFinishedTableProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [riskFilter, setRiskFilter] = useState<RiskFilter>('all');
  const [selectedEntry, setSelectedEntry] = useState<LeaderboardEntry | null>(null);
  const [timelineModalOpen, setTimelineModalOpen] = useState(false);

  // Precompute anomaly analysis for all entries - do this before filtering
  const anomalyMap = useMemo(() => {
    const map = new Map<string, { risk: 'low' | 'medium' | 'high' | 'critical'; score: number }>();
    data.forEach(entry => {
      if (entry.status === 'finished' && entry.navigation_log && Array.isArray(entry.navigation_log) && entry.navigation_log.length > 0) {
        const analysis = analyzeNavigationAnomalies(entry.navigation_log as NavigationEvent[]);
        map.set(entry.id, { risk: analysis.overallRisk, score: analysis.riskScore });
      }
    });
    return map;
  }, [data]);

  // First: sort ALL finished data to assign stable ranks
  const allFinishedSorted = useMemo(() => {
    return data
      .filter(e => e.status === 'finished')
      .sort((a, b) => {
        const aLulus = isLulus(a);
        const bLulus = isLulus(b);
        if (aLulus !== bLulus) return aLulus ? -1 : 1;
        if (b.total_score !== a.total_score) return b.total_score - a.total_score;
        const aDur = a.duration_minutes ?? 999;
        const bDur = b.duration_minutes ?? 999;
        if (aDur !== bDur) return aDur - bDur;
        if (b.tkp_score !== a.tkp_score) return b.tkp_score - a.tkp_score;
        if (b.tiu_score !== a.tiu_score) return b.tiu_score - a.tiu_score;
        return b.twk_score - a.twk_score;
      });
  }, [data]);

  // Build a rank map from the full sorted list
  const rankMap = useMemo(() => {
    const map = new Map<string, number>();
    allFinishedSorted.forEach((entry, idx) => {
      map.set(entry.id, idx + 1);
    });
    return map;
  }, [allFinishedSorted]);

  // Then: filter while preserving original ranks
  const finishedData = useMemo(() => {
    return allFinishedSorted.filter(e => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!e.name.toLowerCase().includes(query)) return false;
      }
      
      // Passing status filter
      if (statusFilter !== 'all') {
        const lulus = isLulus(e);
        if (statusFilter === 'lulus' && !lulus) return false;
        if (statusFilter === 'tidak_lulus' && lulus) return false;
      }
      
      // Risk filter
      if (riskFilter !== 'all') {
        const anomalyData = anomalyMap.get(e.id);
        if (!anomalyData) return riskFilter === 'low';
        
        if (riskFilter === 'high_critical') {
          if (anomalyData.risk !== 'high' && anomalyData.risk !== 'critical') return false;
        } else if (riskFilter === 'medium') {
          if (anomalyData.risk !== 'medium') return false;
        } else if (riskFilter === 'low') {
          if (anomalyData.risk !== 'low') return false;
        }
      }
      
      return true;
    });
  }, [allFinishedSorted, searchQuery, statusFilter, riskFilter, anomalyMap]);

  // Count high-risk entries
  const highRiskCount = useMemo(() => {
    let count = 0;
    anomalyMap.forEach(({ risk }) => {
      if (risk === 'high' || risk === 'critical') count++;
    });
    return count;
  }, [anomalyMap]);

  // Total finished count (before filters)
  const totalFinished = allFinishedSorted.length;

  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setStatusFilter('all');
    setRiskFilter('all');
  }, []);

  const handleViewTimeline = useCallback((entry: LeaderboardEntry) => {
    setSelectedEntry(entry);
    setTimelineModalOpen(true);
  }, []);

  const hasActiveFilters = searchQuery || statusFilter !== 'all' || riskFilter !== 'all';

  const getRiskFilterLabel = () => {
    switch (riskFilter) {
      case 'high_critical': return 'Risiko Tinggi/Kritis';
      case 'medium': return 'Risiko Sedang';
      case 'low': return 'Risiko Rendah';
      default: return 'Semua Risiko';
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-t-lg">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4" />
          <h3 className="font-bold text-sm">Riwayat Selesai</h3>
          {highRiskCount > 0 && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-red-500 rounded text-[10px] font-bold">
                    <ShieldAlert className="w-3 h-3" />
                    {highRiskCount}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{highRiskCount} peserta dengan risiko anomali tinggi/kritis</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs font-medium">
          {finishedData.length}{hasActiveFilters ? `/${totalFinished}` : ''} peserta
        </span>
      </div>
      
      {/* Search and Filter Bar */}
      <div className="px-2 py-2 border-x bg-muted/30 flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[120px]">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Cari nama..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-7 pl-7 text-xs"
          />
        </div>
        
        {/* Status Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
              <Filter className="w-3 h-3" />
              {statusFilter === 'all' ? 'Semua' : statusFilter === 'lulus' ? 'Lulus' : 'Tidak Lulus'}
              <ChevronDown className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuCheckboxItem
              checked={statusFilter === 'all'}
              onCheckedChange={() => setStatusFilter('all')}
            >
              Semua Status
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={statusFilter === 'lulus'}
              onCheckedChange={() => setStatusFilter('lulus')}
            >
              <CheckCircle className="w-3 h-3 mr-1.5 text-green-600" />
              Lulus
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={statusFilter === 'tidak_lulus'}
              onCheckedChange={() => setStatusFilter('tidak_lulus')}
            >
              <XCircle className="w-3 h-3 mr-1.5 text-red-600" />
              Tidak Lulus
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Risk Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant={riskFilter !== 'all' ? 'default' : 'outline'} 
              size="sm" 
              className={`h-7 text-xs gap-1 ${riskFilter === 'high_critical' ? 'bg-destructive hover:bg-destructive/90' : ''}`}
            >
              <ShieldAlert className="w-3 h-3" />
              {getRiskFilterLabel()}
              <ChevronDown className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuCheckboxItem
              checked={riskFilter === 'all'}
              onCheckedChange={() => setRiskFilter('all')}
            >
              Semua Risiko
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={riskFilter === 'high_critical'}
              onCheckedChange={() => setRiskFilter('high_critical')}
            >
              <ShieldAlert className="w-3 h-3 mr-1.5 text-destructive" />
              Tinggi/Kritis
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={riskFilter === 'medium'}
              onCheckedChange={() => setRiskFilter('medium')}
            >
              <AlertTriangle className="w-3 h-3 mr-1.5 text-yellow-600" />
              Sedang
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={riskFilter === 'low'}
              onCheckedChange={() => setRiskFilter('low')}
            >
              <CheckCircle className="w-3 h-3 mr-1.5 text-green-600" />
              Rendah
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {hasActiveFilters && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
            onClick={clearFilters}
          >
            <X className="w-3 h-3" />
            Reset
          </Button>
        )}

        {/* Anomaly Export Panel */}
        <AnomalyExportPanel data={data} />
      </div>
      
      {/* Table with fixed height and scroll */}
      <div className="flex-1 overflow-y-auto border border-t-0 bg-background" style={{ maxHeight: '70vh' }}>
        {finishedData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground text-sm gap-2">
            <p>{hasActiveFilters ? 'Tidak ada hasil sesuai filter' : 'Belum ada peserta selesai'}</p>
            {hasActiveFilters && (
              <Button variant="link" size="sm" onClick={clearFilters} className="text-xs">
                Reset Filter
              </Button>
            )}
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
              {finishedData.map((entry) => {
                const anomalyData = anomalyMap.get(entry.id);
                return (
                  <FinishedRow 
                    key={entry.id} 
                    entry={entry} 
                    rank={rankMap.get(entry.id) ?? 0}
                    onViewTimeline={handleViewTimeline}
                    anomalyRisk={anomalyData?.risk}
                    anomalyScore={anomalyData?.score}
                  />
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
      
      {/* Legend */}
      <div className="px-2 py-1.5 bg-muted/50 border border-t-0 rounded-b-lg text-[10px] text-muted-foreground flex flex-wrap gap-x-3 gap-y-1">
        <span>
          <span className="text-green-600 dark:text-green-400 font-medium">L</span> = Lulus
        </span>
        <span>
          <span className="text-red-600 dark:text-red-400 font-medium">TL</span> = Tidak Lulus
        </span>
        <span>
          <Timer className="w-3 h-3 inline mr-0.5" /> = Log
        </span>
        <span>
          <ShieldAlert className="w-3 h-3 inline mr-0.5 text-destructive" /> = Risiko Kritis
        </span>
        <span>
          <AlertTriangle className="w-3 h-3 inline mr-0.5 text-orange-500" /> = Risiko Tinggi
        </span>
      </div>
      
      {/* Timeline Log Modal */}
      <TimelineLogModal
        open={timelineModalOpen}
        onOpenChange={setTimelineModalOpen}
        participantName={selectedEntry?.name || ''}
        navigationLog={selectedEntry?.navigation_log || null}
        examDurationMinutes={selectedEntry?.duration_minutes || 0}
      />
    </div>
  );
});

LeaderboardFinishedTable.displayName = 'LeaderboardFinishedTable';

export default LeaderboardFinishedTable;
