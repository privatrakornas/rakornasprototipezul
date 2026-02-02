import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, FileText, Eye, Columns } from 'lucide-react';
import { ExamSession, AuditLog } from './types';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

interface ExportPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessions: ExamSession[];
  auditLogs: AuditLog[];
}

// Column definitions
const SESSION_COLUMNS = [
  { key: 'name', label: 'Nama', default: true },
  { key: 'status', label: 'Status', default: true },
  { key: 'twk_score', label: 'TWK', default: true },
  { key: 'tiu_score', label: 'TIU', default: true },
  { key: 'tkp_score', label: 'TKP', default: true },
  { key: 'total_score', label: 'Total Skor', default: true },
  { key: 'progress', label: 'Progress', default: true },
  { key: 'duration_minutes', label: 'Durasi (menit)', default: true },
  { key: 'disqualification_reason', label: 'Alasan Diskualifikasi', default: false },
  { key: 'started_at', label: 'Mulai', default: true },
  { key: 'finished_at', label: 'Selesai', default: true },
  { key: 'device_fingerprint', label: 'Device ID', default: false },
  { key: 'created_at', label: 'Dibuat', default: false },
];

const AUDIT_COLUMNS = [
  { key: 'created_at', label: 'Waktu', default: true },
  { key: 'action', label: 'Aksi', default: true },
  { key: 'target_id', label: 'Target ID', default: false },
  { key: 'target_name', label: 'Target Nama', default: true },
  { key: 'details', label: 'Detail', default: true },
  { key: 'ip_address', label: 'IP Address', default: false },
  { key: 'user_agent', label: 'User Agent', default: false },
];

const formatDateTime = (dateStr: string | null) => {
  if (!dateStr) return '-';
  try {
    return format(new Date(dateStr), 'dd MMM yyyy HH:mm', { locale: localeId });
  } catch {
    return '-';
  }
};

const getSessionValue = (session: ExamSession, key: string) => {
  switch (key) {
    case 'progress':
      return `${session.answered_count}/${session.total_questions}`;
    case 'started_at':
    case 'finished_at':
    case 'created_at':
      return formatDateTime(session[key as keyof ExamSession] as string);
    case 'duration_minutes':
      return session.duration_minutes ?? '-';
    case 'disqualification_reason':
      return session.disqualification_reason ?? '-';
    default:
      return session[key as keyof ExamSession] ?? '-';
  }
};

const getAuditValue = (log: AuditLog, key: string) => {
  if (key === 'created_at') {
    return formatDateTime(log.created_at);
  }
  return log[key as keyof AuditLog] ?? '-';
};

