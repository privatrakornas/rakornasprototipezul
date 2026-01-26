import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Settings, 
  Clock, 
  Target, 
  Save, 
  RotateCcw,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

// Default exam configuration
const DEFAULT_CONFIG = {
  examDurationMinutes: 100,
  passingGrades: {
    TWK: 65,
    TIU: 80,
    TKP: 166,
  },
  minimumSubmitMinutes: 45,
};

export interface ExamConfig {
  examDurationMinutes: number;
  passingGrades: {
    TWK: number;
    TIU: number;
    TKP: number;
  };
  minimumSubmitMinutes: number;
}

interface ExamConfigPanelProps {
  onConfigChange?: (config: ExamConfig) => void;
}

export const ExamConfigPanel = ({ onConfigChange }: ExamConfigPanelProps) => {
  const [config, setConfig] = useState<ExamConfig>(() => {
    // Load from localStorage if available
    const saved = localStorage.getItem('examConfig');
    return saved ? JSON.parse(saved) : DEFAULT_CONFIG;
  });
  
  const [hasChanges, setHasChanges] = useState(false);

  // Check if config differs from saved
  useEffect(() => {
    const saved = localStorage.getItem('examConfig');
    const savedConfig = saved ? JSON.parse(saved) : DEFAULT_CONFIG;
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
    return saved ? JSON.parse(saved) : DEFAULT_CONFIG;
  });

  useEffect(() => {
    const handleStorage = () => {
      const saved = localStorage.getItem('examConfig');
      if (saved) {
        setConfig(JSON.parse(saved));
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  return config;
};

export default ExamConfigPanel;
