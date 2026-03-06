import { useState, useRef } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, Trash2, Loader2, Palette, Eye, Globe, Sun, Moon, Trophy, BookOpen, RotateCcw, Type, Download, FileUp, Link } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { GOOGLE_FONTS } from '@/hooks/useDynamicTheme';
import { EDITABLE_DEFAULTS } from '@/hooks/useEditableConfig';

interface BrandingTabProps {
  drafts: Record<string, string>;
  onDraftChange: (key: string, value: string) => void;
}

const BRANDING_KEYS = Object.keys(EDITABLE_DEFAULTS).filter(k => k.startsWith('branding_'));

const BrandingTab = ({ drafts, onDraftChange }: BrandingTabProps) => {
  const [isUploading, setIsUploading] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File, configKey: string, folder: string) => {
    if (!file) return;
    const maxSize = configKey === 'branding_favicon_url' ? 1 : 5;
    if (file.size > maxSize * 1024 * 1024) {
      toast.error(`Ukuran file maksimal ${maxSize}MB`);
      return;
    }
    setIsUploading(configKey);
    try {
      const ext = file.name.split('.').pop() || 'png';
      const fileName = `${folder}/branding-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('branding').upload(fileName, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('branding').getPublicUrl(fileName);
      onDraftChange(configKey, urlData.publicUrl);
      toast.success('File berhasil diupload');
    } catch (err) {
      console.error('Upload error:', err);
      toast.error('Gagal mengupload file');
    } finally {
      setIsUploading(null);
    }
  };

  const handleRemove = (configKey: string) => {
    onDraftChange(configKey, '');
  };

  // Export branding config as JSON
  const handleExport = () => {
    const brandingData: Record<string, string> = {};
    BRANDING_KEYS.forEach(key => {
      brandingData[key] = drafts[key] || EDITABLE_DEFAULTS[key] || '';
    });
    const blob = new Blob([JSON.stringify(brandingData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `branding-config-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Konfigurasi branding berhasil diekspor');
  };

  // Import branding config from JSON
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (typeof data !== 'object' || data === null) throw new Error('Invalid format');
        let count = 0;
        Object.entries(data).forEach(([key, value]) => {
          if (BRANDING_KEYS.includes(key) && typeof value === 'string') {
            onDraftChange(key, value);
            count++;
          }
        });
        toast.success(`${count} pengaturan branding diimpor (belum disimpan)`);
      } catch {
        toast.error('File JSON tidak valid');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const renderUploadField = (
    configKey: string, label: string, description: string, accept: string,
    folder: string, inputRef: React.RefObject<HTMLInputElement>, previewSize: string
  ) => {
    const currentUrl = drafts[configKey] || '';
    const uploading = isUploading === configKey;
    return (
      <div className="space-y-2">
        <Label className="text-xs font-medium">{label}</Label>
        <p className="text-[10px] text-muted-foreground">{description}</p>
        {currentUrl ? (
          <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/20">
            <img src={currentUrl} alt={label} className={`${previewSize} object-contain rounded border bg-background`} />
            <div className="flex-1 min-w-0">
              <p className="text-xs truncate text-muted-foreground">{currentUrl.split('/').pop()}</p>
              <Badge variant="outline" className="text-[10px] mt-1 text-emerald-600 border-emerald-300">Aktif</Badge>
            </div>
            <div className="flex gap-1.5">
              <Button variant="outline" size="sm" className="h-7 gap-1 text-[10px]" onClick={() => inputRef.current?.click()} disabled={uploading}>
                <Upload className="w-3 h-3" /> Ganti
              </Button>
              <Button variant="outline" size="sm" className="h-7 text-[10px] text-destructive" onClick={() => handleRemove(configKey)}>
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors" onClick={() => !uploading && inputRef.current?.click()}>
            {uploading ? <Loader2 className="w-6 h-6 animate-spin text-primary" /> : <Upload className="w-6 h-6 text-muted-foreground" />}
            <p className="text-xs text-muted-foreground">{uploading ? 'Mengupload...' : 'Klik untuk upload'}</p>
          </div>
        )}
        <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleUpload(file, configKey, folder); e.target.value = ''; }} />
        <div className="space-y-1">
          <Label className="text-[10px] text-muted-foreground">Atau masukkan URL langsung:</Label>
          <Input value={currentUrl} onChange={(e) => onDraftChange(configKey, e.target.value)} placeholder="https://..." className="h-8 text-xs" />
        </div>
      </div>
    );
  };

  const logoUrl = drafts['branding_logo_url'] || '';
  const faviconUrl = drafts['branding_favicon_url'] || '';
  const siteTitle = drafts['branding_site_title'] || 'RAKORNAS - Simulasi CAT SKD';
  const primaryColor = drafts['branding_primary_color'] || '#5C0A0F';
  const accentColor = drafts['branding_accent_color'] || '#D4AF37';

  const headingFontUrl = drafts['branding_font_heading_url'] || '';
  const bodyFontUrl = drafts['branding_font_body_url'] || '';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Palette className="w-4 h-4 text-primary" />
          <h4 className="font-semibold text-sm">Branding & Logo</h4>
        </div>
        {/* Export / Import */}
        <div className="flex gap-1.5">
          <Button variant="outline" size="sm" className="h-7 gap-1 text-[10px]" onClick={handleExport}>
            <Download className="w-3 h-3" /> Export JSON
          </Button>
          <Button variant="outline" size="sm" className="h-7 gap-1 text-[10px]" onClick={() => importInputRef.current?.click()}>
            <FileUp className="w-3 h-3" /> Import JSON
          </Button>
          <input ref={importInputRef} type="file" accept=".json,application/json" className="hidden" onChange={handleImport} />
        </div>
      </div>

      {renderUploadField('branding_logo_url', 'Logo Utama', 'Logo yang ditampilkan di header halaman login dan hasil. Format: PNG, JPG, SVG. Maks 5MB.', 'image/png,image/jpeg,image/svg+xml,image/webp', 'logo', logoInputRef, 'w-16 h-16')}
      <Separator />
      {renderUploadField('branding_favicon_url', 'Favicon', 'Ikon kecil di tab browser. Format: PNG, ICO, SVG. Ukuran ideal: 32x32 atau 64x64 px. Maks 1MB.', 'image/png,image/x-icon,image/svg+xml,image/vnd.microsoft.icon', 'favicon', faviconInputRef, 'w-10 h-10')}
      <Separator />

      {/* Site title */}
      <div className="space-y-1.5">
        <Label htmlFor="branding_site_title" className="text-xs font-medium">Judul Tab Browser</Label>
        <Input id="branding_site_title" value={drafts['branding_site_title'] || ''} onChange={(e) => onDraftChange('branding_site_title', e.target.value)} placeholder="RAKORNAS - Simulasi CAT SKD" className="h-9 text-sm" />
        <p className="text-[10px] text-muted-foreground">Teks yang muncul di judul tab browser</p>
      </div>

      <Separator />

      {/* Theme Mode */}
      <div className="space-y-2">
        <Label className="text-xs font-medium">Mode Tema</Label>
        <p className="text-[10px] text-muted-foreground">Pilih tampilan light atau dark untuk seluruh aplikasi</p>
        <div className="flex gap-2">
          <Button variant={drafts['branding_theme_mode'] !== 'dark' ? 'default' : 'outline'} size="sm" className="flex-1 gap-2" onClick={() => onDraftChange('branding_theme_mode', 'light')}>
            <Sun className="w-4 h-4" /> Light
          </Button>
          <Button variant={drafts['branding_theme_mode'] === 'dark' ? 'default' : 'outline'} size="sm" className="flex-1 gap-2" onClick={() => onDraftChange('branding_theme_mode', 'dark')}>
            <Moon className="w-4 h-4" /> Dark
          </Button>
        </div>
      </div>

      <Separator />

      {/* Custom Colors */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-primary" />
            <h4 className="font-semibold text-sm">Warna Kustom</h4>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1 text-[10px]"
            onClick={() => {
              onDraftChange('branding_primary_color', '#5C0A0F');
              onDraftChange('branding_accent_color', '#D4AF37');
              toast.info('Warna direset ke default (belum disimpan)');
            }}
          >
            <RotateCcw className="w-3 h-3" />
            Reset Warna Default
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Warna Primer</Label>
            <p className="text-[10px] text-muted-foreground">Warna utama (header, tombol)</p>
            <div className="flex items-center gap-2">
              <input type="color" value={primaryColor} onChange={(e) => onDraftChange('branding_primary_color', e.target.value)} className="w-10 h-9 rounded border cursor-pointer" />
              <Input value={primaryColor} onChange={(e) => onDraftChange('branding_primary_color', e.target.value)} placeholder="#5C0A0F" className="h-9 text-xs font-mono flex-1" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Warna Aksen</Label>
            <p className="text-[10px] text-muted-foreground">Warna sekunder (badge, ikon)</p>
            <div className="flex items-center gap-2">
              <input type="color" value={accentColor} onChange={(e) => onDraftChange('branding_accent_color', e.target.value)} className="w-10 h-9 rounded border cursor-pointer" />
              <Input value={accentColor} onChange={(e) => onDraftChange('branding_accent_color', e.target.value)} placeholder="#D4AF37" className="h-9 text-xs font-mono flex-1" />
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="flex-1 h-8 rounded" style={{ background: primaryColor }} />
          <div className="flex-1 h-8 rounded" style={{ background: accentColor }} />
        </div>
      </div>

      <Separator />

      {/* Custom Fonts */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Type className="w-4 h-4 text-primary" />
          <h4 className="font-semibold text-sm">Font Kustom</h4>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {/* Heading Font */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Font Heading</Label>
            <p className="text-[10px] text-muted-foreground">Untuk judul (H1-H6)</p>
            <Select value={drafts['branding_font_heading'] || 'Inter'} onValueChange={(v) => { onDraftChange('branding_font_heading', v); onDraftChange('branding_font_heading_url', ''); }}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GOOGLE_FONTS.map(f => (
                  <SelectItem key={f} value={f} className="text-xs">{f}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Link className="w-3 h-3" /> Atau URL Google Fonts:
              </Label>
              <Input
                value={headingFontUrl}
                onChange={(e) => onDraftChange('branding_font_heading_url', e.target.value)}
                placeholder="https://fonts.googleapis.com/css2?family=..."
                className="h-8 text-xs font-mono"
              />
              {headingFontUrl && (
                <p className="text-[10px] text-emerald-600">✓ URL kustom aktif (override dropdown)</p>
              )}
            </div>
          </div>
          {/* Body Font */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Font Body</Label>
            <p className="text-[10px] text-muted-foreground">Untuk teks konten</p>
            <Select value={drafts['branding_font_body'] || 'Inter'} onValueChange={(v) => { onDraftChange('branding_font_body', v); onDraftChange('branding_font_body_url', ''); }}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GOOGLE_FONTS.map(f => (
                  <SelectItem key={f} value={f} className="text-xs">{f}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Link className="w-3 h-3" /> Atau URL Google Fonts:
              </Label>
              <Input
                value={bodyFontUrl}
                onChange={(e) => onDraftChange('branding_font_body_url', e.target.value)}
                placeholder="https://fonts.googleapis.com/css2?family=..."
                className="h-8 text-xs font-mono"
              />
              {bodyFontUrl && (
                <p className="text-[10px] text-emerald-600">✓ URL kustom aktif (override dropdown)</p>
              )}
            </div>
          </div>
        </div>
        {/* Font Preview */}
        <div className="border rounded-lg p-4 bg-muted/20 space-y-2">
          <p className="text-[10px] text-muted-foreground mb-2">Preview Font</p>
          <p className="text-lg font-bold" style={{ fontFamily: `"${drafts['branding_font_heading'] || 'Inter'}", sans-serif` }}>
            Heading: {drafts['branding_font_heading'] || 'Inter'}
          </p>
          <p className="text-sm" style={{ fontFamily: `"${drafts['branding_font_body'] || 'Inter'}", sans-serif` }}>
            Body: Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt.
          </p>
        </div>
      </div>

      <Separator />

      {/* Live Preview Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-primary" />
          <h4 className="font-semibold text-sm">Live Preview</h4>
        </div>

        {/* Browser Tab Preview */}
        <div className="space-y-1.5">
          <Label className="text-[10px] text-muted-foreground">Preview Tab Browser</Label>
          <div className="border rounded-lg overflow-hidden bg-muted/30">
            <div className="flex items-center gap-1.5 px-3 py-2 bg-muted/60 border-b">
              <div className="flex gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-destructive/60" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400/60" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/60" />
              </div>
              <div className="flex items-center gap-1.5 ml-2 px-2 py-1 bg-background rounded text-[10px] max-w-[250px]">
                {faviconUrl ? <img src={faviconUrl} alt="Favicon" className="w-3.5 h-3.5 object-contain flex-shrink-0" /> : <Globe className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />}
                <span className="truncate text-foreground">{siteTitle}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Login Header Preview */}
        <div className="space-y-1.5">
          <Label className="text-[10px] text-muted-foreground">Preview Header Login</Label>
          <div className="rounded-lg overflow-hidden" style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}99 100%)` }}>
            <div className="flex flex-col items-center py-5 px-4">
              {logoUrl ? (
                <div className="w-16 h-16 rounded-full overflow-hidden border-2 mb-2 bg-white/10" style={{ borderColor: `${accentColor}66` }}>
                  <img src={logoUrl} alt="Logo Preview" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-full border-2 border-dashed border-white/30 mb-2 flex items-center justify-center">
                  <span className="text-[10px] text-white/50">Logo</span>
                </div>
              )}
              <span className="text-white font-bold text-sm tracking-wider">{drafts['login_title'] || 'RAKORNAS'}</span>
              <span className="text-white/70 text-[10px]">{drafts['login_subtitle'] || 'By Zulkarnain Sinaga'}</span>
            </div>
          </div>
        </div>

        {/* Results Header Preview */}
        <div className="space-y-1.5">
          <Label className="text-[10px] text-muted-foreground">Preview Header Hasil</Label>
          <div className="rounded-lg overflow-hidden" style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}99 100%)` }}>
            <div className="flex flex-col items-center py-3 px-4">
              {logoUrl && <img src={logoUrl} alt="Logo Preview" className="w-8 h-8 object-contain mb-1.5 rounded" />}
              <span className="text-white font-bold text-xs">{drafts['results_title'] || 'HASIL UJIAN'}</span>
              <span className="text-white/70 text-[10px]">{drafts['results_subtitle'] || 'Simulasi CAT SKD - RAKORNAS'}</span>
            </div>
          </div>
        </div>

        {/* Leaderboard Header Preview */}
        <div className="space-y-1.5">
          <Label className="text-[10px] text-muted-foreground">Preview Header Leaderboard</Label>
          <div className="rounded-lg overflow-hidden" style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}99 100%)` }}>
            <div className="flex flex-col items-center py-3 px-4">
              {logoUrl && <img src={logoUrl} alt="Logo Preview" className="w-8 h-8 object-contain mb-1.5 rounded" />}
              <div className="flex items-center gap-1.5">
                <Trophy className="w-4 h-4" style={{ color: accentColor }} />
                <span className="text-white font-bold text-xs">LEADERBOARD</span>
              </div>
              <span className="text-white/70 text-[10px]">Simulasi CAT SKD - RAKORNAS</span>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-white font-extrabold text-sm tracking-wider">{drafts['leaderboard_title'] || 'RAKORNAS'}</span>
              </div>
              <span className="text-white/60 text-[10px]">{drafts['leaderboard_subtitle'] || 'Rangking Topskor Nasional'}</span>
            </div>
          </div>
        </div>

        {/* Rules Header Preview */}
        <div className="space-y-1.5">
          <Label className="text-[10px] text-muted-foreground">Preview Header Petunjuk</Label>
          <div className="rounded-lg overflow-hidden" style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}99 100%)` }}>
            <div className="flex flex-col items-center py-3 px-4">
              {logoUrl && <img src={logoUrl} alt="Logo Preview" className="w-8 h-8 object-contain mb-1.5 rounded" />}
              <div className="flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-white/80" />
                <span className="text-white font-bold text-xs">{drafts['rules_title'] || 'PETUNJUK PENGERJAAN'}</span>
              </div>
              <span className="text-white/70 text-[10px]">{drafts['rules_subtitle'] || 'Simulasi CAT SKD - RAKORNAS'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrandingTab;
