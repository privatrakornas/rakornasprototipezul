import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Upload, FileJson, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ImportedQuestion {
  category: string;
  question_number: number;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  option_e: string;
  correct_answer: string | null;
  points_a: number | null;
  points_b: number | null;
  points_c: number | null;
  points_d: number | null;
  points_e: number | null;
  explanation: string | null;
}

interface ImportedPackageData {
  package: {
    name: string;
    description: string | null;
    twk_count: number;
    tiu_count: number;
    tkp_count: number;
    total_questions: number;
    exported_at: string;
  };
  questions: ImportedQuestion[];
}

interface PackageImportProps {
  logAuditAction: (action: string, targetId: string | null, targetName: string | null, details: string) => Promise<void>;
  onSuccess: () => void;
}

const PackageImport = ({ logAuditAction, onSuccess }: PackageImportProps) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importData, setImportData] = useState<ImportedPackageData | null>(null);
  const [customName, setCustomName] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setImportData(null);
    setCustomName('');
    setParseError(null);
    setIsImporting(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      setParseError('File harus berformat .json');
      setImportData(null);
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setParseError('Ukuran file maksimal 10MB');
      setImportData(null);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        
        // Validate structure
        if (!json.package || !json.questions || !Array.isArray(json.questions)) {
          setParseError('Format JSON tidak valid. Pastikan file berasal dari fitur Export Paket.');
          setImportData(null);
          return;
        }

        if (!json.package.name || json.questions.length === 0) {
          setParseError('File JSON tidak memiliki nama paket atau tidak mengandung soal.');
          setImportData(null);
          return;
        }

        // Validate each question has required fields
        const validCategories = ['TWK', 'TIU', 'TKP'];
        const invalidQuestions = json.questions.filter(
          (q: any) =>
            !q.category ||
            !validCategories.includes(q.category) ||
            !q.question_text ||
            !q.option_a ||
            !q.option_b ||
            !q.option_c ||
            !q.option_d ||
            !q.option_e
        );

        if (invalidQuestions.length > 0) {
          setParseError(`${invalidQuestions.length} soal memiliki data yang tidak lengkap atau kategori tidak valid.`);
          setImportData(null);
          return;
        }

        setImportData(json as ImportedPackageData);
        setCustomName(`${json.package.name} (Import)`);
        setParseError(null);
      } catch {
        setParseError('Gagal membaca file JSON. Pastikan format file benar.');
        setImportData(null);
      }
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!importData || !customName.trim()) {
      toast.error('Nama paket harus diisi');
      return;
    }

    setIsImporting(true);
    try {
      const twkCount = importData.questions.filter(q => q.category === 'TWK').length;
      const tiuCount = importData.questions.filter(q => q.category === 'TIU').length;
      const tkpCount = importData.questions.filter(q => q.category === 'TKP').length;

      // 1. Create new package
      const { data: newPkg, error: createError } = await supabase
        .from('exam_packages')
        .insert({
          name: customName.trim(),
          description: `Import dari backup: ${importData.package.name} (${importData.package.exported_at || 'unknown date'})`,
          twk_count: twkCount,
          tiu_count: tiuCount,
          tkp_count: tkpCount,
          total_questions: importData.questions.length,
        })
        .select()
        .single();

      if (createError) throw createError;

      // 2. Insert questions in batches of 50
      const batchSize = 50;
      for (let i = 0; i < importData.questions.length; i += batchSize) {
        const batch = importData.questions.slice(i, i + batchSize).map(q => ({
          package_id: newPkg.id,
          category: q.category,
          question_number: q.question_number,
          question_text: q.question_text,
          option_a: q.option_a,
          option_b: q.option_b,
          option_c: q.option_c,
          option_d: q.option_d,
          option_e: q.option_e,
          correct_answer: q.correct_answer,
          points_a: q.points_a,
          points_b: q.points_b,
          points_c: q.points_c,
          points_d: q.points_d,
          points_e: q.points_e,
          explanation: q.explanation,
        }));

        const { error: insertError } = await supabase
          .from('questions')
          .insert(batch);

        if (insertError) throw insertError;
      }

      await logAuditAction(
        'IMPORT_PACKAGE',
        newPkg.id,
        newPkg.name,
        `Import dari JSON backup: ${importData.questions.length} soal (TWK: ${twkCount}, TIU: ${tiuCount}, TKP: ${tkpCount})`
      );

      toast.success(`Paket "${customName}" berhasil diimport dengan ${importData.questions.length} soal`);
      setDialogOpen(false);
      resetState();
      onSuccess();
    } catch (err) {
      console.error('Error importing package:', err);
      toast.error('Gagal mengimport paket soal');
    } finally {
      setIsImporting(false);
    }
  };

  const getCategoryCounts = () => {
    if (!importData) return { twk: 0, tiu: 0, tkp: 0 };
    return {
      twk: importData.questions.filter(q => q.category === 'TWK').length,
      tiu: importData.questions.filter(q => q.category === 'TIU').length,
      tkp: importData.questions.filter(q => q.category === 'TKP').length,
    };
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          resetState();
          setDialogOpen(true);
        }}
      >
        <Upload className="w-4 h-4 mr-2" />
        Import JSON
      </Button>

      <Dialog open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open);
        if (!open) resetState();
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileJson className="w-5 h-5" />
              Import Paket dari JSON
            </DialogTitle>
            <DialogDescription>
              Upload file JSON yang dihasilkan dari fitur Export Paket untuk membuat paket baru
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* File Input */}
            <div className="space-y-2">
              <Label>File JSON Backup</Label>
              <Input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                className="cursor-pointer"
              />
            </div>

            {/* Parse Error */}
            {parseError && (
              <div className="flex items-start gap-2 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{parseError}</span>
              </div>
            )}

            {/* Preview */}
            {importData && (
              <div className="space-y-4">
                <div className="flex items-start gap-2 p-3 bg-primary/10 text-primary rounded-lg text-sm">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>File berhasil dibaca. Siap untuk diimport.</span>
                </div>

                {/* Package Info */}
                <div className="p-3 bg-muted rounded-lg space-y-2">
                  <p className="text-sm font-medium">Info Paket Asal:</p>
                  <p className="text-sm text-muted-foreground">{importData.package.name}</p>
                  {importData.package.exported_at && (
                    <p className="text-xs text-muted-foreground">
                      Diekspor: {new Date(importData.package.exported_at).toLocaleDateString('id-ID', { dateStyle: 'long' })}
                    </p>
                  )}
                  <div className="flex gap-2 mt-2">
                    <Badge variant="outline">TWK: {getCategoryCounts().twk}</Badge>
                    <Badge variant="outline">TIU: {getCategoryCounts().tiu}</Badge>
                    <Badge variant="outline">TKP: {getCategoryCounts().tkp}</Badge>
                    <Badge>Total: {importData.questions.length}</Badge>
                  </div>
                </div>

                {/* Preview Questions */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Preview Soal (3 pertama):</Label>
                  <ScrollArea className="h-[120px] border rounded-lg p-3">
                    {importData.questions.slice(0, 3).map((q, i) => (
                      <div key={i} className="text-xs text-muted-foreground mb-2 pb-2 border-b last:border-b-0">
                        <span className="font-medium">{q.category} #{q.question_number}:</span>{' '}
                        <span className="line-clamp-2">{q.question_text}</span>
                      </div>
                    ))}
                    {importData.questions.length > 3 && (
                      <p className="text-xs text-muted-foreground italic">
                        ... dan {importData.questions.length - 3} soal lainnya
                      </p>
                    )}
                  </ScrollArea>
                </div>

                {/* Custom Name */}
                <div className="space-y-2">
                  <Label htmlFor="importName">Nama Paket Baru *</Label>
                  <Input
                    id="importName"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="Nama untuk paket yang diimport"
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Batal
            </Button>
            <Button
              onClick={handleImport}
              disabled={!importData || !customName.trim() || isImporting}
            >
              {isImporting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Mengimport...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Import Paket
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PackageImport;
