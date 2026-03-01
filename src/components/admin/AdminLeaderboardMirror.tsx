import { useState, useMemo, memo, useCallback, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { 
  Trophy, 
  Medal, 
  Award, 
  CheckCircle, 
  XCircle, 
  Users, 
  Eye,
  Loader2,
  RefreshCw,
  MoreVertical,
  Trash2,
  AlertTriangle,
  Search,
  X,
  Filter,
  ChevronDown,
  CalendarIcon,
} from 'lucide-react';
import { useRealtimeLeaderboard, isLulus, type LeaderboardEntry } from '@/hooks/useRealtimeLeaderboard';
import ExamMirrorModal from './ExamMirrorModal';
import LeaderboardExportPanel from './LeaderboardExportPanel';
import AdminLiveScoreTable from './AdminLiveScoreTable';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const PASSING_GRADE = { TWK: 65, TIU: 80, TKP: 166 };

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



// Finished Row Component
const FinishedRow = memo(({ 
  entry, 
  rank, 
  onNameClick,
  onSoftDelete,
  onPermanentDelete,
  isHighlighted,
}: { 
  entry: LeaderboardEntry; 
  rank: number;
  onNameClick: (entry: LeaderboardEntry) => void;
  onSoftDelete: (entry: LeaderboardEntry) => void;
  onPermanentDelete: (entry: LeaderboardEntry) => void;
  isHighlighted?: boolean;
}) => {
  const lulus = isLulus(entry);
  const { className: rowClass, isLightText } = getRowStyle(rank, entry);
  
  return (
    <TableRow id={`admin-row-${entry.id}`} className={`${rowClass} ${isHighlighted ? 'search-highlight-row' : ''}`}>
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
      <TableCell className="text-center py-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              className={`h-6 w-6 p-0 ${isLightText ? 'text-white hover:bg-white/20' : ''}`}
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => onSoftDelete(entry)} className="text-amber-600">
              <Trash2 className="w-3.5 h-3.5 mr-2" />
              Hapus (ke Sampah)
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onPermanentDelete(entry)} className="text-destructive">
              <AlertTriangle className="w-3.5 h-3.5 mr-2" />
              Hapus Permanen
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
});

FinishedRow.displayName = 'FinishedRow';

// Old LiveRow removed - now using AdminLiveScoreTable component

