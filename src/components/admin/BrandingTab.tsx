import { useState, useRef } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Upload, Trash2, Loader2, Palette, Eye, Globe, Sun, Moon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface BrandingTabProps {
  drafts: Record<string, string>;
  onDraftChange: (key: string, value: string) => void;
}

const BrandingTab = ({ drafts, onDraftChange }: BrandingTabProps) => {
  const [isUploading, setIsUploading] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);

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

      const { error: uploadError } = await supabase.storage
        .from('branding')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('branding')
        .getPublicUrl(fileName);

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

  const renderUploadField = (
    configKey: string,
    label: string,
    description: string,
    accept: string,
    folder: string,
    inputRef: React.RefObject<HTMLInputElement>,
    previewSize: string
  ) => {
    const currentUrl = drafts[configKey] || '';
    const uploading = isUploading === configKey;

    return (
      <div className="space-y-2">
        <Label className="text-xs font-medium">{label}</Label>
        <p className="text-[10px] text-muted-foreground">{description}</p>

        {currentUrl ? (
          <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/20">
            <img
              src={currentUrl}
              alt={label}
              className={`${previewSize} object-contain rounded border bg-background`}
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs truncate text-muted-foreground">{currentUrl.split('/').pop()}</p>
              <Badge variant="outline" className="text-[10px] mt-1 text-emerald-600 border-emerald-300">Aktif</Badge>
            </div>
            <div className="flex gap-1.5">
              <Button
                variant="outline"
                size="sm"
                className="h-7 gap-1 text-[10px]"
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
              >
                <Upload className="w-3 h-3" />
                Ganti
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-[10px] text-destructive"
                onClick={() => handleRemove(configKey)}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </div>
        ) : (
          <div
            className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
            onClick={() => !uploading && inputRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            ) : (
              <Upload className="w-6 h-6 text-muted-foreground" />
            )}
            <p className="text-xs text-muted-foreground">
              {uploading ? 'Mengupload...' : 'Klik untuk upload'}
            </p>
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleUpload(file, configKey, folder);
            e.target.value = '';
          }}
        />

        <div className="space-y-1">
          <Label className="text-[10px] text-muted-foreground">Atau masukkan URL langsung:</Label>
          <Input
            value={currentUrl}
            onChange={(e) => onDraftChange(configKey, e.target.value)}
            placeholder="https://..."
            className="h-8 text-xs"
          />
        </div>
      </div>
    );
  };

  const logoUrl = drafts['branding_logo_url'] || '';
  const faviconUrl = drafts['branding_favicon_url'] || '';
  const siteTitle = drafts['branding_site_title'] || 'RAKORNAS - Simulasi CAT SKD';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-3">
        <Palette className="w-4 h-4 text-primary" />
        <h4 className="font-semibold text-sm">Branding & Logo</h4>
      </div>

      {renderUploadField(
        'branding_logo_url',
        'Logo Utama',
        'Logo yang ditampilkan di header halaman login dan hasil. Format: PNG, JPG, SVG. Maks 5MB.',
        'image/png,image/jpeg,image/svg+xml,image/webp',
        'logo',
        logoInputRef,
        'w-16 h-16'
      )}

      <Separator />

      {renderUploadField(
        'branding_favicon_url',
        'Favicon',
        'Ikon kecil di tab browser. Format: PNG, ICO, SVG. Ukuran ideal: 32x32 atau 64x64 px. Maks 1MB.',
        'image/png,image/x-icon,image/svg+xml,image/vnd.microsoft.icon',
        'favicon',
        faviconInputRef,
        'w-10 h-10'
      )}

      <Separator />

      {/* Site title */}
      <div className="space-y-1.5">
        <Label htmlFor="branding_site_title" className="text-xs font-medium">Judul Tab Browser</Label>
        <Input
          id="branding_site_title"
          value={drafts['branding_site_title'] || ''}
          onChange={(e) => onDraftChange('branding_site_title', e.target.value)}
          placeholder="RAKORNAS - Simulasi CAT SKD"
          className="h-9 text-sm"
        />
        <p className="text-[10px] text-muted-foreground">Teks yang muncul di judul tab browser</p>
      </div>

      <Separator />

      {/* Theme Mode */}
      <div className="space-y-2">
        <Label className="text-xs font-medium">Mode Tema</Label>
        <p className="text-[10px] text-muted-foreground">Pilih tampilan light atau dark untuk seluruh aplikasi</p>
        <div className="flex gap-2">
          <Button
            variant={drafts['branding_theme_mode'] !== 'dark' ? 'default' : 'outline'}
            size="sm"
            className="flex-1 gap-2"
            onClick={() => onDraftChange('branding_theme_mode', 'light')}
          >
            <Sun className="w-4 h-4" />
            Light
          </Button>
          <Button
            variant={drafts['branding_theme_mode'] === 'dark' ? 'default' : 'outline'}
            size="sm"
            className="flex-1 gap-2"
            onClick={() => onDraftChange('branding_theme_mode', 'dark')}
          >
            <Moon className="w-4 h-4" />
            Dark
          </Button>
        </div>
      </div>

      <Separator />
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
                {faviconUrl ? (
                  <img src={faviconUrl} alt="Favicon" className="w-3.5 h-3.5 object-contain flex-shrink-0" />
                ) : (
                  <Globe className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                )}
                <span className="truncate text-foreground">{siteTitle}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Login Header Preview */}
        <div className="space-y-1.5">
          <Label className="text-[10px] text-muted-foreground">Preview Header Login</Label>
          <div className="rounded-lg overflow-hidden" style={{ background: 'linear-gradient(135deg, #800000 0%, #4a0000 100%)' }}>
            <div className="flex flex-col items-center py-5 px-4">
              {logoUrl ? (
                <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-amber-400/40 mb-2 bg-background/10">
                  <img src={logoUrl} alt="Logo Preview" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-full border-2 border-dashed border-white/30 mb-2 flex items-center justify-center">
                  <span className="text-[10px] text-white/50">Logo</span>
                </div>
              )}
              <span className="text-white font-bold text-sm tracking-wider">
                {drafts['login_title'] || 'RAKORNAS'}
              </span>
              <span className="text-white/70 text-[10px]">
                {drafts['login_subtitle'] || 'By Zulkarnain Sinaga'}
              </span>
            </div>
          </div>
        </div>

        {/* Results Header Preview */}
        <div className="space-y-1.5">
          <Label className="text-[10px] text-muted-foreground">Preview Header Hasil</Label>
          <div className="rounded-lg overflow-hidden" style={{ background: 'linear-gradient(135deg, #800000 0%, #4a0000 100%)' }}>
            <div className="flex flex-col items-center py-3 px-4">
              {logoUrl && (
                <img src={logoUrl} alt="Logo Preview" className="w-8 h-8 object-contain mb-1.5 rounded" />
              )}
              <span className="text-white font-bold text-xs">
                {drafts['results_title'] || 'HASIL UJIAN'}
              </span>
              <span className="text-white/70 text-[10px]">
                {drafts['results_subtitle'] || 'Simulasi CAT SKD - RAKORNAS'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BrandingTab;
