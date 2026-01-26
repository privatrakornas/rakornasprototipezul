import { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileDown, Loader2 } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { questions } from '@/data/questions';
import { MirrorSession } from '@/hooks/useExamMirror';

interface ReviewPDFExportProps {
  session: MirrorSession | null;
  answers: Record<number, string>;
}

const PASSING_GRADES = { TWK: 65, TIU: 80, TKP: 166 };

// Helper to calculate stats
const calculateStats = (answers: Record<number, string>) => {
  const twkQuestions = questions.filter(q => q.category === 'TWK');
  const tiuQuestions = questions.filter(q => q.category === 'TIU');
  const tkpQuestions = questions.filter(q => q.category === 'TKP');
  
  const calcCategory = (list: typeof questions, isTKP: boolean) => {
    let correct = 0, wrong = 0, score = 0;
    list.forEach(q => {
      const ans = answers[q.id];
      if (!ans) return;
      if (isTKP) {
        const opt = q.options.find(o => o.key === ans);
        score += opt?.score || 0;
        if (opt?.score === 5) correct++; else wrong++;
      } else {
        if (q.correctAnswer === ans) { correct++; score += 5; }
        else wrong++;
      }
    });
    return { correct, wrong, unanswered: list.length - correct - wrong, score, total: list.length };
  };
  
  const twk = calcCategory(twkQuestions, false);
  const tiu = calcCategory(tiuQuestions, false);
  const tkp = calcCategory(tkpQuestions, true);
  
  return {
    twk: { ...twk, maxScore: twk.total * 5, passing: PASSING_GRADES.TWK },
    tiu: { ...tiu, maxScore: tiu.total * 5, passing: PASSING_GRADES.TIU },
    tkp: { ...tkp, maxScore: tkp.total * 5, passing: PASSING_GRADES.TKP },
    total: {
      correct: twk.correct + tiu.correct + tkp.correct,
      wrong: twk.wrong + tiu.wrong + tkp.wrong,
      unanswered: twk.unanswered + tiu.unanswered + tkp.unanswered,
      score: twk.score + tiu.score + tkp.score,
    },
    isLulus: twk.score >= PASSING_GRADES.TWK && tiu.score >= PASSING_GRADES.TIU && tkp.score >= PASSING_GRADES.TKP,
  };
};

