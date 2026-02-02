import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Loader2, RefreshCw, FileText, Download, X, Filter, Search, ChevronDown, Settings2 } from 'lucide-react';
import { AuditLog } from './types';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { exportAuditLogsToCSV, exportAuditLogsToExcel } from '@/utils/exportCSV';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';

interface AdminAuditLogProps {
  logs: AuditLog[];
  isFetching: boolean;
  onRefresh: () => void;
  totalCount: number;
  hasMore: boolean;
  onLoadMore: () => void;
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
    case 'PIN_CHANGE':
    case 'PIN_RESET':
      return 'secondary';
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
    'PIN_CHANGE': 'Ubah PIN',
    'PIN_RESET': 'Reset PIN',
  };
  return labels[action] || action;
};

export const AdminAuditLog = ({ logs, isFetching, onRefresh, totalCount, hasMore, onLoadMore }: AdminAuditLogProps) => {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showIpAddress, setShowIpAddress] = useState(false);
  const [showUserAgent, setShowUserAgent] = useState(false);

  // Filter logs based on date range, action, and search query
  const filteredLogs = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    return logs.filter(log => {
      const logDate = new Date(log.created_at);
      const matchesDateFrom = !dateFrom || logDate >= new Date(dateFrom);
      const matchesDateTo = !dateTo || logDate <= new Date(dateTo + 'T23:59:59');
      
      // Handle category filters
      let matchesAction = actionFilter === 'all';
      if (!matchesAction) {
        if (actionFilter === 'pin') {
          matchesAction = log.action === 'PIN_CHANGE' || log.action === 'PIN_RESET';
        } else if (actionFilter === 'login') {
          matchesAction = log.action === 'ADMIN_LOGIN' || log.action === 'ADMIN_LOGIN_FAILED' || log.action === 'ADMIN_LOGOUT';
        } else if (actionFilter === 'peserta') {
          matchesAction = log.action === 'DISQUALIFY' || log.action === 'SOFT_DELETE' || log.action === 'RESTORE';
        } else {
          matchesAction = log.action === actionFilter;
        }
      }
      
      const matchesSearch = !query || 
        (log.target_name?.toLowerCase().includes(query)) ||
        (log.details?.toLowerCase().includes(query));
      return matchesDateFrom && matchesDateTo && matchesAction && matchesSearch;
    });
  }, [logs, dateFrom, dateTo, actionFilter, searchQuery]);

  const hasActiveFilters = dateFrom !== '' || dateTo !== '' || actionFilter !== 'all' || searchQuery !== '';

  const clearFilters = () => {
    setDateFrom('');
    setDateTo('');
    setActionFilter('all');
    setSearchQuery('');
  };

  // Get logs by category
  const getLogsByCategory = (category: string) => {
    switch (category) {
      case 'login':
        return logs.filter(log => 
          log.action === 'ADMIN_LOGIN' || log.action === 'ADMIN_LOGIN_FAILED' || log.action === 'ADMIN_LOGOUT'
        );
      case 'peserta':
        return logs.filter(log => 
          log.action === 'DISQUALIFY' || log.action === 'SOFT_DELETE' || log.action === 'RESTORE'
        );
      case 'pin':
        return logs.filter(log => 
          log.action === 'PIN_CHANGE' || log.action === 'PIN_RESET'
        );
      default:
        return logs;
    }
  };

  const handleExportCSV = (category?: string) => {
    const logsToExport = category ? getLogsByCategory(category) : filteredLogs;
    if (logsToExport.length === 0) {
      toast.error('Tidak ada data untuk diexport');
      return;
    }
    const filename = category ? `audit-log-${category}` : 'audit-log';
    exportAuditLogsToCSV(logsToExport, filename);
    toast.success(`${logsToExport.length} log berhasil diexport ke CSV`);
  };

  const handleExportExcel = (category?: string) => {
    const logsToExport = category ? getLogsByCategory(category) : filteredLogs;
    if (logsToExport.length === 0) {
      toast.error('Tidak ada data untuk diexport');
      return;
    }
    const filename = category ? `audit-log-${category}` : 'audit-log';
    exportAuditLogsToExcel(logsToExport, filename);
    toast.success(`${logsToExport.length} log berhasil diexport ke Excel`);
  };

  // Get unique actions for filter dropdown
  const uniqueActions = useMemo(() => {
    const actions = new Set(logs.map(log => log.action));
    return Array.from(actions).sort();
  }, [logs]);

  // Count logs per category and action
  const actionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    
    // Category counts
    counts.login = logs.filter(log => 
      log.action === 'ADMIN_LOGIN' || log.action === 'ADMIN_LOGIN_FAILED' || log.action === 'ADMIN_LOGOUT'
    ).length;
    counts.peserta = logs.filter(log => 
      log.action === 'DISQUALIFY' || log.action === 'SOFT_DELETE' || log.action === 'RESTORE'
    ).length;
    counts.pin = logs.filter(log => 
      log.action === 'PIN_CHANGE' || log.action === 'PIN_RESET'
    ).length;
    
    // Individual action counts
    logs.forEach(log => {
      counts[log.action] = (counts[log.action] || 0) + 1;
    });
    
    return counts;
  }, [logs]);

  return (
    <Card className="overflow-hidden">
      <div className="p-4 border-b bg-muted">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold flex items-center gap-2">
            <FileText className="w-5 h-5 text-muted-foreground" />
            Riwayat Aksi Admin ({filteredLogs.length}/{logs.length} dimuat, {totalCount} total)
          </h2>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={filteredLogs.length === 0}
                  className="gap-1"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">Export</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Export Semua (Filter Aktif)</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => handleExportCSV()}>
                  <FileText className="w-4 h-4 mr-2" />
                  CSV ({filteredLogs.length} log)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExportExcel()}>
                  <FileText className="w-4 h-4 mr-2" />
                  Excel ({filteredLogs.length} log)
                </DropdownMenuItem>
                
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Export Per Kategori</DropdownMenuLabel>
                
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    🔐 Login Admin ({actionCounts.login || 0})
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem onClick={() => handleExportCSV('login')}>
                      <FileText className="w-4 h-4 mr-2" />
                      Export CSV
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExportExcel('login')}>
                      <FileText className="w-4 h-4 mr-2" />
                      Export Excel
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    👤 Manajemen Peserta ({actionCounts.peserta || 0})
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem onClick={() => handleExportCSV('peserta')}>
                      <FileText className="w-4 h-4 mr-2" />
                      Export CSV
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExportExcel('peserta')}>
                      <FileText className="w-4 h-4 mr-2" />
                      Export Excel
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    🔑 Manajemen PIN ({actionCounts.pin || 0})
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem onClick={() => handleExportCSV('pin')}>
                      <FileText className="w-4 h-4 mr-2" />
                      Export CSV
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExportExcel('pin')}>
                      <FileText className="w-4 h-4 mr-2" />
                      Export Excel
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              </DropdownMenuContent>
            </DropdownMenu>
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
          
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Cari berdasarkan nama target atau detail..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-white"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Action Filter */}
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Semua Aksi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Aksi ({logs.length})</SelectItem>
                <SelectSeparator />
                <SelectGroup>
                  <SelectLabel className="text-xs text-muted-foreground">Kategori</SelectLabel>
                  <SelectItem value="login" className="font-medium">
                    🔐 Login Admin ({actionCounts.login || 0})
                  </SelectItem>
                  <SelectItem value="peserta" className="font-medium">
                    👤 Manajemen Peserta ({actionCounts.peserta || 0})
                  </SelectItem>
                  <SelectItem value="pin" className="font-medium">
                    🔑 Manajemen PIN ({actionCounts.pin || 0})
                  </SelectItem>
                </SelectGroup>
                <SelectSeparator />
                <SelectGroup>
                  <SelectLabel className="text-xs text-muted-foreground">Aksi Individual</SelectLabel>
                  {uniqueActions.map(action => (
                    <SelectItem key={action} value={action}>
                      {getActionLabel(action)} ({actionCounts[action] || 0})
                    </SelectItem>
                  ))}
                </SelectGroup>
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
              <span>Menampilkan {filteredLogs.length} dari {logs.length} log yang dimuat ({totalCount} total)</span>
            </div>
          )}

          {/* Column visibility toggles */}
          <div className="flex items-center gap-4 pt-2 border-t border-border/50">
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Settings2 className="w-4 h-4" />
              <span>Kolom:</span>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox 
                id="show-ip" 
                checked={showIpAddress} 
                onCheckedChange={(checked) => setShowIpAddress(checked === true)}
              />
              <Label htmlFor="show-ip" className="text-sm cursor-pointer">IP Address</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox 
                id="show-ua" 
                checked={showUserAgent} 
                onCheckedChange={(checked) => setShowUserAgent(checked === true)}
              />
              <Label htmlFor="show-ua" className="text-sm cursor-pointer">User Agent</Label>
            </div>
          </div>
        </div>
      </div>
      
      {isFetching ? (
        <div className="p-8 flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground">
          <FileText className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
          <p>{hasActiveFilters ? 'Tidak ada log sesuai filter' : 'Belum ada riwayat aksi'}</p>
        </div>
      ) : (
        <>
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">Waktu</TableHead>
                  <TableHead className="font-semibold">Aksi</TableHead>
                  <TableHead className="font-semibold">Target</TableHead>
                  <TableHead className="font-semibold">Detail</TableHead>
                  {showIpAddress && <TableHead className="font-semibold">IP Address</TableHead>}
                  {showUserAgent && <TableHead className="font-semibold min-w-[200px]">User Agent</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => (
                  <TableRow key={log.id} className="hover:bg-muted/30">
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
                    {showIpAddress && (
                      <TableCell className="whitespace-nowrap">
                        <span className="text-sm font-mono">{log.ip_address || '-'}</span>
                      </TableCell>
                    )}
                    {showUserAgent && (
                      <TableCell className="max-w-[250px]">
                        <p className="text-xs text-muted-foreground truncate" title={log.user_agent || ''}>
                          {log.user_agent || '-'}
                        </p>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
          
          {/* Load More Button */}
          {hasMore && (
            <div className="p-4 border-t bg-muted/50">
              <Button
                variant="outline"
                className="w-full"
                onClick={onLoadMore}
                disabled={isFetching}
              >
                {isFetching ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <ChevronDown className="w-4 h-4 mr-2" />
                )}
                Muat Lebih Banyak ({logs.length} dari {totalCount})
              </Button>
            </div>
          )}
        </>
      )}
    </Card>
  );
};
