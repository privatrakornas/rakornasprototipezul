import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { 
  Settings, 
  Clock, 
  Target, 
  Save, 
  RotateCcw,
  AlertCircle,
  Shield,
  Droplets,
  Key,
  Eye,
  EyeOff,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

// Default exam configuration
const DEFAULT_CONFIG = {
  examDurationMinutes: 100,
  passingGrades: {
    TWK: 65,
    TIU: 80,
    TKP: 166,
  },
  minimumSubmitMinutes: 45,
  security: {
    watermarkEnabled: true,
    contentProtectionEnabled: true,
    emailAlertEnabled: false,
    adminEmail: '',
  },
};

export interface ExamConfig {
  examDurationMinutes: number;
  passingGrades: {
    TWK: number;
    TIU: number;
    TKP: number;
  };
  minimumSubmitMinutes: number;
  security: {
    watermarkEnabled: boolean;
    contentProtectionEnabled: boolean;
    emailAlertEnabled: boolean;
    adminEmail: string;
  };
}

interface ExamConfigPanelProps {
  onConfigChange?: (config: ExamConfig) => void;
}

export const ExamConfigPanel = ({ onConfigChange }: ExamConfigPanelProps) => {
  const [config, setConfig] = useState<ExamConfig>(() => {
    // Load from localStorage if available
    const saved = localStorage.getItem('examConfig');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Merge with default to handle new fields
      return { ...DEFAULT_CONFIG, ...parsed, security: { ...DEFAULT_CONFIG.security, ...parsed.security } };
    }
    return DEFAULT_CONFIG;
  });
  
  const [hasChanges, setHasChanges] = useState(false);
  
  // PIN Management state
  const [examPin, setExamPin] = useState('');
  const [adminPin, setAdminPin] = useState('');
  const [showExamPin, setShowExamPin] = useState(false);
  const [showAdminPin, setShowAdminPin] = useState(false);
  const [isLoadingPins, setIsLoadingPins] = useState(true);
  const [isSavingPins, setIsSavingPins] = useState(false);
  const [pinHasChanges, setPinHasChanges] = useState(false);
  const [originalPins, setOriginalPins] = useState({ examPin: '', adminPin: '' });

  // Load PINs from database
  const loadPins = useCallback(async () => {
    setIsLoadingPins(true);
    try {
      const { data, error } = await supabase
        .from('exam_config')
        .select('config_key, config_value')
        .in('config_key', ['exam_pin', 'admin_pin']);
      
      if (error) throw error;
      
      const pins = { examPin: '', adminPin: '' };
      data?.forEach(item => {
        if (item.config_key === 'exam_pin') pins.examPin = item.config_value;
        if (item.config_key === 'admin_pin') pins.adminPin = item.config_value;
      });
      
      setExamPin(pins.examPin);
      setAdminPin(pins.adminPin);
      setOriginalPins(pins);
    } catch (err) {
      console.error('Error loading PINs:', err);
      toast.error('Gagal memuat konfigurasi PIN');
    } finally {
      setIsLoadingPins(false);
    }
  }, []);

  useEffect(() => {
    loadPins();
  }, [loadPins]);

  // Check PIN changes
  useEffect(() => {
    const hasChanged = examPin !== originalPins.examPin || adminPin !== originalPins.adminPin;
    setPinHasChanges(hasChanged);
  }, [examPin, adminPin, originalPins]);

  // Check if config differs from saved
  useEffect(() => {
    const saved = localStorage.getItem('examConfig');
    const savedConfig = saved ? { ...DEFAULT_CONFIG, ...JSON.parse(saved) } : DEFAULT_CONFIG;
    const isDifferent = JSON.stringify(config) !== JSON.stringify(savedConfig);
    setHasChanges(isDifferent);
  }, [config]);

  const updateDuration = (value: string) => {
    const num = parseInt(value) || 0;
    setConfig(prev => ({ ...prev, examDurationMinutes: Math.max(10, Math.min(300, num)) }));
  };

  const updateMinSubmit = (value: string) => {
    const num = parseInt(value) || 0;
    setConfig(prev => ({ ...prev, minimumSubmitMinutes: Math.max(0, Math.min(prev.examDurationMinutes, num)) }));
  };

  const updatePassingGrade = (category: 'TWK' | 'TIU' | 'TKP', value: string) => {
    const num = parseInt(value) || 0;
    const maxValues = { TWK: 150, TIU: 175, TKP: 225 };
    setConfig(prev => ({
      ...prev,
      passingGrades: {
        ...prev.passingGrades,
        [category]: Math.max(0, Math.min(maxValues[category], num)),
      },
    }));
  };

  const updateSecurity = (key: 'watermarkEnabled' | 'contentProtectionEnabled' | 'emailAlertEnabled', value: boolean) => {
    setConfig(prev => ({
      ...prev,
      security: {
        ...prev.security,
        [key]: value,
      },
    }));
  };

  const updateAdminEmail = (email: string) => {
    setConfig(prev => ({
      ...prev,
      security: {
        ...prev.security,
        adminEmail: email,
      },
    }));
  };

  const saveConfig = () => {
    localStorage.setItem('examConfig', JSON.stringify(config));
    onConfigChange?.(config);
    setHasChanges(false);
    toast.success('Konfigurasi ujian berhasil disimpan');
  };

  const resetToDefault = () => {
    setConfig(DEFAULT_CONFIG);
    localStorage.setItem('examConfig', JSON.stringify(DEFAULT_CONFIG));
    onConfigChange?.(DEFAULT_CONFIG);
    setHasChanges(false);
    toast.info('Konfigurasi dikembalikan ke default');
  };

  const savePins = async () => {
    if (examPin.length < 4) {
      toast.error('PIN Ujian minimal 4 karakter');
      return;
    }
    if (adminPin.length < 4) {
      toast.error('PIN Admin minimal 4 karakter');
      return;
    }

    setIsSavingPins(true);
    try {
      // Update exam PIN
      const { error: examError } = await supabase
        .from('exam_config')
        .update({ config_value: examPin })
        .eq('config_key', 'exam_pin');
      
      if (examError) throw examError;

      // Update admin PIN
      const { error: adminError } = await supabase
        .from('exam_config')
        .update({ config_value: adminPin })
        .eq('config_key', 'admin_pin');
      
      if (adminError) throw adminError;

      setOriginalPins({ examPin, adminPin });
      setPinHasChanges(false);
      toast.success('PIN berhasil diperbarui');
    } catch (err) {
      console.error('Error saving PINs:', err);
      toast.error('Gagal menyimpan PIN');
    } finally {
      setIsSavingPins(false);
    }
  };

  const isModified = (key: string, value: number) => {
    const defaultValue = key.includes('.')
      ? (DEFAULT_CONFIG.passingGrades as any)[key.split('.')[1]]
      : (DEFAULT_CONFIG as any)[key];
    return value !== defaultValue;
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Konfigurasi Ujian</h3>
          {hasChanges && (
            <Badge variant="outline" className="text-[10px] gap-1 text-amber-600 border-amber-300">
              <AlertCircle className="w-3 h-3" />
              Belum Disimpan
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={resetToDefault}
            className="h-8 gap-1 text-muted-foreground"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Default
          </Button>
          <Button
            size="sm"
            onClick={saveConfig}
            disabled={!hasChanges}
            className="h-8 gap-1"
          >
            <Save className="w-3.5 h-3.5" />
            Simpan
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {/* PIN Management */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Key className="w-4 h-4 text-muted-foreground" />
            Manajemen PIN
            {pinHasChanges && (
              <Badge variant="outline" className="text-[10px] gap-1 text-amber-600 border-amber-300">
                <AlertCircle className="w-3 h-3" />
                Belum Disimpan
              </Badge>
            )}
          </div>
          
          {isLoadingPins ? (
            <div className="flex items-center justify-center py-4 pl-6">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Memuat PIN...</span>
            </div>
          ) : (
            <div className="space-y-3 pl-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="exam-pin" className="text-xs">PIN Ujian (Peserta)</Label>
                  <div className="relative">
                    <Input
                      id="exam-pin"
                      type={showExamPin ? 'text' : 'password'}
                      value={examPin}
                      onChange={(e) => setExamPin(e.target.value)}
                      className="h-8 pr-8"
                      placeholder="****"
                    />
                    <button
                      type="button"
                      onClick={() => setShowExamPin(!showExamPin)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showExamPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-muted-foreground">PIN untuk peserta masuk ujian</p>
                </div>
                
                <div className="space-y-1.5">
                  <Label htmlFor="admin-pin" className="text-xs">PIN Admin</Label>
                  <div className="relative">
                    <Input
                      id="admin-pin"
                      type={showAdminPin ? 'text' : 'password'}
                      value={adminPin}
                      onChange={(e) => setAdminPin(e.target.value)}
                      className="h-8 pr-8"
                      placeholder="****"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAdminPin(!showAdminPin)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showAdminPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-muted-foreground">PIN untuk masuk panel admin</p>
                </div>
              </div>
              
              <Button
                size="sm"
                onClick={savePins}
                disabled={!pinHasChanges || isSavingPins}
                className="h-8 gap-1"
              >
                {isSavingPins ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                Simpan PIN
              </Button>
            </div>
          )}
        </div>

        <Separator />

        {/* Security Settings */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Shield className="w-4 h-4 text-muted-foreground" />
            Pengaturan Keamanan
          </div>
          
          <div className="space-y-3 pl-6">
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-3">
                <Droplets className="w-4 h-4 text-primary" />
                <div>
                  <Label className="text-sm font-medium">Watermark</Label>
                  <p className="text-[10px] text-muted-foreground">
                    Tampilkan watermark dengan nama peserta di halaman ujian & hasil
                  </p>
                </div>
              </div>
              <Switch
                checked={config.security.watermarkEnabled}
                onCheckedChange={(checked) => updateSecurity('watermarkEnabled', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-3">
                <Shield className="w-4 h-4 text-primary" />
                <div>
                  <Label className="text-sm font-medium">Proteksi Konten</Label>
                  <p className="text-[10px] text-muted-foreground">
                    Blokir klik kanan, copy-paste, dan screenshot di halaman ujian & hasil
                  </p>
                </div>
              </div>
              <Switch
                checked={config.security.contentProtectionEnabled}
                onCheckedChange={(checked) => updateSecurity('contentProtectionEnabled', checked)}
              />
            </div>
            
            <div className="p-3 bg-muted/30 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-4 h-4 text-primary" />
                  <div>
                    <Label className="text-sm font-medium">Email Alert Anomali</Label>
                    <p className="text-[10px] text-muted-foreground">
                      Kirim email otomatis saat anomali High/Critical terdeteksi
                    </p>
                  </div>
                </div>
                <Switch
                  checked={config.security.emailAlertEnabled}
                  onCheckedChange={(checked) => updateSecurity('emailAlertEnabled', checked)}
                />
              </div>
              {config.security.emailAlertEnabled && (
                <div className="pl-7">
                  <Label htmlFor="admin-email" className="text-xs">Email Admin</Label>
                  <Input
                    id="admin-email"
                    type="email"
                    placeholder="admin@example.com"
                    value={config.security.adminEmail || ''}
                    onChange={(e) => updateAdminEmail(e.target.value)}
                    className="h-8 mt-1"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        <Separator />

        {/* Duration Settings */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Clock className="w-4 h-4 text-muted-foreground" />
            Pengaturan Waktu
          </div>
          
          <div className="grid grid-cols-2 gap-4 pl-6">
            <div className="space-y-1.5">
              <Label htmlFor="duration" className="text-xs">
                Durasi Ujian (menit)
                {isModified('examDurationMinutes', config.examDurationMinutes) && (
                  <Badge variant="secondary" className="ml-2 text-[9px]">Diubah</Badge>
                )}
              </Label>
              <Input
                id="duration"
                type="number"
                value={config.examDurationMinutes}
                onChange={(e) => updateDuration(e.target.value)}
                min={10}
                max={300}
                className="h-8"
              />
              <p className="text-[10px] text-muted-foreground">Default: 100 menit</p>
            </div>
            
            <div className="space-y-1.5">
              <Label htmlFor="minSubmit" className="text-xs">
                Minimal Submit (menit)
                {isModified('minimumSubmitMinutes', config.minimumSubmitMinutes) && (
                  <Badge variant="secondary" className="ml-2 text-[9px]">Diubah</Badge>
                )}
              </Label>
              <Input
                id="minSubmit"
                type="number"
                value={config.minimumSubmitMinutes}
                onChange={(e) => updateMinSubmit(e.target.value)}
                min={0}
                max={config.examDurationMinutes}
                className="h-8"
              />
              <p className="text-[10px] text-muted-foreground">Default: 45 menit</p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Passing Grades */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Target className="w-4 h-4 text-muted-foreground" />
            Passing Grade
          </div>
          
          <div className="grid grid-cols-3 gap-4 pl-6">
            <div className="space-y-1.5">
              <Label htmlFor="pg-twk" className="text-xs">
                TWK
                {isModified('passingGrades.TWK', config.passingGrades.TWK) && (
                  <Badge variant="secondary" className="ml-2 text-[9px]">Diubah</Badge>
                )}
              </Label>
              <Input
                id="pg-twk"
                type="number"
                value={config.passingGrades.TWK}
                onChange={(e) => updatePassingGrade('TWK', e.target.value)}
                min={0}
                max={150}
                className="h-8"
              />
              <p className="text-[10px] text-muted-foreground">Maks: 150 | Default: 65</p>
            </div>
            
            <div className="space-y-1.5">
              <Label htmlFor="pg-tiu" className="text-xs">
                TIU
                {isModified('passingGrades.TIU', config.passingGrades.TIU) && (
                  <Badge variant="secondary" className="ml-2 text-[9px]">Diubah</Badge>
                )}
              </Label>
              <Input
                id="pg-tiu"
                type="number"
                value={config.passingGrades.TIU}
                onChange={(e) => updatePassingGrade('TIU', e.target.value)}
                min={0}
                max={175}
                className="h-8"
              />
              <p className="text-[10px] text-muted-foreground">Maks: 175 | Default: 80</p>
            </div>
            
            <div className="space-y-1.5">
              <Label htmlFor="pg-tkp" className="text-xs">
                TKP
                {isModified('passingGrades.TKP', config.passingGrades.TKP) && (
                  <Badge variant="secondary" className="ml-2 text-[9px]">Diubah</Badge>
                )}
              </Label>
              <Input
                id="pg-tkp"
                type="number"
                value={config.passingGrades.TKP}
                onChange={(e) => updatePassingGrade('TKP', e.target.value)}
                min={0}
                max={225}
                className="h-8"
              />
              <p className="text-[10px] text-muted-foreground">Maks: 225 | Default: 166</p>
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">
          <p className="font-medium mb-1">Catatan:</p>
          <ul className="list-disc list-inside space-y-0.5">
            <li>Perubahan konfigurasi hanya berlaku untuk sesi ujian baru</li>
            <li>Sesi yang sudah berjalan tidak terpengaruh</li>
            <li>Konfigurasi disimpan di browser admin (localStorage)</li>
          </ul>
        </div>
      </div>
    </Card>
  );
};

// Hook to get current exam config
export const useExamConfig = (): ExamConfig => {
  const [config, setConfig] = useState<ExamConfig>(() => {
    const saved = localStorage.getItem('examConfig');
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...DEFAULT_CONFIG, ...parsed, security: { ...DEFAULT_CONFIG.security, ...parsed.security } };
    }
    return DEFAULT_CONFIG;
  });

  useEffect(() => {
    const handleStorage = () => {
      const saved = localStorage.getItem('examConfig');
      if (saved) {
        const parsed = JSON.parse(saved);
        setConfig({ ...DEFAULT_CONFIG, ...parsed, security: { ...DEFAULT_CONFIG.security, ...parsed.security } });
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  return config;
};

export default ExamConfigPanel;
