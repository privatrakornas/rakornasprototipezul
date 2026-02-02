import { Button } from '@/components/ui/button';
import { Shield, LogOut, RefreshCw, Loader2, Download } from 'lucide-react';
import { toast } from 'sonner';
import { exportBulkDataToExcel } from '@/utils/exportCSV';
import { ExamSession, AuditLog } from './types';

interface AdminHeaderProps {
  onRefresh: () => void;
  onLogout: () => void;
  isFetching: boolean;
  sessions?: ExamSession[];
  auditLogs?: AuditLog[];
}

export const AdminHeader = ({ onRefresh, onLogout, isFetching, sessions = [], auditLogs = [] }: AdminHeaderProps) => {
  const handleBulkExport = () => {
    if (sessions.length === 0 && auditLogs.length === 0) {
      toast.error('Tidak ada data untuk diexport');
      return;
    }
    const counts = exportBulkDataToExcel(sessions, auditLogs);
    toast.success(
      `Export berhasil: ${counts.sessions} peserta (${counts.finished} selesai, ${counts.disqualified} diskualifikasi, ${counts.deleted} di sampah) + ${counts.auditLogs} audit log`
    );
  };

  return (
    <header className="bg-slate-900 text-white py-4 shadow-lg">
      <div className="container mx-auto px-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6" />
          <div>
            <h1 className="text-lg font-bold">Admin Panel</h1>
            <p className="text-xs text-white/70">Monitoring Sesi Ujian</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleBulkExport}
            disabled={sessions.length === 0 && auditLogs.length === 0}
            className="text-white border-white/30 hover:bg-white/10"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline ml-2">Bulk Export</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isFetching}
            className="text-white border-white/30 hover:bg-white/10"
          >
            {isFetching ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            <span className="hidden sm:inline ml-2">Refresh</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onLogout}
            className="text-white hover:bg-white/10"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline ml-2">Keluar</span>
          </Button>
        </div>
      </div>
    </header>
  );
};
