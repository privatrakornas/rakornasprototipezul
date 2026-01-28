import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Clock, 
  Calendar, 
  Download, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  RefreshCw,
  HardDrive,
  FileJson,
  Play
} from 'lucide-react';
import { useBackupSchedule } from '@/hooks/useBackupSchedule';

const BackupSchedulePanel = () => {
  const {
    config,
    updateConfig,
    isRunning,
    runBackup,
    history,
    isLoadingHistory,
    fetchHistory,
    downloadBackup,
  } = useBackupSchedule();

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('id-ID', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getBackupTypeBadge = (type: string) => {
    if (type === 'manual') {
      return <Badge variant="outline">Manual</Badge>;
    }
    if (type.includes('hourly')) {
      return <Badge variant="secondary">Hourly</Badge>;
    }
    if (type.includes('daily')) {
      return <Badge variant="default">Daily</Badge>;
    }
    return <Badge variant="outline">{type}</Badge>;
  };

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="w-5 h-5 text-primary" />
        <h3 className="font-semibold">Jadwal Backup Otomatis</h3>
      </div>

      <div className="space-y-4">
        {/* Schedule Configuration */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Aktifkan Backup Otomatis</Label>
              <p className="text-xs text-muted-foreground">
                Backup akan berjalan di background sesuai jadwal
              </p>
            </div>
            <Switch
              checked={config.enabled && config.interval !== 'disabled'}
              onCheckedChange={(checked) => {
                updateConfig({ 
                  enabled: checked,
                  interval: checked ? 'daily' : 'disabled'
                });
              }}
            />
          </div>

          {config.enabled && config.interval !== 'disabled' && (
            <>
              <div className="flex items-center gap-3">
                <Label className="text-sm w-20">Interval:</Label>
                <Select
                  value={config.interval}
                  onValueChange={(value: 'hourly' | 'daily') => updateConfig({ interval: value })}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hourly">Setiap Jam</SelectItem>
                    <SelectItem value="daily">Setiap Hari</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="bg-muted/50 rounded-lg p-3 space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <Clock className="w-3 h-3 text-muted-foreground" />
                  <span>
                    {config.lastRun 
                      ? `Terakhir: ${formatDate(config.lastRun)}`
                      : 'Belum pernah berjalan'}
                  </span>
                </div>
                {config.nextRun && (
                  <div className="flex items-center gap-2 text-primary">
                    <Calendar className="w-3 h-3" />
                    <span>Berikutnya: {formatDate(config.nextRun)}</span>
                  </div>
                )}
              </div>
            </>
          )}

          <Button
            onClick={() => runBackup('manual')}
            disabled={isRunning}
            variant="outline"
            size="sm"
            className="gap-2 w-full"
          >
            {isRunning ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Backup sedang berjalan...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Jalankan Backup Sekarang
              </>
            )}
          </Button>
        </div>

        <Separator />

        {/* Backup History */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium">
              <HardDrive className="w-4 h-4 text-muted-foreground" />
              Riwayat Backup
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchHistory}
              disabled={isLoadingHistory}
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingHistory ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          <ScrollArea className="h-48">
            {history.length === 0 ? (
              <div className="text-center py-6 text-sm text-muted-foreground">
                Belum ada riwayat backup
              </div>
            ) : (
              <div className="space-y-2 pr-4">
                {history.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2 bg-muted/30 rounded-lg text-xs"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {item.status === 'completed' ? (
                        <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-destructive shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium truncate max-w-32">
                            {item.filename.replace('backup-', '').replace('.json', '')}
                          </span>
                          {getBackupTypeBadge(item.backup_type)}
                        </div>
                        <div className="text-muted-foreground flex items-center gap-2 mt-0.5">
                          <span>{formatDate(item.created_at)}</span>
                          <span>•</span>
                          <span>{formatFileSize(item.file_size)}</span>
                          <span>•</span>
                          <span>{item.sessions_count} sesi</span>
                        </div>
                      </div>
                    </div>
                    
                    {item.status === 'completed' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => downloadBackup(item.filename)}
                        className="shrink-0"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Info */}
        <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">
          <p className="font-medium mb-1">Catatan:</p>
          <ul className="list-disc list-inside space-y-0.5">
            <li>Backup otomatis berjalan saat tab admin terbuka</li>
            <li>Maksimal 30 file backup disimpan (otomatis cleanup)</li>
            <li>Backup mencakup sesi, jawaban, profil, dan log audit</li>
            <li>File backup dapat diunduh dan digunakan untuk restore</li>
          </ul>
        </div>
      </div>
    </Card>
  );
};

export default BackupSchedulePanel;
