import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Download, FileSpreadsheet, FileText, Filter, X } from 'lucide-react';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import * as XLSX from 'xlsx';
import { type LeaderboardEntry, isLulus } from '@/hooks/useRealtimeLeaderboard';

interface LeaderboardExportPanelProps {
  data: LeaderboardEntry[];
  type: 'finished' | 'live';
}

const PASSING_GRADES = { TWK: 65, TIU: 80, TKP: 166 };

const formatDateTime = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '-';
  try {
    return format(new Date(dateStr), 'dd MMM yyyy HH:mm', { locale: localeId });
  } catch {
    return '-';
  }
};

const LeaderboardExportPanel = ({ data, type }: LeaderboardExportPanelProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'lulus' | 'tidak_lulus'>('all');
  
  // Apply filters to data
  const filteredData = useMemo(() => {
    let result = [...data];
    
    // Date filter
    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      fromDate.setHours(0, 0, 0, 0);
      result = result.filter(entry => {
        const entryDate = entry.created_at ? new Date(entry.created_at) : null;
        return entryDate && entryDate >= fromDate;
      });
    }
    
    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      result = result.filter(entry => {
        const entryDate = entry.created_at ? new Date(entry.created_at) : null;
        return entryDate && entryDate <= toDate;
      });
    }
    
    // Status filter (only for finished type)
    if (type === 'finished' && statusFilter !== 'all') {
      result = result.filter(entry => {
        const lulus = isLulus(entry);
        return statusFilter === 'lulus' ? lulus : !lulus;
      });
    }
    
    return result;
  }, [data, dateFrom, dateTo, statusFilter, type]);
  
  const clearFilters = () => {
    setDateFrom('');
    setDateTo('');
    setStatusFilter('all');
  };
  
  const hasFilters = dateFrom || dateTo || statusFilter !== 'all';
  
  const getHeaders = () => {
    if (type === 'live') {
      return ['#', 'Nama', 'TWK', 'TIU', 'TKP', 'Total', 'Progress', 'Mulai'];
    }
    return ['#', 'Nama', 'TWK', 'TIU', 'TKP', 'Total', 'Durasi (menit)', 'Status', 'Selesai'];
  };
  
  const mapEntryToRow = (entry: LeaderboardEntry, index: number) => {
    if (type === 'live') {
      return [
        index + 1,
        entry.name,
        entry.twk_score,
        entry.tiu_score,
        entry.tkp_score,
        entry.total_score,
        `${entry.answered_count || 0}/${entry.total_questions || 110}`,
        formatDateTime(entry.started_at),
      ];
    }
    return [
      index + 1,
      entry.name,
      entry.twk_score,
      entry.tiu_score,
      entry.tkp_score,
      entry.total_score,
      entry.duration_minutes ?? '-',
      isLulus(entry) ? 'LULUS' : 'TIDAK LULUS',
      formatDateTime(entry.created_at),
    ];
  };
  
  const downloadCSV = () => {
    const headers = getHeaders();
    const rows = filteredData.map((entry, idx) => mapEntryToRow(entry, idx));
    
    const escapeCSV = (value: string | number | null | undefined): string => {
      if (value === null || value === undefined) return '';
      const str = String(value);
      if (str.includes(',') || str.includes('\n') || str.includes('"')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(v => escapeCSV(v)).join(','))
    ].join('\n');
    
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `leaderboard-${type}-${format(new Date(), 'yyyyMMdd-HHmm')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setIsOpen(false);
  };
  
  const downloadExcel = () => {
    const headers = getHeaders();
    const rows = filteredData.map((entry, idx) => mapEntryToRow(entry, idx));
    
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    
    // Set column widths
    worksheet['!cols'] = type === 'live'
      ? [
          { wch: 5 },  // #
          { wch: 25 }, // Nama
          { wch: 8 },  // TWK
          { wch: 8 },  // TIU
          { wch: 8 },  // TKP
          { wch: 10 }, // Total
          { wch: 12 }, // Progress
          { wch: 20 }, // Mulai
        ]
      : [
          { wch: 5 },  // #
          { wch: 25 }, // Nama
          { wch: 8 },  // TWK
          { wch: 8 },  // TIU
          { wch: 8 },  // TKP
          { wch: 10 }, // Total
          { wch: 15 }, // Durasi
          { wch: 15 }, // Status
          { wch: 20 }, // Selesai
        ];
    
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, type === 'live' ? 'Live Score' : 'Riwayat Selesai');
    
    XLSX.writeFile(workbook, `leaderboard-${type}-${format(new Date(), 'yyyyMMdd-HHmm')}.xlsx`);
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs">
          <Download className="w-3 h-3" />
          Export
          {hasFilters && (
            <span className="bg-primary text-primary-foreground text-[9px] px-1 rounded">
              {filteredData.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="end">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5" />
              Filter & Export
            </h4>
            {hasFilters && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 px-2 text-xs"
                onClick={clearFilters}
              >
                <X className="w-3 h-3 mr-1" />
                Reset
              </Button>
            )}
          </div>
          
          {/* Date filters */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[10px]">Dari Tanggal</Label>
              <Input 
                type="date" 
                value={dateFrom} 
                onChange={(e) => setDateFrom(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px]">Sampai Tanggal</Label>
              <Input 
                type="date" 
                value={dateTo} 
                onChange={(e) => setDateTo(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          </div>
          
          {/* Status filter (only for finished) */}
          {type === 'finished' && (
            <div className="space-y-1">
              <Label className="text-[10px]">Status Kelulusan</Label>
              <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua</SelectItem>
                  <SelectItem value="lulus">Lulus Saja</SelectItem>
                  <SelectItem value="tidak_lulus">Tidak Lulus Saja</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          
          {/* Preview count */}
          <div className="text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1.5">
            Data yang akan diekspor: <span className="font-semibold">{filteredData.length}</span> peserta
          </div>
          
          {/* Export buttons */}
          <div className="grid grid-cols-2 gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8 text-xs gap-1.5"
              onClick={downloadCSV}
              disabled={filteredData.length === 0}
            >
              <FileText className="w-3.5 h-3.5" />
              CSV
            </Button>
            <Button 
              size="sm" 
              className="h-8 text-xs gap-1.5"
              onClick={downloadExcel}
              disabled={filteredData.length === 0}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Excel
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default LeaderboardExportPanel;
