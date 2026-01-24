import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, RefreshCw, FileText, Download, X, Filter } from 'lucide-react';
import { AuditLog } from './types';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { exportAuditLogsToCSV } from '@/utils/exportCSV';
import { toast } from 'sonner';

interface AdminAuditLogProps {
  logs: AuditLog[];
  isFetching: boolean;
  onRefresh: () => void;
}

const formatDateTime = (dateStr: string | null) => {
  if (!dateStr) return '-';
  try {
    return format(new Date(dateStr), 'dd MMM yyyy HH:mm', { locale: localeId });
  } catch {
    return '-';
  }
};

const getActionBadgeVariant = (action: string) => {
  switch (action) {
    case 'ADMIN_LOGIN':
      return 'secondary';
    case 'ADMIN_LOGIN_FAILED':
    case 'DISQUALIFY':
      return 'destructive';
    case 'SOFT_DELETE':
      return 'outline';
    case 'RESTORE':
      return 'default';
    default:
      return 'secondary';
  }
};

const getActionLabel = (action: string) => {
  const labels: Record<string, string> = {
    'ADMIN_LOGIN': 'Login',
    'ADMIN_LOGIN_FAILED': 'Login Gagal',
    'ADMIN_LOGOUT': 'Logout',
    'DISQUALIFY': 'Diskualifikasi',
    'SOFT_DELETE': 'Hapus',
    'RESTORE': 'Pulihkan',
  };
  return labels[action] || action;
};

export const AdminAuditLog = ({ logs, isFetching, onRefresh }: AdminAuditLogProps) => {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [actionFilter, setActionFilter] = useState('all');

  // Filter logs based on date range and action
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const logDate = new Date(log.created_at);
      const matchesDateFrom = !dateFrom || logDate >= new Date(dateFrom);
      const matchesDateTo = !dateTo || logDate <= new Date(dateTo + 'T23:59:59');
      const matchesAction = actionFilter === 'all' || log.action === actionFilter;
      return matchesDateFrom && matchesDateTo && matchesAction;
    });
  }, [logs, dateFrom, dateTo, actionFilter]);

  const hasActiveFilters = dateFrom !== '' || dateTo !== '' || actionFilter !== 'all';

  const clearFilters = () => {
    setDateFrom('');
    setDateTo('');
    setActionFilter('all');
  };

  const handleExport = () => {
    if (filteredLogs.length === 0) {
      toast.error('Tidak ada data untuk diexport');
      return;
    }
    exportAuditLogsToCSV(filteredLogs);
    toast.success(`${filteredLogs.length} log berhasil diexport ke CSV`);
  };

  // Get unique actions for filter dropdown
  const uniqueActions = useMemo(() => {
    const actions = new Set(logs.map(log => log.action));
    return Array.from(actions).sort();
  }, [logs]);

  return (
    <Card className="overflow-hidden">
      <div className="p-4 border-b bg-slate-100">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold flex items-center gap-2">
            <FileText className="w-5 h-5 text-slate-600" />
            Riwayat Aksi Admin ({filteredLogs.length}/{logs.length})
          </h2>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={filteredLogs.length === 0}
              className="gap-1"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export CSV</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={isFetching}
            >
              {isFetching ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              <span className="ml-2 hidden sm:inline">Refresh</span>
            </Button>
          </div>
        </div>

        {/* Filter Section */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filter Audit Log</span>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="ml-auto text-muted-foreground hover:text-foreground h-7 px-2"
              >
                <X className="w-3 h-3 mr-1" />
                Reset
              </Button>
            )}
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Action Filter */}
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Semua Aksi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Aksi</SelectItem>
                {uniqueActions.map(action => (
                  <SelectItem key={action} value={action}>
                    {getActionLabel(action)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Date From */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground whitespace-nowrap">Dari:</span>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="flex-1 bg-white"
              />
            </div>
            
            {/* Date To */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground whitespace-nowrap">Sampai:</span>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="flex-1 bg-white"
              />
            </div>
          </div>

          {hasActiveFilters && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Menampilkan {filteredLogs.length} dari {logs.length} log</span>
            </div>
          )}
        </div>
      </div>
      
      {isFetching ? (
        <div className="p-8 flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="p-8 text-center text-slate-500">
          <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p>{hasActiveFilters ? 'Tidak ada log sesuai filter' : 'Belum ada riwayat aksi'}</p>
        </div>
      ) : (
        <ScrollArea className="h-[400px]">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="font-semibold">Waktu</TableHead>
                <TableHead className="font-semibold">Aksi</TableHead>
                <TableHead className="font-semibold">Target</TableHead>
                <TableHead className="font-semibold">Detail</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.map((log) => (
                <TableRow key={log.id} className="hover:bg-slate-50">
                  <TableCell className="whitespace-nowrap">
                    <span className="text-sm">{formatDateTime(log.created_at)}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getActionBadgeVariant(log.action)}>
                      {getActionLabel(log.action)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {log.target_name ? (
                      <span className="font-medium">{log.target_name}</span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="max-w-[300px]">
                    <p className="text-sm text-muted-foreground truncate" title={log.details || ''}>
                      {log.details || '-'}
                    </p>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      )}
    </Card>
  );
};
