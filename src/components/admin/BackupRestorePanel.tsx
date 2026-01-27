import { useState, useRef, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  Download, 
  Upload, 
  Database, 
  FileJson, 
  CheckCircle2, 
  AlertTriangle,
  Loader2,
  HardDrive,
  Clock,
  Users
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface BackupData {
  version: string;
  exportedAt: string;
  tables: {
    exam_sessions: any[];
    user_answers: any[];
    profiles: any[];
    audit_logs: any[];
  };
  metadata: {
    totalSessions: number;
    totalAnswers: number;
    totalProfiles: number;
    totalAuditLogs: number;
  };
}

interface RestoreStats {
  sessions: { success: number; failed: number };
  answers: { success: number; failed: number };
  profiles: { success: number; failed: number };
  auditLogs: { success: number; failed: number };
}

const BackupRestorePanel = () => {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [importProgress, setImportProgress] = useState(0);
  const [lastBackup, setLastBackup] = useState<string | null>(() => {
    return localStorage.getItem('lastBackupTime');
  });
  
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<BackupData | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const exportBackup = useCallback(async () => {
    setIsExporting(true);
    setExportProgress(0);

    try {
      // Fetch all data from tables
      setExportProgress(10);
      
      const [sessionsResult, answersResult, profilesResult, auditResult] = await Promise.all([
        supabase.from('exam_sessions').select('*').order('created_at', { ascending: false }),
        supabase.from('user_answers').select('*').order('answered_at', { ascending: false }),
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('audit_logs').select('*').order('created_at', { ascending: false }),
      ]);

      setExportProgress(60);

      if (sessionsResult.error) throw new Error(`Sessions: ${sessionsResult.error.message}`);
      if (answersResult.error) throw new Error(`Answers: ${answersResult.error.message}`);
      if (profilesResult.error) throw new Error(`Profiles: ${profilesResult.error.message}`);
      if (auditResult.error) throw new Error(`Audit: ${auditResult.error.message}`);

      const backupData: BackupData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        tables: {
          exam_sessions: sessionsResult.data || [],
          user_answers: answersResult.data || [],
          profiles: profilesResult.data || [],
          audit_logs: auditResult.data || [],
        },
        metadata: {
          totalSessions: sessionsResult.data?.length || 0,
          totalAnswers: answersResult.data?.length || 0,
          totalProfiles: profilesResult.data?.length || 0,
          totalAuditLogs: auditResult.data?.length || 0,
        },
      };

      setExportProgress(80);

      // Create and download file
      const jsonString = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const dateStr = new Date().toISOString().split('T')[0];
      const timeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace(':', '-');
      const filename = `backup-ujian-${dateStr}-${timeStr}.json`;

      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setExportProgress(100);

      // Save last backup time
      const now = new Date().toISOString();
      localStorage.setItem('lastBackupTime', now);
      setLastBackup(now);

      toast.success(`Backup berhasil! ${backupData.metadata.totalSessions} sesi, ${backupData.metadata.totalAnswers} jawaban`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error(`Gagal export: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsExporting(false);
      setTimeout(() => setExportProgress(0), 1000);
    }
  }, []);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    // Validate file type
    if (!file.name.endsWith('.json')) {
      toast.error('File harus berformat JSON');
      return;
    }

    // Validate file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      toast.error('Ukuran file maksimal 50MB');
      return;
    }

    try {
      const text = await file.text();
      const data = JSON.parse(text) as BackupData;

      // Validate structure
      if (!data.version || !data.tables || !data.metadata) {
        toast.error('Format file backup tidak valid');
        return;
      }

      if (!data.tables.exam_sessions || !data.tables.user_answers) {
        toast.error('Data backup tidak lengkap');
        return;
      }

      // Show preview dialog
      setPendingFile(file);
      setPreviewData(data);
      setConfirmDialogOpen(true);
    } catch (error) {
      console.error('Parse error:', error);
      toast.error('Gagal membaca file JSON');
    }
  }, []);

  const executeRestore = useCallback(async () => {
    if (!previewData) return;

    setConfirmDialogOpen(false);
    setIsImporting(true);
    setImportProgress(0);

    const stats: RestoreStats = {
      sessions: { success: 0, failed: 0 },
      answers: { success: 0, failed: 0 },
      profiles: { success: 0, failed: 0 },
      auditLogs: { success: 0, failed: 0 },
    };

    try {
      // 1. Restore profiles first (no dependencies)
      setImportProgress(10);
      for (const profile of previewData.tables.profiles) {
        const { error } = await supabase
          .from('profiles')
          .upsert(profile, { onConflict: 'id' });
        
        if (error) {
          stats.profiles.failed++;
        } else {
          stats.profiles.success++;
        }
      }

      // 2. Restore exam sessions
      setImportProgress(30);
      for (const session of previewData.tables.exam_sessions) {
        const { error } = await supabase
          .from('exam_sessions')
          .upsert(session, { onConflict: 'id' });
        
        if (error) {
          stats.sessions.failed++;
        } else {
          stats.sessions.success++;
        }
      }

      // 3. Restore user answers (depends on sessions)
      setImportProgress(60);
      for (const answer of previewData.tables.user_answers) {
        const { error } = await supabase
          .from('user_answers')
          .upsert(answer, { onConflict: 'id' });
        
        if (error) {
          stats.answers.failed++;
        } else {
          stats.answers.success++;
        }
      }

      // 4. Restore audit logs
      setImportProgress(85);
      for (const log of previewData.tables.audit_logs) {
        const { error } = await supabase
          .from('audit_logs')
          .insert(log);
        
        if (error) {
          stats.auditLogs.failed++;
        } else {
          stats.auditLogs.success++;
        }
      }

      setImportProgress(100);

      // Log restore action
      await supabase.from('audit_logs').insert({
        action: 'DATA_RESTORE',
        details: `Restore dari backup ${previewData.exportedAt}: ${stats.sessions.success} sesi, ${stats.answers.success} jawaban, ${stats.profiles.success} profil`,
        user_agent: navigator.userAgent,
      });

      // Show result
      const totalSuccess = stats.sessions.success + stats.answers.success + stats.profiles.success;
      const totalFailed = stats.sessions.failed + stats.answers.failed + stats.profiles.failed;

      if (totalFailed === 0) {
        toast.success(`Restore berhasil! ${totalSuccess} data dipulihkan`);
      } else {
        toast.warning(`Restore selesai: ${totalSuccess} sukses, ${totalFailed} gagal`);
      }
    } catch (error) {
      console.error('Restore error:', error);
      toast.error(`Gagal restore: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsImporting(false);
      setPendingFile(null);
      setPreviewData(null);
      setTimeout(() => setImportProgress(0), 1000);
    }
  }, [previewData]);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('id-ID', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  return (
    <>
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Database className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Backup & Restore Data</h3>
        </div>

        <div className="space-y-4">
          {/* Export Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Download className="w-4 h-4 text-muted-foreground" />
                  Export Backup
                </div>
                <p className="text-xs text-muted-foreground pl-6">
                  Download semua data ujian ke file JSON
                </p>
              </div>
              <Button
                onClick={exportBackup}
                disabled={isExporting || isImporting}
                className="gap-2"
                size="sm"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <FileJson className="w-4 h-4" />
                    Export JSON
                  </>
                )}
              </Button>
            </div>
            
            {isExporting && (
              <div className="pl-6 space-y-1">
                <Progress value={exportProgress} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {exportProgress < 60 ? 'Mengambil data...' : 
                   exportProgress < 80 ? 'Menyiapkan file...' : 
                   exportProgress < 100 ? 'Mengunduh...' : 'Selesai!'}
                </p>
              </div>
            )}

            {lastBackup && (
              <div className="pl-6 flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                Backup terakhir: {formatDate(lastBackup)}
              </div>
            )}
          </div>

          <Separator />

          {/* Import Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Upload className="w-4 h-4 text-muted-foreground" />
                  Import / Restore
                </div>
                <p className="text-xs text-muted-foreground pl-6">
                  Pulihkan data dari file backup JSON
                </p>
              </div>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleFileSelect}
                  className="hidden"
                  disabled={isExporting || isImporting}
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isExporting || isImporting}
                  variant="outline"
                  className="gap-2"
                  size="sm"
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Pilih File
                    </>
                  )}
                </Button>
              </div>
            </div>

            {isImporting && (
              <div className="pl-6 space-y-1">
                <Progress value={importProgress} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {importProgress < 30 ? 'Memulihkan profil...' : 
                   importProgress < 60 ? 'Memulihkan sesi ujian...' : 
                   importProgress < 85 ? 'Memulihkan jawaban...' : 
                   importProgress < 100 ? 'Memulihkan log...' : 'Selesai!'}
                </p>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">
            <p className="font-medium mb-1">Catatan:</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>Backup mencakup: sesi ujian, jawaban, profil, dan log audit</li>
              <li>Import akan menggabungkan data (upsert), bukan menimpa</li>
              <li>Data yang sudah ada dengan ID sama akan diperbarui</li>
              <li>Disarankan backup rutin setiap hari untuk keamanan data</li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Confirm Restore Dialog */}
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Konfirmasi Restore Data
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>Anda akan memulihkan data dari file backup:</p>
                
                {previewData && (
                  <div className="bg-muted rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <FileJson className="w-4 h-4" />
                        {pendingFile?.name}
                      </span>
                      <Badge variant="secondary">
                        {pendingFile ? formatFileSize(pendingFile.size) : ''}
                      </Badge>
                    </div>
                    
                    <Separator />
                    
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <Users className="w-3 h-3 text-muted-foreground" />
                        <span>{previewData.metadata.totalSessions} sesi ujian</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-3 h-3 text-muted-foreground" />
                        <span>{previewData.metadata.totalAnswers} jawaban</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <HardDrive className="w-3 h-3 text-muted-foreground" />
                        <span>{previewData.metadata.totalProfiles} profil</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-3 h-3 text-muted-foreground" />
                        <span>{formatDate(previewData.exportedAt)}</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-2 text-destructive bg-destructive/10 rounded-lg p-2 text-xs">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    Data dengan ID yang sama akan diperbarui. Pastikan Anda memiliki backup terbaru sebelum melanjutkan.
                  </span>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={executeRestore}>
              Lanjutkan Restore
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default BackupRestorePanel;
