import { useState, useRef } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Upload, Trash2, Loader2, Image, Palette } from 'lucide-react';
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

    const maxSize = configKey === 'branding_favicon_url' ? 1 : 5; // MB
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
              className={`${previewSize} object-contain rounded border bg-white`}
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs truncate text-muted-foreground">{currentUrl.split('/').pop()}</p>
              <Badge variant="outline" className="text-[10px] mt-1 text-green-600 border-green-300">Aktif</Badge>
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

        {/* Manual URL input */}
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

      <div className="border-t pt-4" />

      {renderUploadField(
        'branding_favicon_url',
        'Favicon',
        'Ikon kecil di tab browser. Format: PNG, ICO, SVG. Ukuran ideal: 32x32 atau 64x64 px. Maks 1MB.',
        'image/png,image/x-icon,image/svg+xml,image/vnd.microsoft.icon',
        'favicon',
        faviconInputRef,
        'w-10 h-10'
      )}

      {/* Site title */}
      <div className="border-t pt-4 space-y-1.5">
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
    </div>
  );
};

export default BrandingTab;
