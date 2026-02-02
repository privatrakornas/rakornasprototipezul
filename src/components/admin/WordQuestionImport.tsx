import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Upload, FileText, AlertCircle, CheckCircle2, X, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

interface ParsedQuestion {
  category: 'TWK' | 'TIU' | 'TKP';
  questionNumber: number;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  optionE: string;
  correctAnswer?: string;
  pointsA?: number;
  pointsB?: number;
  pointsC?: number;
  pointsD?: number;
  pointsE?: number;
  explanation?: string;
}

interface WordQuestionImportProps {
  packageId: string;
  packageName: string;
  onSuccess: () => void;
  logAuditAction: (action: string, targetId: string | null, targetName: string | null, details: string) => Promise<void>;
}

const WordQuestionImport = ({ packageId, packageName, onSuccess, logAuditAction }: WordQuestionImportProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [parsedQuestions, setParsedQuestions] = useState<ParsedQuestion[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const parseWordDocument = async (file: File) => {
    setIsProcessing(true);
    setParseErrors([]);
    setParsedQuestions([]);
    setProgress(0);
    setSelectedFile(file);

    try {
      // Read file as ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      
      // Use xlsx to parse the document (it can handle docx too)
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      
      // Get the first sheet or combine all text
      let fullText = '';
      workbook.SheetNames.forEach(sheetName => {
        const sheet = workbook.Sheets[sheetName];
        const text = XLSX.utils.sheet_to_txt(sheet);
        fullText += text + '\n';
      });

      // If xlsx didn't work well, try raw text extraction
      if (!fullText.trim()) {
        const textDecoder = new TextDecoder('utf-8');
        fullText = textDecoder.decode(arrayBuffer);
      }

      // Parse the text content
      const questions = parseTextContent(fullText);
      
      if (questions.length === 0) {
        setParseErrors(['Tidak ditemukan soal yang valid dalam file. Pastikan format sesuai dengan contoh.']);
      } else {
        setParsedQuestions(questions);
        toast.success(`Berhasil mem-parse ${questions.length} soal`);
      }
    } catch (err) {
      console.error('Error parsing document:', err);
      setParseErrors(['Gagal membaca file. Pastikan file adalah dokumen Word yang valid.']);
    } finally {
      setIsProcessing(false);
      setProgress(100);
    }
  };

  const parseTextContent = (text: string): ParsedQuestion[] => {
    const questions: ParsedQuestion[] = [];
    const errors: string[] = [];
    
    // Split by question markers
    const questionBlocks = text.split(/(?=(?:Nomor Soal|#\s*Nomor Soal|Pilar)\s*\d+)/i);
    
    let currentCategory: 'TWK' | 'TIU' | 'TKP' = 'TWK';
    
    // Detect category changes
    const categoryPatterns = {
      TWK: /TES WAWASAN KEBANGSAAN|TWK/i,
      TIU: /TES INTELEGENSI UMUM|TIU/i,
      TKP: /TES KARAKTERISTIK PRIBADI|TKP/i,
    };
    
    for (let i = 0; i < questionBlocks.length; i++) {
      const block = questionBlocks[i];
      setProgress(Math.round((i / questionBlocks.length) * 100));
      
      // Check for category markers
      if (categoryPatterns.TWK.test(block) && !block.match(/Nomor Soal|Pilar/i)) {
        currentCategory = 'TWK';
        continue;
      }
      if (categoryPatterns.TIU.test(block) && !block.match(/Nomor Soal|Pilar/i)) {
        currentCategory = 'TIU';
        continue;
      }
      if (categoryPatterns.TKP.test(block) && !block.match(/Nomor Soal|Pilar/i)) {
        currentCategory = 'TKP';
        continue;
      }
      
      // Update category based on content
      if (/Kemampuan\s+(Numerik|Verbal|Figural)/i.test(block)) {
        currentCategory = 'TIU';
      } else if (/Pelayanan\s+Publik|Jejaring\s+Kerja|Sosial\s+Budaya|Profesionalisme|Anti\s+Radikalisme/i.test(block)) {
        currentCategory = 'TKP';
      }
      
      // Extract question number
      const numberMatch = block.match(/(?:Nomor Soal|Pilar)\s*(\d+)/i);
      if (!numberMatch) continue;
      
      const questionNumber = parseInt(numberMatch[1]);
      
      // Extract question text
      const soalMatch = block.match(/(?:Soal[:\s]*)([\s\S]*?)(?=Pilihan Berganda|A\.\s)/i);
      let questionText = soalMatch ? soalMatch[1].trim() : '';
      
      // If no soal marker, try to extract text after number
      if (!questionText) {
        const afterNumber = block.substring(block.indexOf(numberMatch[0]) + numberMatch[0].length);
        const textMatch = afterNumber.match(/(?:Kode Soal[^A-Z]*)?([A-Z][^A-E]{20,}?)(?=A\.\s)/is);
        if (textMatch) {
          questionText = textMatch[1].replace(/^[^a-zA-Z]+/, '').trim();
        }
      }
      
      if (!questionText || questionText.length < 10) {
        errors.push(`Soal #${questionNumber}: Teks soal tidak ditemukan atau terlalu pendek`);
        continue;
      }
      
      // Extract options A-E
      const optionPatterns = [
        /A\.\s*([\s\S]*?)(?=B\.\s)/i,
        /B\.\s*([\s\S]*?)(?=C\.\s)/i,
        /C\.\s*([\s\S]*?)(?=D\.\s)/i,
        /D\.\s*([\s\S]*?)(?=E\.\s)/i,
        /E\.\s*([\s\S]*?)(?=(?:Kunci Jawaban|Pembahasan|$))/i,
      ];
      
      const options: string[] = [];
      for (const pattern of optionPatterns) {
        const match = block.match(pattern);
        options.push(match ? match[1].trim().replace(/\n+/g, ' ').substring(0, 500) : '');
      }
      
      if (options.some(opt => !opt)) {
        errors.push(`Soal #${questionNumber}: Opsi jawaban tidak lengkap`);
        continue;
      }
      
      // Parse answer/scores
      let correctAnswer: string | undefined;
      let pointsA = 0, pointsB = 0, pointsC = 0, pointsD = 0, pointsE = 0;
      
      const answerSection = block.match(/Kunci Jawaban([\s\S]*?)(?=Pembahasan|$)/i);
      
      if (answerSection) {
        const answerText = answerSection[1];
        
        // Check if TKP format (scores)
        const scoreMatches = answerText.match(/([A-E])\.\s*Skor\s*(\d)/gi);
        if (scoreMatches && scoreMatches.length >= 5) {
          currentCategory = 'TKP';
          for (const match of scoreMatches) {
            const [, letter, score] = match.match(/([A-E])\.\s*Skor\s*(\d)/i) || [];
            const scoreNum = parseInt(score);
            if (letter === 'A') pointsA = scoreNum;
            if (letter === 'B') pointsB = scoreNum;
            if (letter === 'C') pointsC = scoreNum;
            if (letter === 'D') pointsD = scoreNum;
            if (letter === 'E') pointsE = scoreNum;
          }
        } else {
          // TWK/TIU format - single correct answer
          const correctMatch = answerText.match(/([A-E])\./);
          if (correctMatch) {
            correctAnswer = correctMatch[1];
          }
        }
      }
      
      // Extract explanation
      const explanationMatch = block.match(/Pembahasan[:\s]*([\s\S]*?)(?=Nomor Soal|$)/i);
      const explanation = explanationMatch ? explanationMatch[1].trim().substring(0, 1000) : undefined;
      
      const question: ParsedQuestion = {
        category: currentCategory,
        questionNumber,
        questionText: questionText.substring(0, 2000),
        optionA: options[0],
        optionB: options[1],
        optionC: options[2],
        optionD: options[3],
        optionE: options[4],
        explanation,
      };
      
      if (currentCategory === 'TKP') {
        question.pointsA = pointsA || 1;
        question.pointsB = pointsB || 1;
        question.pointsC = pointsC || 1;
        question.pointsD = pointsD || 1;
        question.pointsE = pointsE || 1;
      } else {
        question.correctAnswer = correctAnswer || 'A';
      }
      
      questions.push(question);
    }
    
    setParseErrors(errors);
    return questions;
  };

  const handleSaveQuestions = async () => {
    if (parsedQuestions.length === 0) return;
    
    setIsSaving(true);
    setProgress(0);
    
    try {
      let successCount = 0;
      let errorCount = 0;
      const twkCount = parsedQuestions.filter(q => q.category === 'TWK').length;
      const tiuCount = parsedQuestions.filter(q => q.category === 'TIU').length;
      const tkpCount = parsedQuestions.filter(q => q.category === 'TKP').length;
      
      for (let i = 0; i < parsedQuestions.length; i++) {
        const q = parsedQuestions[i];
        setProgress(Math.round((i / parsedQuestions.length) * 100));
        
        const isTKP = q.category === 'TKP';
        
        const { error } = await supabase.from('questions').insert({
          package_id: packageId,
          category: q.category,
          question_number: q.questionNumber,
          question_text: q.questionText,
          option_a: q.optionA,
          option_b: q.optionB,
          option_c: q.optionC,
          option_d: q.optionD,
          option_e: q.optionE,
          explanation: q.explanation || null,
          correct_answer: isTKP ? null : q.correctAnswer,
          points_a: isTKP ? q.pointsA : (q.correctAnswer === 'A' ? 5 : 0),
          points_b: isTKP ? q.pointsB : (q.correctAnswer === 'B' ? 5 : 0),
          points_c: isTKP ? q.pointsC : (q.correctAnswer === 'C' ? 5 : 0),
          points_d: isTKP ? q.pointsD : (q.correctAnswer === 'D' ? 5 : 0),
          points_e: isTKP ? q.pointsE : (q.correctAnswer === 'E' ? 5 : 0),
        });
        
        if (error) {
          console.error(`Error saving question #${q.questionNumber}:`, error);
          errorCount++;
        } else {
          successCount++;
        }
      }
      
      // Update package counts
      const { data: currentPackage } = await supabase
        .from('exam_packages')
        .select('twk_count, tiu_count, tkp_count, total_questions')
        .eq('id', packageId)
        .single();
      
      if (currentPackage) {
        await supabase.from('exam_packages').update({
          twk_count: currentPackage.twk_count + twkCount,
          tiu_count: currentPackage.tiu_count + tiuCount,
          tkp_count: currentPackage.tkp_count + tkpCount,
          total_questions: currentPackage.total_questions + successCount,
        }).eq('id', packageId);
      }
      
      await logAuditAction(
        'IMPORT_QUESTIONS',
        packageId,
        packageName,
        `Import ${successCount} soal (TWK:${twkCount}, TIU:${tiuCount}, TKP:${tkpCount}), ${errorCount} gagal`
      );
      
      if (errorCount > 0) {
        toast.warning(`${successCount} soal berhasil diimport, ${errorCount} gagal (mungkin duplikat)`);
      } else {
        toast.success(`${successCount} soal berhasil diimport`);
      }
      
      setParsedQuestions([]);
      setSelectedFile(null);
      onSuccess();
    } catch (err) {
      console.error('Error saving questions:', err);
      toast.error('Gagal menyimpan soal');
    } finally {
      setIsSaving(false);
      setProgress(100);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.match(/\.(doc|docx)$/i)) {
        toast.error('Hanya file .doc atau .docx yang didukung');
        return;
      }
      parseWordDocument(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (!file.name.match(/\.(doc|docx)$/i)) {
        toast.error('Hanya file .doc atau .docx yang didukung');
        return;
      }
      parseWordDocument(file);
    }
  };

  const clearResults = () => {
    setParsedQuestions([]);
    setParseErrors([]);
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getCategoryCounts = () => {
    const twk = parsedQuestions.filter(q => q.category === 'TWK').length;
    const tiu = parsedQuestions.filter(q => q.category === 'TIU').length;
    const tkp = parsedQuestions.filter(q => q.category === 'TKP').length;
    return { twk, tiu, tkp };
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Import dari File Word</CardTitle>
          <CardDescription>
            Upload file Word (.doc/.docx) yang berisi soal-soal ujian. Format harus sesuai dengan contoh yang diberikan.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Upload Area */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
            }`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".doc,.docx"
              onChange={handleFileChange}
              className="hidden"
            />
            
            {isProcessing ? (
              <div className="space-y-4">
                <Loader2 className="w-12 h-12 mx-auto text-primary animate-spin" />
                <p className="text-sm text-muted-foreground">Memproses file...</p>
                <Progress value={progress} className="max-w-xs mx-auto" />
              </div>
            ) : selectedFile ? (
              <div className="space-y-2">
                <FileText className="w-12 h-12 mx-auto text-primary" />
                <p className="font-medium">{selectedFile.name}</p>
                <Button variant="outline" size="sm" onClick={clearResults}>
                  <X className="w-4 h-4 mr-2" />
                  Ganti File
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <Upload className="w-12 h-12 mx-auto text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Drag & drop file Word di sini, atau
                  </p>
                  <Button onClick={() => fileInputRef.current?.click()}>
                    Pilih File
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Format yang didukung: .doc, .docx
                </p>
              </div>
            )}
          </div>

          {/* Parse Errors */}
          {parseErrors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Peringatan Parsing</AlertTitle>
              <AlertDescription>
                <ScrollArea className="h-24 mt-2">
                  <ul className="text-sm space-y-1">
                    {parseErrors.map((err, i) => (
                      <li key={i}>• {err}</li>
                    ))}
                  </ul>
                </ScrollArea>
              </AlertDescription>
            </Alert>
          )}

          {/* Parsed Results */}
          {parsedQuestions.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  <span className="font-medium">{parsedQuestions.length} soal berhasil di-parse</span>
                </div>
                <div className="flex gap-2">
                  <Badge variant="outline">TWK: {getCategoryCounts().twk}</Badge>
                  <Badge variant="outline">TIU: {getCategoryCounts().tiu}</Badge>
                  <Badge variant="outline">TKP: {getCategoryCounts().tkp}</Badge>
                </div>
              </div>

              <ScrollArea className="h-64 border rounded-lg p-4">
                <div className="space-y-3">
                  {parsedQuestions.map((q, i) => (
                    <div key={i} className="p-3 bg-muted/50 rounded-lg text-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="secondary">{q.category}</Badge>
                        <span className="font-medium">#{q.questionNumber}</span>
                      </div>
                      <p className="text-muted-foreground line-clamp-2">
                        {q.questionText}
                      </p>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={clearResults}>
                  Batal
                </Button>
                <Button onClick={handleSaveQuestions} disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Menyimpan ({Math.round(progress)}%)
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Simpan {parsedQuestions.length} Soal
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Format Guide */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Panduan Format File</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-4">
          <p>File Word harus mengikuti format berikut:</p>
          
          <div className="bg-muted p-4 rounded-lg font-mono text-xs space-y-2">
            <p className="text-muted-foreground"># TWK/TIU Format:</p>
            <p>Nomor Soal 1.</p>
            <p>Soal: [Teks pertanyaan]</p>
            <p>A. [Opsi A]</p>
            <p>B. [Opsi B]</p>
            <p>C. [Opsi C]</p>
            <p>D. [Opsi D]</p>
            <p>E. [Opsi E]</p>
            <p>Kunci Jawaban: A. [Jawaban]</p>
            <p>Pembahasan: [Penjelasan]</p>
          </div>
          
          <div className="bg-muted p-4 rounded-lg font-mono text-xs space-y-2">
            <p className="text-muted-foreground"># TKP Format (dengan skor):</p>
            <p>Nomor Soal 76.</p>
            <p>Soal: [Teks pertanyaan]</p>
            <p>A. [Opsi A]</p>
            <p>...</p>
            <p>Kunci Jawaban:</p>
            <p>A. Skor 5.</p>
            <p>B. Skor 4.</p>
            <p>C. Skor 3.</p>
            <p>D. Skor 2.</p>
            <p>E. Skor 1.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WordQuestionImport;