export const ExportPreviewDialog = ({ 
  open, 
  onOpenChange, 
  sessions, 
  auditLogs 
}: ExportPreviewDialogProps) => {
  const [activeTab, setActiveTab] = useState('sessions');
  const [sessionColumns, setSessionColumns] = useState<Set<string>>(
    new Set(SESSION_COLUMNS.filter(c => c.default).map(c => c.key))
  );
  const [auditColumns, setAuditColumns] = useState<Set<string>>(
    new Set(AUDIT_COLUMNS.filter(c => c.default).map(c => c.key))
  );

  const toggleSessionColumn = (key: string) => {
    const newSet = new Set(sessionColumns);
    if (newSet.has(key)) {
      newSet.delete(key);
    } else {
      newSet.add(key);
    }
    setSessionColumns(newSet);
  };

  const toggleAuditColumn = (key: string) => {
    const newSet = new Set(auditColumns);
    if (newSet.has(key)) {
      newSet.delete(key);
    } else {
      newSet.add(key);
    }
    setAuditColumns(newSet);
  };

  const selectAllSessionColumns = () => {
    setSessionColumns(new Set(SESSION_COLUMNS.map(c => c.key)));
  };

  const selectAllAuditColumns = () => {
    setAuditColumns(new Set(AUDIT_COLUMNS.map(c => c.key)));
  };

  // Preview data (first 5 rows)
  const previewSessions = useMemo(() => sessions.slice(0, 5), [sessions]);
  const previewAuditLogs = useMemo(() => auditLogs.slice(0, 5), [auditLogs]);

  const handleExport = (type: 'csv' | 'excel') => {
    const selectedSessionCols = SESSION_COLUMNS.filter(c => sessionColumns.has(c.key));
    const selectedAuditCols = AUDIT_COLUMNS.filter(c => auditColumns.has(c.key));

    if (selectedSessionCols.length === 0 && selectedAuditCols.length === 0) {
      toast.error('Pilih minimal satu kolom untuk export');
      return;
    }

    const workbook = XLSX.utils.book_new();

    // Sessions sheet
    if (selectedSessionCols.length > 0 && sessions.length > 0) {
      const headers = selectedSessionCols.map(c => c.label);
      const rows = sessions.map(session => 
        selectedSessionCols.map(col => getSessionValue(session, col.key))
      );
      const sessionSheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      sessionSheet['!cols'] = selectedSessionCols.map(() => ({ wch: 20 }));
      XLSX.utils.book_append_sheet(workbook, sessionSheet, 'Peserta');
    }

    // Audit logs sheet
    if (selectedAuditCols.length > 0 && auditLogs.length > 0) {
      const headers = selectedAuditCols.map(c => c.label);
      const rows = auditLogs.map(log => 
        selectedAuditCols.map(col => getAuditValue(log, col.key))
      );
      const auditSheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      auditSheet['!cols'] = selectedAuditCols.map(() => ({ wch: 20 }));
      XLSX.utils.book_append_sheet(workbook, auditSheet, 'Audit Log');
    }

    const timestamp = format(new Date(), 'yyyyMMdd-HHmm');
    const filename = `export-custom-${timestamp}`;

    if (type === 'csv') {
      // For CSV, we combine all sheets into one
      const allData: string[][] = [];
      
      if (selectedSessionCols.length > 0 && sessions.length > 0) {
        allData.push(['=== DATA PESERTA ===']);
        allData.push(selectedSessionCols.map(c => c.label));
        sessions.forEach(session => {
          allData.push(selectedSessionCols.map(col => String(getSessionValue(session, col.key))));
        });
        allData.push([]);
      }

      if (selectedAuditCols.length > 0 && auditLogs.length > 0) {
        allData.push(['=== AUDIT LOG ===']);
        allData.push(selectedAuditCols.map(c => c.label));
        auditLogs.forEach(log => {
          allData.push(selectedAuditCols.map(col => String(getAuditValue(log, col.key))));
        });
      }

      const csvContent = allData.map(row => 
        row.map(cell => {
          const str = String(cell);
          if (str.includes(',') || str.includes('\n') || str.includes('"')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        }).join(',')
      ).join('\n');

      const BOM = '\uFEFF';
      const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else {
      XLSX.writeFile(workbook, `${filename}.xlsx`);
    }

    const sessionCount = selectedSessionCols.length > 0 ? sessions.length : 0;
    const auditCount = selectedAuditCols.length > 0 ? auditLogs.length : 0;
    toast.success(`Export berhasil: ${sessionCount} peserta, ${auditCount} audit log`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            Preview & Pilih Kolom Export
          </DialogTitle>
          <DialogDescription>
            Pilih kolom yang ingin diexport dan preview data sebelum mengunduh
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="sessions" className="gap-2">
              <FileText className="w-4 h-4" />
              Data Peserta ({sessions.length})
            </TabsTrigger>
            <TabsTrigger value="audit" className="gap-2">
              <FileText className="w-4 h-4" />
              Audit Log ({auditLogs.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sessions" className="space-y-4 mt-4">
            {/* Column Selection */}
            <div className="border rounded-lg p-4 bg-muted/30">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Columns className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium text-sm">Pilih Kolom ({sessionColumns.size}/{SESSION_COLUMNS.length})</span>
                </div>
                <Button variant="ghost" size="sm" onClick={selectAllSessionColumns}>
                  Pilih Semua
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {SESSION_COLUMNS.map(col => (
                  <div key={col.key} className="flex items-center gap-2">
                    <Checkbox 
                      id={`session-${col.key}`}
                      checked={sessionColumns.has(col.key)}
                      onCheckedChange={() => toggleSessionColumn(col.key)}
                    />
                    <Label htmlFor={`session-${col.key}`} className="text-sm cursor-pointer">
                      {col.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Preview Table */}
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-muted px-3 py-2 text-sm font-medium">
                Preview Data (5 baris pertama)
              </div>
              <ScrollArea className="h-[200px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {SESSION_COLUMNS.filter(c => sessionColumns.has(c.key)).map(col => (
                        <TableHead key={col.key} className="whitespace-nowrap">
                          {col.label}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewSessions.map((session, idx) => (
                      <TableRow key={idx}>
                        {SESSION_COLUMNS.filter(c => sessionColumns.has(c.key)).map(col => (
                          <TableCell key={col.key} className="whitespace-nowrap">
                            {String(getSessionValue(session, col.key)).substring(0, 30)}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                    {previewSessions.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={sessionColumns.size} className="text-center text-muted-foreground py-8">
                          Tidak ada data
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          </TabsContent>

          <TabsContent value="audit" className="space-y-4 mt-4">
            {/* Column Selection */}
            <div className="border rounded-lg p-4 bg-muted/30">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Columns className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium text-sm">Pilih Kolom ({auditColumns.size}/{AUDIT_COLUMNS.length})</span>
                </div>
                <Button variant="ghost" size="sm" onClick={selectAllAuditColumns}>
                  Pilih Semua
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {AUDIT_COLUMNS.map(col => (
                  <div key={col.key} className="flex items-center gap-2">
                    <Checkbox 
                      id={`audit-${col.key}`}
                      checked={auditColumns.has(col.key)}
                      onCheckedChange={() => toggleAuditColumn(col.key)}
                    />
                    <Label htmlFor={`audit-${col.key}`} className="text-sm cursor-pointer">
                      {col.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Preview Table */}
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-muted px-3 py-2 text-sm font-medium">
                Preview Data (5 baris pertama)
              </div>
              <ScrollArea className="h-[200px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {AUDIT_COLUMNS.filter(c => auditColumns.has(c.key)).map(col => (
                        <TableHead key={col.key} className="whitespace-nowrap">
                          {col.label}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewAuditLogs.map((log, idx) => (
                      <TableRow key={idx}>
                        {AUDIT_COLUMNS.filter(c => auditColumns.has(c.key)).map(col => (
                          <TableCell key={col.key} className="whitespace-nowrap">
                            {String(getAuditValue(log, col.key)).substring(0, 30)}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                    {previewAuditLogs.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={auditColumns.size} className="text-center text-muted-foreground py-8">
                          Tidak ada data
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button variant="outline" onClick={() => handleExport('csv')} className="gap-2">
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
          <Button onClick={() => handleExport('excel')} className="gap-2">
            <Download className="w-4 h-4" />
            Export Excel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
