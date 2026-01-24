import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, Users, UserX, Clock, Shield, AlertTriangle, Calendar, Ban, Trash2, RotateCcw } from 'lucide-react';
import { ExamSession } from './types';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

interface AdminSessionTableProps {
  sessions: ExamSession[];
  type: 'ongoing' | 'disqualified' | 'deleted';
  isFetching: boolean;
  hasActiveFilters: boolean;
  onDisqualify?: (session: ExamSession) => void;
  onDelete?: (session: ExamSession) => void;
  onRestore?: (session: ExamSession) => void;
}

const formatDateTime = (dateStr: string | null) => {
  if (!dateStr) return '-';
  try {
    return format(new Date(dateStr), 'dd MMM yyyy HH:mm', { locale: localeId });
  } catch {
    return '-';
  }
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'aborted':
      return <Badge variant="destructive" className="gap-1"><UserX className="w-3 h-3" /> Diskualifikasi</Badge>;
    case 'abandoned':
      return <Badge variant="secondary" className="gap-1 bg-orange-100 text-orange-700 border-orange-300"><Clock className="w-3 h-3" /> Ditinggalkan</Badge>;
    case 'ongoing':
      return <Badge variant="secondary" className="gap-1 bg-blue-100 text-blue-700 border-blue-300"><Users className="w-3 h-3" /> Sedang Ujian</Badge>;
    case 'finished':
      return <Badge variant="secondary" className="gap-1 bg-green-100 text-green-700 border-green-300">Selesai</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

const getReasonDisplay = (reason: string | null, status: string) => {
  if (reason) return reason;
  switch (status) {
    case 'aborted':
      return 'Pelanggaran terdeteksi (tab switch/blur)';
    case 'abandoned':
      return 'Session expired (> 24 jam tidak aktif)';
    default:
      return 'Tidak ada informasi';
  }
};

export const AdminSessionTable = ({
  sessions,
  type,
  isFetching,
  hasActiveFilters,
  onDisqualify,
  onDelete,
  onRestore,
}: AdminSessionTableProps) => {
  const getTableConfig = () => {
    switch (type) {
      case 'ongoing':
        return {
          icon: <Users className="w-5 h-5 text-blue-500" />,
          title: `Peserta Sedang Ujian (${sessions.length})`,
          subtitle: 'Klik tombol untuk diskualifikasi manual',
          bgClass: 'bg-blue-50',
          emptyIcon: <Users className="w-12 h-12 mx-auto mb-3 text-slate-300" />,
          emptyText: hasActiveFilters ? 'Tidak ada hasil sesuai filter' : 'Tidak ada peserta yang sedang ujian',
        };
      case 'disqualified':
        return {
          icon: <AlertTriangle className="w-5 h-5 text-red-500" />,
          title: `Daftar Sesi Diskualifikasi (${sessions.length})`,
          subtitle: null,
          bgClass: 'bg-red-50',
          emptyIcon: <Shield className="w-12 h-12 mx-auto mb-3 text-slate-300" />,
          emptyText: hasActiveFilters ? 'Tidak ada hasil sesuai filter' : 'Tidak ada sesi yang didiskualifikasi',
        };
      case 'deleted':
        return {
          icon: <Trash2 className="w-5 h-5 text-amber-500" />,
          title: `Data di Sampah (${sessions.length})`,
          subtitle: null,
          bgClass: 'bg-amber-50',
          emptyIcon: <Trash2 className="w-12 h-12 mx-auto mb-3 text-slate-300" />,
          emptyText: hasActiveFilters ? 'Tidak ada hasil sesuai filter' : 'Tidak ada data di sampah',
        };
    }
  };

  const config = getTableConfig();

  if (isFetching) {
    return (
      <Card className="overflow-hidden">
        <div className={`p-4 border-b ${config.bgClass}`}>
          <h2 className="font-semibold flex items-center gap-2">
            {config.icon}
            {config.title}
          </h2>
        </div>
        <div className="p-8 flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
        </div>
      </Card>
    );
  }

  if (sessions.length === 0) {
    return (
      <Card className="overflow-hidden">
        <div className={`p-4 border-b ${config.bgClass}`}>
          <h2 className="font-semibold flex items-center gap-2">
            {config.icon}
            {config.title}
          </h2>
        </div>
        <div className="p-8 text-center text-slate-500">
          {config.emptyIcon}
          <p>{config.emptyText}</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className={`p-4 border-b ${config.bgClass}`}>
        <h2 className="font-semibold flex items-center gap-2">
          {config.icon}
          {config.title}
          {config.subtitle && (
            <span className="text-xs font-normal text-muted-foreground ml-2">{config.subtitle}</span>
          )}
        </h2>
      </div>
      
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead className="font-semibold">Nama</TableHead>
              {type !== 'ongoing' && <TableHead className="font-semibold">Status</TableHead>}
              {type === 'disqualified' && <TableHead className="font-semibold">Alasan</TableHead>}
              <TableHead className="font-semibold text-center">
                {type === 'deleted' ? 'Progress' : 'Progress'}
              </TableHead>
              <TableHead className="font-semibold text-center">
                {type === 'ongoing' ? 'Skor Sementara' : 'Skor'}
              </TableHead>
              <TableHead className="font-semibold">
                {type === 'deleted' ? (
                  <>
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Dihapus
                  </>
                ) : type === 'ongoing' ? (
                  'Mulai'
                ) : (
                  <>
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Waktu
                  </>
                )}
              </TableHead>
              <TableHead className="font-semibold text-center">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessions.map((session) => (
              <TableRow key={session.id} className="hover:bg-slate-50">
                <TableCell className="font-medium">
                  <div>
                    <p className="font-semibold">{session.name}</p>
                    <p className="text-xs text-muted-foreground truncate max-w-[120px]" title={session.device_fingerprint}>
                      {session.device_fingerprint.slice(0, 8)}...
                    </p>
                  </div>
                </TableCell>
                {type !== 'ongoing' && <TableCell>{getStatusBadge(session.status)}</TableCell>}
                {type === 'disqualified' && (
                  <TableCell className="max-w-[200px]">
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {getReasonDisplay(session.disqualification_reason, session.status)}
                    </p>
                  </TableCell>
                )}
                <TableCell className="text-center">
                  <span className="text-sm font-medium">
                    {session.answered_count}/{session.total_questions}
                  </span>
                </TableCell>
                <TableCell className="text-center">
                  <div className="text-sm">
                    <p className="font-semibold">{session.total_score}</p>
                    <p className="text-xs text-muted-foreground">
                      TWK:{session.twk_score} TIU:{session.tiu_score} TKP:{session.tkp_score}
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-sm">
                    {type === 'deleted' 
                      ? formatDateTime(session.deleted_at)
                      : type === 'ongoing'
                      ? formatDateTime(session.started_at)
                      : formatDateTime(session.finished_at)}
                  </span>
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-2">
                    {type === 'ongoing' && onDisqualify && (
                      <>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => onDisqualify(session)}
                          className="gap-1"
                        >
                          <Ban className="w-3 h-3" />
                          Diskualifikasi
                        </Button>
                        {onDelete && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onDelete(session)}
                            className="gap-1 text-amber-600 border-amber-300 hover:bg-amber-50"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}
                      </>
                    )}
                    {type === 'disqualified' && onDelete && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onDelete(session)}
                        className="gap-1 text-amber-600 border-amber-300 hover:bg-amber-50"
                      >
                        <Trash2 className="w-3 h-3" />
                        Hapus
                      </Button>
                    )}
                    {type === 'deleted' && onRestore && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onRestore(session)}
                        className="gap-1 text-green-600 border-green-300 hover:bg-green-50"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Pulihkan
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
};