const ReviewPDFExport = ({ session, answers }: ReviewPDFExportProps) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePDF = useCallback(async () => {
    if (!session) return;
    
    setIsGenerating(true);
    
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 15;
      let y = 20;
      
      // Header
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('LAPORAN HASIL UJIAN', pageWidth / 2, y, { align: 'center' });
      y += 8;
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Simulasi CAT CPNS - Rakornas 2025', pageWidth / 2, y, { align: 'center' });
      y += 12;
      
      // Divider line
      doc.setDrawColor(100, 100, 100);
      doc.line(margin, y, pageWidth - margin, y);
      y += 8;
      
      // Participant Info
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Data Peserta', margin, y);
      y += 6;
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const infoLines = [
        ['Nama', session.name],
        ['Status', session.status === 'finished' ? 'Selesai' : session.status],
        ['Durasi', session.duration_minutes ? `${session.duration_minutes} menit` : '-'],
        ['Waktu Selesai', session.finished_at ? format(new Date(session.finished_at), 'dd MMMM yyyy HH:mm', { locale: localeId }) : '-'],
      ];
      
      infoLines.forEach(([label, value]) => {
        doc.text(`${label}:`, margin, y);
        doc.text(value, margin + 35, y);
        y += 5;
      });
      y += 5;
      
      // Stats
      const stats = calculateStats(answers);
      
      // Score Summary Table
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Ringkasan Nilai', margin, y);
      y += 6;
      
      // Table Header
      const colWidths = [40, 25, 25, 30, 30, 30];
      const cols = ['Kategori', 'Benar', 'Salah', 'Kosong', 'Skor', 'Status'];
      
      doc.setFillColor(59, 130, 246); // Blue
      doc.rect(margin, y - 4, pageWidth - margin * 2, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      
      let x = margin + 2;
      cols.forEach((col, i) => {
        doc.text(col, x, y);
        x += colWidths[i];
      });
      y += 6;
      
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      
      // Table Rows
      const rows = [
        { cat: 'TWK - Wawasan Kebangsaan', ...stats.twk, pass: stats.twk.score >= stats.twk.passing },
        { cat: 'TIU - Intelegensi Umum', ...stats.tiu, pass: stats.tiu.score >= stats.tiu.passing },
        { cat: 'TKP - Karakteristik Pribadi', ...stats.tkp, pass: stats.tkp.score >= stats.tkp.passing },
      ];
      
      rows.forEach((row, idx) => {
        if (idx % 2 === 0) {
          doc.setFillColor(245, 245, 245);
          doc.rect(margin, y - 4, pageWidth - margin * 2, 7, 'F');
        }
        
        x = margin + 2;
        doc.text(row.cat, x, y);
        x += colWidths[0];
        doc.text(String(row.correct), x, y);
        x += colWidths[1];
        doc.text(String(row.wrong), x, y);
        x += colWidths[2];
        doc.text(String(row.unanswered), x, y);
        x += colWidths[3];
        doc.text(`${row.score}/${row.maxScore}`, x, y);
        x += colWidths[4];
        
        if (row.pass) {
          doc.setTextColor(22, 163, 74); // Green
        } else {
          doc.setTextColor(220, 38, 38); // Red
        }
        doc.text(row.pass ? 'LULUS' : 'TIDAK LULUS', x, y);
        doc.setTextColor(0, 0, 0);
        
        y += 7;
      });
      
      // Total row
      doc.setFillColor(229, 231, 235);
      doc.rect(margin, y - 4, pageWidth - margin * 2, 8, 'F');
      doc.setFont('helvetica', 'bold');
      
      x = margin + 2;
      doc.text('TOTAL', x, y);
      x += colWidths[0];
      doc.text(String(stats.total.correct), x, y);
      x += colWidths[1];
      doc.text(String(stats.total.wrong), x, y);
      x += colWidths[2];
      doc.text(String(stats.total.unanswered), x, y);
      x += colWidths[3];
      doc.text(String(stats.total.score), x, y);
      x += colWidths[4];
      
      if (stats.isLulus) {
        doc.setTextColor(22, 163, 74);
        doc.text('LULUS', x, y);
      } else {
        doc.setTextColor(220, 38, 38);
        doc.text('TIDAK LULUS', x, y);
      }
      doc.setTextColor(0, 0, 0);
      y += 12;
      
      // Passing Grade Info
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text('Passing Grade: TWK ≥ 65, TIU ≥ 80, TKP ≥ 166 (Semua kategori harus lulus)', margin, y);
      y += 10;
      
      // Answer Summary Section (Optional - compact)
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Ringkasan Jawaban', margin, y);
      y += 6;
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      
      // Grid of answers (compact)
      const answeredQuestions = Object.keys(answers).length;
      doc.text(`Total Dijawab: ${answeredQuestions}/110 soal`, margin, y);
      y += 8;
      
      // Create a grid showing question numbers and answers
      const gridCols = 11;
      const cellWidth = (pageWidth - margin * 2) / gridCols;
      const cellHeight = 6;
      
      questions.forEach((q, idx) => {
        const col = idx % gridCols;
        const row = Math.floor(idx / gridCols);
        const cellX = margin + col * cellWidth;
        const cellY = y + row * cellHeight;
        
        // Check if we need a new page
        if (cellY > 270) {
          doc.addPage();
          y = 20;
          return;
        }
        
        const answer = answers[q.id];
        let isCorrect: boolean | null = null;
        
        if (answer) {
          if (q.category === 'TKP') {
            const opt = q.options.find(o => o.key === answer);
            isCorrect = opt?.score === 5;
          } else {
            isCorrect = q.correctAnswer === answer;
          }
        }
        
        // Background color based on correctness
        if (answer) {
          if (isCorrect) {
            doc.setFillColor(187, 247, 208); // Light green
          } else {
            doc.setFillColor(254, 202, 202); // Light red
          }
        } else {
          doc.setFillColor(229, 231, 235); // Gray
        }
        
        doc.rect(cellX, cellY - 4, cellWidth - 0.5, cellHeight - 0.5, 'F');
        doc.setFontSize(6);
        doc.text(`${q.id}:${answer || '-'}`, cellX + 1, cellY);
      });
      
      y += Math.ceil(110 / gridCols) * cellHeight + 10;
      
      // Footer
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(
        `Dicetak pada: ${format(new Date(), 'dd MMMM yyyy HH:mm', { locale: localeId })}`,
        pageWidth / 2, 
        285, 
        { align: 'center' }
      );
      
      // Save
      const fileName = `hasil-ujian-${session.name.replace(/[^a-zA-Z0-9]/g, '-')}-${format(new Date(), 'yyyyMMdd-HHmm')}.pdf`;
      doc.save(fileName);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setIsGenerating(false);
    }
  }, [session, answers]);

  if (!session) return null;

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={generatePDF}
      disabled={isGenerating}
      className="text-white hover:bg-white/20 h-7 px-2 gap-1.5"
    >
      {isGenerating ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <FileDown className="w-3.5 h-3.5" />
      )}
      <span className="hidden sm:inline">{isGenerating ? 'Generating...' : 'Cetak PDF'}</span>
    </Button>
  );
};

export default ReviewPDFExport;
