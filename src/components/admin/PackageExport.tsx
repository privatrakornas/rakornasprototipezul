import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Download, FileJson, FileSpreadsheet, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

interface ExamPackage {
  id: string;
  name: string;
  description: string | null;
  is_default: boolean;
  is_active: boolean;
  twk_count: number;
  tiu_count: number;
  tkp_count: number;
  total_questions: number;
  created_at: string;
  updated_at: string;
}

interface PackageExportProps {
  package_: ExamPackage;
  logAuditAction: (action: string, targetId: string | null, targetName: string | null, details: string) => Promise<void>;
}

const PackageExport = ({ package_, logAuditAction }: PackageExportProps) => {
  const [isExporting, setIsExporting] = useState(false);

  const fetchQuestions = async () => {
    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .eq('package_id', package_.id)
      .order('category')
      .order('question_number');

    if (error) throw error;
    return data || [];
  };

  const exportToJSON = async () => {
    setIsExporting(true);
    try {
      const questions = await fetchQuestions();
      
      const exportData = {
        package: {
          id: package_.id,
          name: package_.name,
          description: package_.description,
          twk_count: package_.twk_count,
          tiu_count: package_.tiu_count,
          tkp_count: package_.tkp_count,
          total_questions: package_.total_questions,
          exported_at: new Date().toISOString(),
        },
        questions: questions.map(q => ({
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
        })),
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `paket-soal-${package_.name.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      await logAuditAction(
        'EXPORT_PACKAGE',
        package_.id,
        package_.name,
        `Export JSON: ${questions.length} soal`
      );

      toast.success(`Paket "${package_.name}" berhasil diexport ke JSON`);
    } catch (err) {
      console.error('Error exporting to JSON:', err);
      toast.error('Gagal export ke JSON');
    } finally {
      setIsExporting(false);
    }
  };

  const exportToExcel = async () => {
    setIsExporting(true);
    try {
      const questions = await fetchQuestions();

      // Create workbook
      const wb = XLSX.utils.book_new();

      // Package info sheet
      const infoSheet = XLSX.utils.json_to_sheet([{
        'Nama Paket': package_.name,
        'Deskripsi': package_.description || '-',
        'Jumlah TWK': package_.twk_count,
        'Jumlah TIU': package_.tiu_count,
        'Jumlah TKP': package_.tkp_count,
        'Total Soal': package_.total_questions,
        'Tanggal Export': new Date().toLocaleDateString('id-ID', { dateStyle: 'full' }),
      }]);
      XLSX.utils.book_append_sheet(wb, infoSheet, 'Info Paket');

      // Group questions by category
      const categories = ['TWK', 'TIU', 'TKP'];
      
      for (const cat of categories) {
        const catQuestions = questions.filter(q => q.category === cat);
        if (catQuestions.length === 0) continue;

        const sheetData = catQuestions.map(q => ({
          'No': q.question_number,
          'Pertanyaan': q.question_text,
          'Opsi A': q.option_a,
          'Opsi B': q.option_b,
          'Opsi C': q.option_c,
          'Opsi D': q.option_d,
          'Opsi E': q.option_e,
          ...(cat === 'TKP' ? {
            'Skor A': q.points_a,
            'Skor B': q.points_b,
            'Skor C': q.points_c,
            'Skor D': q.points_d,
            'Skor E': q.points_e,
          } : {
            'Kunci Jawaban': q.correct_answer,
          }),
          'Pembahasan': q.explanation || '-',
        }));

        const sheet = XLSX.utils.json_to_sheet(sheetData);
        
        // Set column widths
        sheet['!cols'] = [
          { wch: 5 },   // No
          { wch: 80 },  // Pertanyaan
          { wch: 40 },  // Opsi A-E
          { wch: 40 },
          { wch: 40 },
          { wch: 40 },
          { wch: 40 },
          { wch: 12 },  // Kunci/Skor
          ...(cat === 'TKP' ? [{ wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 }] : []),
          { wch: 60 },  // Pembahasan
        ];

        XLSX.utils.book_append_sheet(wb, sheet, cat);
      }

      // All questions sheet
      const allQuestionsData = questions.map(q => ({
        'Kategori': q.category,
        'No': q.question_number,
        'Pertanyaan': q.question_text,
        'Opsi A': q.option_a,
        'Opsi B': q.option_b,
        'Opsi C': q.option_c,
        'Opsi D': q.option_d,
        'Opsi E': q.option_e,
        'Kunci Jawaban': q.correct_answer || '-',
        'Skor A': q.points_a,
        'Skor B': q.points_b,
        'Skor C': q.points_c,
        'Skor D': q.points_d,
        'Skor E': q.points_e,
        'Pembahasan': q.explanation || '-',
      }));
      const allSheet = XLSX.utils.json_to_sheet(allQuestionsData);
      allSheet['!cols'] = [
        { wch: 8 },   // Kategori
        { wch: 5 },   // No
        { wch: 80 },  // Pertanyaan
        { wch: 40 },  // Opsi A-E
        { wch: 40 },
        { wch: 40 },
        { wch: 40 },
        { wch: 40 },
        { wch: 12 },  // Kunci
        { wch: 8 },   // Skor A-E
        { wch: 8 },
        { wch: 8 },
        { wch: 8 },
        { wch: 8 },
        { wch: 60 },  // Pembahasan
      ];
      XLSX.utils.book_append_sheet(wb, allSheet, 'Semua Soal');

      // Download
      XLSX.writeFile(wb, `paket-soal-${package_.name.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.xlsx`);

      await logAuditAction(
        'EXPORT_PACKAGE',
        package_.id,
        package_.name,
        `Export Excel: ${questions.length} soal`
      );

      toast.success(`Paket "${package_.name}" berhasil diexport ke Excel`);
    } catch (err) {
      console.error('Error exporting to Excel:', err);
      toast.error('Gagal export ke Excel');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" disabled={isExporting} title="Export Paket">
          {isExporting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportToJSON}>
          <FileJson className="w-4 h-4 mr-2" />
          Export JSON
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToExcel}>
          <FileSpreadsheet className="w-4 h-4 mr-2" />
          Export Excel
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default PackageExport;
