import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// All editable config keys with their defaults
export const EDITABLE_DEFAULTS: Record<string, string> = {
  // Login page
  login_title: 'RAKORNAS',
  login_subtitle: 'By Zulkarnain Sinaga',
  login_form_title: 'Simulasi CAT SKD',
  login_name_label: 'Nama Lengkap',
  login_pin_label: 'PIN',
  login_button_text: 'Masuk',
  login_warning_text: 'PERINGATAN: Seluruh soal ini hasil jerih payah Privat RAKORNAS. Hak Cipta Materi ini dilindungi Undang-Undang, tidak boleh diunduh atau digandakan dan disebarluaskan melalui cara apapun tanpa izin tertulis dari Privat RAKORNAS.',
  // Rules page
  rules_title: 'PETUNJUK PENGERJAAN',
  rules_subtitle: 'Simulasi CAT SKD - RAKORNAS',
  rules_time_text: 'Anda memiliki waktu <strong>100 menit</strong> untuk mengerjakan <strong>110 soal</strong>.',
  rules_start_button: 'Mulai Ujian',
  // Results page
  results_title: 'HASIL UJIAN',
  results_subtitle: 'Simulasi CAT SKD - RAKORNAS',
  // Leaderboard page
  leaderboard_title: 'RAKORNAS',
  leaderboard_subtitle: 'Rangking Topskor Nasional',
};

export interface ConfigHistoryEntry {
  id: string;
  config_key: string;
  old_value: string;
  new_value: string;
  created_at: string;
}

export function useEditableConfig() {
  const [configs, setConfigs] = useState<Record<string, string>>({});
  const [history, setHistory] = useState<ConfigHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Load all editable configs from exam_config
  const loadConfigs = useCallback(async () => {
    setIsLoading(true);
    try {
      const keys = Object.keys(EDITABLE_DEFAULTS);
      const { data, error } = await supabase
        .from('exam_config')
        .select('config_key, config_value')
        .in('config_key', keys);

      if (error) throw error;

      const loaded: Record<string, string> = { ...EDITABLE_DEFAULTS };
      data?.forEach(item => {
        loaded[item.config_key] = item.config_value;
      });
      setConfigs(loaded);
    } catch (err) {
      console.error('Error loading editable configs:', err);
      setConfigs({ ...EDITABLE_DEFAULTS });
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load undo history
  const loadHistory = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('config_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setHistory((data || []) as ConfigHistoryEntry[]);
    } catch (err) {
      console.error('Error loading config history:', err);
    }
  }, []);

  useEffect(() => {
    loadConfigs();
    loadHistory();
  }, [loadConfigs, loadHistory]);

  // Save a single config key with history tracking
  const saveConfig = useCallback(async (key: string, newValue: string) => {
    const oldValue = configs[key] || EDITABLE_DEFAULTS[key] || '';
    if (oldValue === newValue) return true;

    setIsSaving(true);
    try {
      // Upsert config value
      const { data: existing } = await supabase
        .from('exam_config')
        .select('id')
        .eq('config_key', key)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('exam_config')
          .update({ config_value: newValue })
          .eq('config_key', key);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('exam_config')
          .insert({ config_key: key, config_value: newValue, description: `Editable: ${key}` });
        if (error) throw error;
      }

      // Save history for undo
      await supabase.from('config_history').insert({
        config_key: key,
        old_value: oldValue,
        new_value: newValue,
      });

      setConfigs(prev => ({ ...prev, [key]: newValue }));
      await loadHistory();
      return true;
    } catch (err) {
      console.error('Error saving config:', err);
      toast.error('Gagal menyimpan perubahan');
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [configs, loadHistory]);

  // Save multiple configs at once
  const saveMultipleConfigs = useCallback(async (updates: Record<string, string>) => {
    setIsSaving(true);
    try {
      for (const [key, newValue] of Object.entries(updates)) {
        const oldValue = configs[key] || EDITABLE_DEFAULTS[key] || '';
        if (oldValue === newValue) continue;

        const { data: existing } = await supabase
          .from('exam_config')
          .select('id')
          .eq('config_key', key)
          .maybeSingle();

        if (existing) {
          await supabase.from('exam_config').update({ config_value: newValue }).eq('config_key', key);
        } else {
          await supabase.from('exam_config').insert({ config_key: key, config_value: newValue, description: `Editable: ${key}` });
        }

        await supabase.from('config_history').insert({
          config_key: key,
          old_value: oldValue,
          new_value: newValue,
        });
      }

      setConfigs(prev => ({ ...prev, ...updates }));
      await loadHistory();
      toast.success('Perubahan berhasil disimpan');
      return true;
    } catch (err) {
      console.error('Error saving configs:', err);
      toast.error('Gagal menyimpan perubahan');
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [configs, loadHistory]);

  // Undo: restore previous value from history
  const undoChange = useCallback(async (historyEntry: ConfigHistoryEntry) => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('exam_config')
        .update({ config_value: historyEntry.old_value })
        .eq('config_key', historyEntry.config_key);

      if (error) throw error;

      // Record the undo as a new history entry
      await supabase.from('config_history').insert({
        config_key: historyEntry.config_key,
        old_value: historyEntry.new_value,
        new_value: historyEntry.old_value,
      });

      setConfigs(prev => ({ ...prev, [historyEntry.config_key]: historyEntry.old_value }));
      await loadHistory();
      toast.success(`"${historyEntry.config_key}" dikembalikan ke nilai sebelumnya`);
      return true;
    } catch (err) {
      console.error('Error undoing change:', err);
      toast.error('Gagal membatalkan perubahan');
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [loadHistory]);

  // Reset a key to default
  const resetToDefault = useCallback(async (key: string) => {
    const defaultValue = EDITABLE_DEFAULTS[key];
    if (!defaultValue) return false;
    return saveConfig(key, defaultValue);
  }, [saveConfig]);

  // Get a single config value (with fallback to default)
  const getConfig = useCallback((key: string): string => {
    return configs[key] || EDITABLE_DEFAULTS[key] || '';
  }, [configs]);

  return {
    configs,
    history,
    isLoading,
    isSaving,
    getConfig,
    saveConfig,
    saveMultipleConfigs,
    undoChange,
    resetToDefault,
    reload: loadConfigs,
  };
}

// Lightweight hook for user-facing pages (read-only)
export function usePageConfig(keys: string[]) {
  const [configs, setConfigs] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const { data, error } = await supabase
          .from('exam_config')
          .select('config_key, config_value')
          .in('config_key', keys);

        if (error) throw error;

        const result: Record<string, string> = {};
        keys.forEach(k => { result[k] = EDITABLE_DEFAULTS[k] || ''; });
        data?.forEach(item => { result[item.config_key] = item.config_value; });
        setConfigs(result);
      } catch {
        const result: Record<string, string> = {};
        keys.forEach(k => { result[k] = EDITABLE_DEFAULTS[k] || ''; });
        setConfigs(result);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  const get = (key: string) => configs[key] || EDITABLE_DEFAULTS[key] || '';

  return { configs, get, isLoading };
}
