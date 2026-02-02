import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Loader2, Calendar, Mail, Play, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ScheduledExportPanelProps {
  logAuditAction?: (action: string, targetId: string | null, targetName: string | null, details: string) => Promise<void>;
}

const ScheduledExportPanel = ({ logAuditAction }: ScheduledExportPanelProps) => {
  const [enabled, setEnabled] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const { data } = await supabase
        .from('exam_config')
        .select('config_key, config_value')
        .in('config_key', ['scheduled_export_enabled', 'admin_email']);

      if (data) {
        data.forEach(item => {
          if (item.config_key === 'scheduled_export_enabled') {
            setEnabled(item.config_value === 'true');
          }
          if (item.config_key === 'admin_email') {
            setAdminEmail(item.config_value || '');
          }
        });
      }
    } catch (err) {
      console.error('Failed to fetch scheduled export config:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (enabled && !adminEmail.trim()) {
      toast.error('Email admin harus diisi jika export otomatis diaktifkan');
      return;
    }

    setIsSaving(true);
    try {
      // Update enabled status
      const { error: enabledError } = await supabase
        .from('exam_config')
        .upsert({
          config_key: 'scheduled_export_enabled',
          config_value: enabled ? 'true' : 'false',
          description: 'Aktifkan export otomatis harian',
        }, { onConflict: 'config_key' });

      if (enabledError) throw enabledError;

      // Update admin email
      const { error: emailError } = await supabase
        .from('exam_config')
        .upsert({
          config_key: 'admin_email',
          config_value: adminEmail.trim(),
          description: 'Email admin untuk notifikasi',
        }, { onConflict: 'config_key' });

      if (emailError) throw emailError;

      if (logAuditAction) {
        await logAuditAction(
          'SCHEDULED_EXPORT_CONFIG',
          null,
          null,
          `Export otomatis: ${enabled ? 'Aktif' : 'Nonaktif'}, Email: ${adminEmail || '-'}`
        );
      }

      toast.success('Pengaturan export otomatis berhasil disimpan');
    } catch (err) {
      console.error('Failed to save config:', err);
      toast.error('Gagal menyimpan pengaturan');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestExport = async () => {
    if (!adminEmail.trim()) {
      toast.error('Email admin harus diisi untuk test export');
      return;
    }

    setIsTesting(true);
    try {
      const response = await supabase.functions.invoke('scheduled-export');

      if (response.error) {
        throw new Error(response.error.message);
      }

      const result = response.data;
      if (result.success) {
        toast.success(`Test export berhasil! ${result.summary.totalSessions} peserta, ${result.summary.totalAuditLogs} audit logs. Email dikirim ke ${adminEmail}`);
      } else {
        toast.error(result.error || result.message || 'Export gagal');
      }
    } catch (err) {
      console.error('Failed to test export:', err);
      toast.error('Gagal menjalankan test export');
    } finally {
      setIsTesting(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="w-5 h-5 text-muted-foreground" />
        <h3 className="font-semibold">Export Otomatis Harian</h3>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="scheduled-export">Aktifkan Export Otomatis</Label>
            <p className="text-sm text-muted-foreground">
              Export data harian dan kirim laporan ke email admin
            </p>
          </div>
          <Switch
            id="scheduled-export"
            checked={enabled}
            onCheckedChange={setEnabled}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="admin-email" className="flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Email Admin
          </Label>
          <Input
            id="admin-email"
            type="email"
            placeholder="admin@example.com"
            value={adminEmail}
            onChange={(e) => setAdminEmail(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Laporan export akan dikirim ke email ini setiap hari
          </p>
        </div>

        <div className="bg-muted/50 p-3 rounded-lg space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium">Jadwal Export</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Export otomatis dijalankan setiap hari pukul 00:00 WIB.
            Data disimpan ke Storage dan laporan dikirim via email.
          </p>
        </div>

        <div className="flex gap-2 pt-2">
          <Button 
            onClick={handleSave} 
            disabled={isSaving}
            className="flex-1"
          >
            {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Simpan Pengaturan
          </Button>
          <Button 
            variant="outline"
            onClick={handleTestExport}
            disabled={isTesting || !adminEmail.trim()}
          >
            {isTesting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Play className="w-4 h-4 mr-2" />
            )}
            Test Export
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default ScheduledExportPanel;
