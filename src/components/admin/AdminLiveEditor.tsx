import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Save, RotateCcw, Undo2, Loader2, LogIn, BookOpen, FileText, Trophy, 
  AlertCircle, Clock, History, Settings
} from 'lucide-react';
import { toast } from 'sonner';
import { useEditableConfig, EDITABLE_DEFAULTS, type ConfigHistoryEntry } from '@/hooks/useEditableConfig';
import { format } from 'date-fns';

interface PageEditorProps {
  pageKey: string;
  title: string;
  icon: React.ReactNode;
  fields: { key: string; label: string; type: 'input' | 'textarea'; description?: string }[];
  drafts: Record<string, string>;
  onDraftChange: (key: string, value: string) => void;
}

const PageEditor = ({ title, icon, fields, drafts, onDraftChange }: PageEditorProps) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h4 className="font-semibold text-sm">{title}</h4>
      </div>
      <div className="space-y-3">
        {fields.map(field => (
          <div key={field.key} className="space-y-1.5">
            <Label htmlFor={field.key} className="text-xs font-medium">{field.label}</Label>
            {field.type === 'textarea' ? (
              <Textarea
                id={field.key}
                value={drafts[field.key] || ''}
                onChange={(e) => onDraftChange(field.key, e.target.value)}
                className="text-sm min-h-[80px]"
              />
            ) : (
              <Input
                id={field.key}
                value={drafts[field.key] || ''}
                onChange={(e) => onDraftChange(field.key, e.target.value)}
                className="h-9 text-sm"
              />
            )}
            {field.description && (
              <p className="text-[10px] text-muted-foreground">{field.description}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// Field definitions per page
const PAGE_FIELDS: Record<string, { key: string; label: string; type: 'input' | 'textarea'; description?: string }[]> = {
  login: [
    { key: 'login_title', label: 'Judul Utama', type: 'input', description: 'Judul besar di header halaman login' },
    { key: 'login_subtitle', label: 'Subtitle', type: 'input', description: 'Teks di bawah judul' },
    { key: 'login_form_title', label: 'Judul Form', type: 'input', description: 'Judul di atas form login' },
    { key: 'login_name_label', label: 'Label Nama', type: 'input' },
    { key: 'login_pin_label', label: 'Label PIN', type: 'input' },
    { key: 'login_button_text', label: 'Teks Tombol', type: 'input' },
    { key: 'login_warning_text', label: 'Teks Peringatan', type: 'textarea', description: 'Peringatan hak cipta di bawah form' },
  ],
  rules: [
    { key: 'rules_title', label: 'Judul Halaman', type: 'input' },
    { key: 'rules_subtitle', label: 'Subtitle', type: 'input' },
    { key: 'rules_time_text', label: 'Teks Waktu Pengerjaan', type: 'textarea', description: 'Mendukung tag HTML: <strong>, <em>' },
    { key: 'rules_start_button', label: 'Teks Tombol Mulai', type: 'input' },
  ],
  results: [
    { key: 'results_title', label: 'Judul Halaman', type: 'input' },
    { key: 'results_subtitle', label: 'Subtitle', type: 'input' },
  ],
  leaderboard: [
    { key: 'leaderboard_title', label: 'Judul Utama', type: 'input' },
    { key: 'leaderboard_subtitle', label: 'Subtitle', type: 'input' },
  ],
  system: [
    { key: 'system_exam_duration', label: 'Durasi Ujian (menit)', type: 'input', description: 'Waktu ujian dalam menit (10-300)' },
    { key: 'system_min_submit', label: 'Minimal Submit (menit)', type: 'input', description: 'Waktu minimum sebelum bisa submit' },
    { key: 'system_pg_twk', label: 'Passing Grade TWK', type: 'input', description: 'Skor minimum TWK (maks 150)' },
    { key: 'system_pg_tiu', label: 'Passing Grade TIU', type: 'input', description: 'Skor minimum TIU (maks 175)' },
    { key: 'system_pg_tkp', label: 'Passing Grade TKP', type: 'input', description: 'Skor minimum TKP (maks 225)' },
    { key: 'system_twk_count', label: 'Jumlah Soal TWK', type: 'input', description: 'Jumlah soal TWK (default 30)' },
    { key: 'system_tiu_count', label: 'Jumlah Soal TIU', type: 'input', description: 'Jumlah soal TIU (default 35)' },
    { key: 'system_tkp_count', label: 'Jumlah Soal TKP', type: 'input', description: 'Jumlah soal TKP (default 45)' },
  ],
};

const AdminLiveEditor = () => {
  const { configs, history, isLoading, isSaving, saveMultipleConfigs, undoChange, resetToDefault } = useEditableConfig();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [hasChanges, setHasChanges] = useState(false);

  // Init drafts from loaded configs
  useEffect(() => {
    if (!isLoading) {
      const initial: Record<string, string> = {};
      Object.keys(EDITABLE_DEFAULTS).forEach(key => {
        initial[key] = configs[key] || EDITABLE_DEFAULTS[key];
      });
      setDrafts(initial);
    }
  }, [isLoading, configs]);

  // Track changes
  useEffect(() => {
    const changed = Object.keys(drafts).some(key => drafts[key] !== (configs[key] || EDITABLE_DEFAULTS[key]));
    setHasChanges(changed);
  }, [drafts, configs]);

  const handleDraftChange = (key: string, value: string) => {
    setDrafts(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveAll = async () => {
    const updates: Record<string, string> = {};
    Object.keys(drafts).forEach(key => {
      if (drafts[key] !== (configs[key] || EDITABLE_DEFAULTS[key])) {
        updates[key] = drafts[key];
      }
    });
    if (Object.keys(updates).length === 0) {
      toast.info('Tidak ada perubahan');
      return;
    }
    await saveMultipleConfigs(updates);
  };

  const handleResetAll = () => {
    const initial: Record<string, string> = {};
    Object.keys(EDITABLE_DEFAULTS).forEach(key => {
      initial[key] = configs[key] || EDITABLE_DEFAULTS[key];
    });
    setDrafts(initial);
    toast.info('Draft dikembalikan (belum disimpan)');
  };

  const handleUndo = async (entry: ConfigHistoryEntry) => {
    const success = await undoChange(entry);
    if (success) {
      setDrafts(prev => ({ ...prev, [entry.config_key]: entry.old_value }));
    }
  };

  // Friendly key names
  const friendlyKey = (key: string) => {
    const all = Object.values(PAGE_FIELDS).flat();
    const found = all.find(f => f.key === key);
    return found?.label || key;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Memuat konfigurasi...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Live Visual Editor
              {hasChanges && (
                <Badge variant="outline" className="text-[10px] gap-1 text-amber-600 border-amber-300">
                  <AlertCircle className="w-3 h-3" />
                  Ada Perubahan
                </Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={handleResetAll} disabled={!hasChanges} className="h-8 gap-1 text-muted-foreground">
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Draft
              </Button>
              <Button size="sm" onClick={handleSaveAll} disabled={!hasChanges || isSaving} className="h-8 gap-1">
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Simpan Semua
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Edit teks dan konten yang tampil di halaman peserta. Perubahan tersimpan di database dan berlaku realtime.
          </p>
        </CardHeader>
      </Card>

      {/* Page Tabs */}
      <Card>
        <CardContent className="p-4">
          <Tabs defaultValue="login" className="space-y-4">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="login" className="gap-1 text-xs">
                <LogIn className="w-3.5 h-3.5" />
                Login
              </TabsTrigger>
              <TabsTrigger value="rules" className="gap-1 text-xs">
                <BookOpen className="w-3.5 h-3.5" />
                Petunjuk
              </TabsTrigger>
              <TabsTrigger value="results" className="gap-1 text-xs">
                <FileText className="w-3.5 h-3.5" />
                Hasil
              </TabsTrigger>
              <TabsTrigger value="leaderboard" className="gap-1 text-xs">
                <Trophy className="w-3.5 h-3.5" />
                Leaderboard
              </TabsTrigger>
              <TabsTrigger value="system" className="gap-1 text-xs">
                <Settings className="w-3.5 h-3.5" />
                Sistem
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <PageEditor
                pageKey="login"
                title="Halaman Login"
                icon={<LogIn className="w-4 h-4 text-primary" />}
                fields={PAGE_FIELDS.login}
                drafts={drafts}
                onDraftChange={handleDraftChange}
              />
            </TabsContent>

            <TabsContent value="rules">
              <PageEditor
                pageKey="rules"
                title="Halaman Petunjuk Pengerjaan"
                icon={<BookOpen className="w-4 h-4 text-primary" />}
                fields={PAGE_FIELDS.rules}
                drafts={drafts}
                onDraftChange={handleDraftChange}
              />
            </TabsContent>

            <TabsContent value="results">
              <PageEditor
                pageKey="results"
                title="Halaman Hasil Ujian"
                icon={<FileText className="w-4 h-4 text-primary" />}
                fields={PAGE_FIELDS.results}
                drafts={drafts}
                onDraftChange={handleDraftChange}
              />
            </TabsContent>

            <TabsContent value="leaderboard">
              <PageEditor
                pageKey="leaderboard"
                title="Halaman Leaderboard"
                icon={<Trophy className="w-4 h-4 text-primary" />}
                fields={PAGE_FIELDS.leaderboard}
                drafts={drafts}
                onDraftChange={handleDraftChange}
              />
            </TabsContent>

            <TabsContent value="system">
              <PageEditor
                pageKey="system"
                title="Logika & Konfigurasi Sistem"
                icon={<Settings className="w-4 h-4 text-primary" />}
                fields={PAGE_FIELDS.system}
                drafts={drafts}
                onDraftChange={handleDraftChange}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Undo History */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <History className="w-4 h-4 text-muted-foreground" />
            Riwayat Perubahan (Undo)
          </CardTitle>
          <p className="text-[10px] text-muted-foreground">
            Klik "Undo" untuk mengembalikan ke nilai sebelumnya.
          </p>
        </CardHeader>
        <CardContent className="pt-0">
          {history.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">Belum ada riwayat perubahan</p>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {history.map(entry => (
                <div key={entry.id} className="flex items-start justify-between gap-3 p-2.5 border rounded-lg text-xs bg-muted/20">
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] shrink-0">{friendlyKey(entry.config_key)}</Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {format(new Date(entry.created_at), 'dd/MM/yy HH:mm')}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-destructive line-through truncate max-w-[120px]" title={entry.old_value}>
                        {entry.old_value.substring(0, 30)}{entry.old_value.length > 30 ? '...' : ''}
                      </span>
                      <span className="text-muted-foreground">→</span>
                      <span className="text-success truncate max-w-[120px]" title={entry.new_value}>
                        {entry.new_value.substring(0, 30)}{entry.new_value.length > 30 ? '...' : ''}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleUndo(entry)}
                    disabled={isSaving}
                    className="h-7 gap-1 text-[10px] shrink-0"
                  >
                    <Undo2 className="w-3 h-3" />
                    Undo
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminLiveEditor;
