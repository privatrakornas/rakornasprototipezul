import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, RefreshCw, FileText, Download } from 'lucide-react';
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
  const handleExport = () => {
    if (logs.length === 0) {
      toast.error('Tidak ada data untuk diexport');
      return;
    }
    exportAuditLogsToCSV(logs);
    toast.success(`${logs.length} log berhasil diexport ke CSV`);
  };

  return (
    <Card className="overflow-hidden">
      <div className="p-4 border-b bg-slate-100">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold flex items-center gap-2">
            <FileText className="w-5 h-5 text-slate-600" />
            Riwayat Aksi Admin ({logs.length})
          </h2>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={logs.length === 0}
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
      </div>
      
      {isFetching ? (
        <div className="p-8 flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
        </div>
      ) : logs.length === 0 ? (
        <div className="p-8 text-center text-slate-500">
          <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p>Belum ada riwayat aksi</p>
        </div>
      ) : (
        <ScrollArea className="h-[500px]">
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
              {logs.map((log) => (
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