// Main Component
const AdminLeaderboardMirror = () => {
  const { data, isLoading, refetch } = useRealtimeLeaderboard();
  const [mirrorModalOpen, setMirrorModalOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<LeaderboardEntry | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'lulus' | 'tidak_lulus'>('all');
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);

  // Delete action states
  const [softDeleteTarget, setSoftDeleteTarget] = useState<LeaderboardEntry | null>(null);
  const [permanentDeleteTarget, setPermanentDeleteTarget] = useState<LeaderboardEntry | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Full sorted finished data (for stable ranking)
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
        return 0;
      });
  }, [data]);

  // Rank map from full sorted list
  const rankMap = useMemo(() => {
    const map = new Map<string, number>();
    allFinishedSorted.forEach((entry, idx) => {
      map.set(entry.id, idx + 1);
    });
    return map;
  }, [allFinishedSorted]);

  // Filter by status and date only (search does NOT filter - it jump-to-row)
  const finishedData = useMemo(() => {
    return allFinishedSorted.filter(e => {
      // Status filter
      if (statusFilter !== 'all') {
        const lulus = isLulus(e);
        if (statusFilter === 'lulus' && !lulus) return false;
        if (statusFilter === 'tidak_lulus' && lulus) return false;
      }
      // Date filter
      if (dateFrom && e.created_at) {
        const entryDate = new Date(e.created_at);
        if (entryDate < new Date(new Date(dateFrom).setHours(0, 0, 0, 0))) return false;
      }
      if (dateTo && e.created_at) {
        const entryDate = new Date(e.created_at);
        if (entryDate > new Date(new Date(dateTo).setHours(23, 59, 59, 999))) return false;
      }
      return true;
    });
  }, [allFinishedSorted, statusFilter, dateFrom, dateTo]);

  const hasActiveFilters = statusFilter !== 'all' || dateFrom || dateTo;

  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setStatusFilter('all');
    setHighlightedId(null);
    setDateFrom(undefined);
    setDateTo(undefined);
  }, []);

  // Jump-to-row search handler
  const handleSearch = useCallback(() => {
    if (!searchQuery.trim()) return;
    const query = searchQuery.toLowerCase();
    const target = finishedData.find(e => e.name.toLowerCase().includes(query));
    if (!target) {
      setHighlightedId(null);
      return;
    }
    setHighlightedId(target.id);
    // Scroll to row
    setTimeout(() => {
      const row = document.getElementById(`admin-row-${target.id}`);
      if (row && scrollContainerRef.current) {
        row.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      // Clear highlight after animation
      setTimeout(() => setHighlightedId(null), 6500);
    }, 50);
  }, [searchQuery, finishedData]);

  const handleNameClick = useCallback((entry: LeaderboardEntry) => {
    setSelectedSession(entry);
    setMirrorModalOpen(true);
  }, []);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  }, [refetch]);

  const handleSoftDelete = useCallback((entry: LeaderboardEntry) => {
    setSoftDeleteTarget(entry);
  }, []);

  const handlePermanentDelete = useCallback((entry: LeaderboardEntry) => {
    setPermanentDeleteTarget(entry);
  }, []);

  const confirmSoftDelete = useCallback(async () => {
    if (!softDeleteTarget) return;
    setIsDeleting(true);
    try {
      const realId = softDeleteTarget.id.replace('legacy-', '');
      const isLegacy = softDeleteTarget.id.startsWith('legacy-');

      if (isLegacy) {
        // For legacy entries, delete from exam_results
        const { error } = await supabase.from('exam_results').delete().eq('id', realId);
        if (error) throw error;
      } else {
        // Soft delete from exam_sessions
        const { error } = await supabase
          .from('exam_sessions')
          .update({ deleted_at: new Date().toISOString() })
          .eq('id', realId);
        if (error) throw error;
      }

      await supabase.from('audit_logs').insert({
        action: isLegacy ? 'DELETE_LEGACY_RESULT' : 'SOFT_DELETE',
        target_id: realId,
        target_name: softDeleteTarget.name,
        details: `Dihapus dari Riwayat admin. Skor: ${softDeleteTarget.total_score}`,
      });

      toast.success(`${softDeleteTarget.name} berhasil ${isLegacy ? 'dihapus' : 'dipindahkan ke Sampah'}`);
      setSoftDeleteTarget(null);
      await refetch();
    } catch (error) {
      console.error('Soft delete error:', error);
      toast.error('Gagal menghapus data');
    } finally {
      setIsDeleting(false);
    }
  }, [softDeleteTarget, refetch]);

  const confirmPermanentDelete = useCallback(async () => {
    if (!permanentDeleteTarget) return;
    setIsDeleting(true);
    try {
      const realId = permanentDeleteTarget.id.replace('legacy-', '');
      const isLegacy = permanentDeleteTarget.id.startsWith('legacy-');

      if (isLegacy) {
        const { error } = await supabase.from('exam_results').delete().eq('id', realId);
        if (error) throw error;
      } else {
        // Also delete related user_answers first
        await supabase.from('user_answers').delete().eq('session_id', realId);
        const { error } = await supabase.from('exam_sessions').delete().eq('id', realId);
        if (error) throw error;
      }

      await supabase.from('audit_logs').insert({
        action: 'PERMANENT_DELETE',
        target_id: realId,
        target_name: permanentDeleteTarget.name,
        details: `Dihapus permanen dari Riwayat. Skor: ${permanentDeleteTarget.total_score}`,
      });

      toast.success(`${permanentDeleteTarget.name} berhasil dihapus permanen`);
      setPermanentDeleteTarget(null);
      await refetch();
    } catch (error) {
      console.error('Permanent delete error:', error);
      toast.error('Gagal menghapus data permanen');
    } finally {
      setIsDeleting(false);
    }
  }, [permanentDeleteTarget, refetch]);

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
      {/* Header with Refresh Button */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-muted-foreground">
          Total: <span className="font-semibold text-foreground">{data.length}</span> peserta
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="gap-1.5"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Memuat...' : 'Refresh'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Finished Table */}
        <Card className="p-0 overflow-hidden shadow-lg border-2 border-primary/30">
          <div className="flex items-center justify-between gap-2 px-3 py-2 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <h3 className="font-bold text-sm">Riwayat Selesai</h3>
            </div>
            <div className="flex items-center gap-2">
              <LeaderboardExportPanel data={allFinishedSorted} type="finished" />
              <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs font-medium">
                {finishedData.length}{hasActiveFilters ? `/${allFinishedSorted.length}` : ''} peserta
              </span>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="px-2 py-2 border-x bg-muted/30 flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[120px]">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Cari & Enter untuk jump..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="h-7 pl-7 text-xs"
              />
            </div>
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleSearch}>Cari</Button>

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
                <DropdownMenuCheckboxItem checked={statusFilter === 'all'} onCheckedChange={() => setStatusFilter('all')}>Semua Status</DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={statusFilter === 'lulus'} onCheckedChange={() => setStatusFilter('lulus')}>
                  <CheckCircle className="w-3 h-3 mr-1.5 text-green-600" /> Lulus
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={statusFilter === 'tidak_lulus'} onCheckedChange={() => setStatusFilter('tidak_lulus')}>
                  <XCircle className="w-3 h-3 mr-1.5 text-red-600" /> Tidak Lulus
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Date From */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant={dateFrom ? 'default' : 'outline'} size="sm" className={cn('h-7 text-xs gap-1', dateFrom && 'bg-primary text-primary-foreground')}>
                  <CalendarIcon className="w-3 h-3" />
                  {dateFrom ? format(dateFrom, 'dd/MM/yy') : 'Dari'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus className={cn("p-3 pointer-events-auto")} />
              </PopoverContent>
            </Popover>

            {/* Date To */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant={dateTo ? 'default' : 'outline'} size="sm" className={cn('h-7 text-xs gap-1', dateTo && 'bg-primary text-primary-foreground')}>
                  <CalendarIcon className="w-3 h-3" />
                  {dateTo ? format(dateTo, 'dd/MM/yy') : 'Sampai'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={dateTo} onSelect={setDateTo} initialFocus className={cn("p-3 pointer-events-auto")} />
              </PopoverContent>
            </Popover>

            {(hasActiveFilters || searchQuery) && (
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground" onClick={clearFilters}>
                <X className="w-3 h-3" /> Reset
              </Button>
            )}
          </div>
          
          <div ref={scrollContainerRef} className="overflow-y-auto" style={{ maxHeight: '60vh' }}>
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
                     <TableHead className="text-center text-[10px] w-10">Aksi</TableHead>
                   </TableRow>
                </TableHeader>
                <TableBody>
                  {finishedData.map((entry) => (
                    <FinishedRow 
                      key={entry.id} 
                      entry={entry} 
                      rank={rankMap.get(entry.id) ?? 0}
                      onNameClick={handleNameClick}
                      onSoftDelete={handleSoftDelete}
                      onPermanentDelete={handlePermanentDelete}
                      isHighlighted={highlightedId === entry.id}
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

        {/* Right: Live Table - identical to User side */}
        <Card className="p-0 overflow-hidden shadow-lg border-2 border-blue-500/50">
          <AdminLiveScoreTable data={data} onNameClick={handleNameClick} />
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

      {/* Soft Delete Confirmation */}
      {softDeleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => !isDeleting && setSoftDeleteTarget(null)}>
          <div className="bg-background rounded-lg shadow-lg p-6 max-w-md w-full mx-4 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 text-amber-600">
              <Trash2 className="w-5 h-5" />
              <h3 className="font-semibold text-lg">Hapus ke Sampah</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Data <strong>{softDeleteTarget.name}</strong> akan dipindahkan ke Sampah dan bisa dipulihkan kembali.
            </p>
            <div className="bg-muted p-3 rounded text-sm space-y-1">
              <p><strong>Skor:</strong> TWK:{softDeleteTarget.twk_score} TIU:{softDeleteTarget.tiu_score} TKP:{softDeleteTarget.tkp_score}</p>
              <p><strong>Total:</strong> {softDeleteTarget.total_score}</p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSoftDeleteTarget(null)} disabled={isDeleting}>Batal</Button>
              <Button onClick={confirmSoftDelete} disabled={isDeleting} className="bg-amber-600 hover:bg-amber-700">
                {isDeleting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Menghapus...</> : <><Trash2 className="w-4 h-4 mr-2" />Hapus ke Sampah</>}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Permanent Delete Confirmation */}
      {permanentDeleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => !isDeleting && setPermanentDeleteTarget(null)}>
          <div className="bg-background rounded-lg shadow-lg p-6 max-w-md w-full mx-4 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="font-semibold text-lg">Hapus Permanen</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Data <strong>{permanentDeleteTarget.name}</strong> akan dihapus permanen.
              <span className="font-semibold text-destructive"> Tindakan ini TIDAK dapat dibatalkan!</span>
            </p>
            <div className="bg-destructive/10 border border-destructive/20 p-3 rounded text-sm space-y-1">
              <p><strong>Skor:</strong> TWK:{permanentDeleteTarget.twk_score} TIU:{permanentDeleteTarget.tiu_score} TKP:{permanentDeleteTarget.tkp_score}</p>
              <p><strong>Total:</strong> {permanentDeleteTarget.total_score}</p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setPermanentDeleteTarget(null)} disabled={isDeleting}>Batal</Button>
              <Button variant="destructive" onClick={confirmPermanentDelete} disabled={isDeleting}>
                {isDeleting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Menghapus...</> : <><Trash2 className="w-4 h-4 mr-2" />Hapus Permanen</>}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AdminLeaderboardMirror;
