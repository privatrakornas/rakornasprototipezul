import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Save, RotateCcw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ManualQuestionInputProps {
  packageId: string;
  packageName: string;
  onSuccess: () => void;
  logAuditAction: (action: string, targetId: string | null, targetName: string | null, details: string) => Promise<void>;
}

const ManualQuestionInput = ({ packageId, packageName, onSuccess, logAuditAction }: ManualQuestionInputProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state
  const [category, setCategory] = useState<string>('TWK');
  const [questionNumber, setQuestionNumber] = useState<string>('');
  const [questionText, setQuestionText] = useState('');
  const [optionA, setOptionA] = useState('');
  const [optionB, setOptionB] = useState('');
  const [optionC, setOptionC] = useState('');
  const [optionD, setOptionD] = useState('');
  const [optionE, setOptionE] = useState('');
  const [correctAnswer, setCorrectAnswer] = useState<string>('');
  const [explanation, setExplanation] = useState('');
  
  // TKP points
  const [pointsA, setPointsA] = useState<string>('');
  const [pointsB, setPointsB] = useState<string>('');
  const [pointsC, setPointsC] = useState<string>('');
  const [pointsD, setPointsD] = useState<string>('');
  const [pointsE, setPointsE] = useState<string>('');

  const resetForm = () => {
    setQuestionNumber('');
    setQuestionText('');
    setOptionA('');
    setOptionB('');
    setOptionC('');
    setOptionD('');
    setOptionE('');
    setCorrectAnswer('');
    setExplanation('');
    setPointsA('');
    setPointsB('');
    setPointsC('');
    setPointsD('');
    setPointsE('');
  };

  const validateForm = (): boolean => {
    if (!questionNumber || parseInt(questionNumber) < 1) {
      toast.error('Nomor soal harus diisi dan valid');
      return false;
    }
    if (!questionText.trim()) {
      toast.error('Teks soal harus diisi');
      return false;
    }
    if (!optionA.trim() || !optionB.trim() || !optionC.trim() || !optionD.trim() || !optionE.trim()) {
      toast.error('Semua opsi jawaban (A-E) harus diisi');
      return false;
    }
    
    if (category === 'TKP') {
      // Validate TKP points
      const points = [pointsA, pointsB, pointsC, pointsD, pointsE];
      for (const p of points) {
        const num = parseInt(p);
        if (isNaN(num) || num < 1 || num > 5) {
          toast.error('Skor TKP harus diisi dengan nilai 1-5 untuk setiap opsi');
          return false;
        }
      }
    } else {
      // Validate correct answer for TWK/TIU
      if (!correctAnswer) {
        toast.error('Jawaban benar harus dipilih');
        return false;
      }
    }
    
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const isTKP = category === 'TKP';
      
      const { error } = await supabase
        .from('questions')
        .insert({
          package_id: packageId,
          category,
          question_number: parseInt(questionNumber),
          question_text: questionText.trim(),
          option_a: optionA.trim(),
          option_b: optionB.trim(),
          option_c: optionC.trim(),
          option_d: optionD.trim(),
          option_e: optionE.trim(),
          explanation: explanation.trim() || null,
          correct_answer: isTKP ? null : correctAnswer,
          points_a: isTKP ? parseInt(pointsA) : (correctAnswer === 'A' ? 5 : 0),
          points_b: isTKP ? parseInt(pointsB) : (correctAnswer === 'B' ? 5 : 0),
          points_c: isTKP ? parseInt(pointsC) : (correctAnswer === 'C' ? 5 : 0),
          points_d: isTKP ? parseInt(pointsD) : (correctAnswer === 'D' ? 5 : 0),
          points_e: isTKP ? parseInt(pointsE) : (correctAnswer === 'E' ? 5 : 0),
        });

      if (error) {
        if (error.code === '23505') {
          toast.error('Nomor soal sudah ada dalam paket ini');
        } else {
          throw error;
        }
        return;
      }

      // Update package question counts
      const countField = category === 'TWK' ? 'twk_count' : category === 'TIU' ? 'tiu_count' : 'tkp_count';
      const { data: currentPackage } = await supabase
        .from('exam_packages')
        .select('twk_count, tiu_count, tkp_count, total_questions')
        .eq('id', packageId)
        .single();
      
      if (currentPackage) {
        const updateData: Record<string, number> = {
          total_questions: currentPackage.total_questions + 1,
        };
        if (countField === 'twk_count') updateData.twk_count = currentPackage.twk_count + 1;
        if (countField === 'tiu_count') updateData.tiu_count = currentPackage.tiu_count + 1;
        if (countField === 'tkp_count') updateData.tkp_count = currentPackage.tkp_count + 1;
        
        await supabase.from('exam_packages').update(updateData).eq('id', packageId);
      }

      await logAuditAction(
        'ADD_QUESTION',
        packageId,
        packageName,
        `${category} #${questionNumber} ditambahkan`
      );

      toast.success(`Soal ${category} #${questionNumber} berhasil ditambahkan`);
      resetForm();
      onSuccess();
    } catch (err) {
      console.error('Error adding question:', err);
      toast.error('Gagal menambahkan soal');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Input Soal Manual</CardTitle>
          <CardDescription>
            Tambahkan soal satu per satu ke paket "{packageName}"
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Category and Number */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Kategori Soal *</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TWK">TWK (Tes Wawasan Kebangsaan)</SelectItem>
                  <SelectItem value="TIU">TIU (Tes Intelegensi Umum)</SelectItem>
                  <SelectItem value="TKP">TKP (Tes Karakteristik Pribadi)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Nomor Soal *</Label>
              <Input
                type="number"
                min={1}
                placeholder="Contoh: 1"
                value={questionNumber}
                onChange={(e) => setQuestionNumber(e.target.value)}
              />
            </div>
          </div>

          {/* Question Text */}
          <div className="space-y-2">
            <Label>Teks Soal *</Label>
            <Textarea
              placeholder="Masukkan teks pertanyaan..."
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              rows={4}
            />
          </div>

          <Separator />

          {/* Options */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Pilihan Jawaban *</Label>
            
            {['A', 'B', 'C', 'D', 'E'].map((opt) => {
              const value = opt === 'A' ? optionA : opt === 'B' ? optionB : opt === 'C' ? optionC : opt === 'D' ? optionD : optionE;
              const setValue = opt === 'A' ? setOptionA : opt === 'B' ? setOptionB : opt === 'C' ? setOptionC : opt === 'D' ? setOptionD : setOptionE;
              const points = opt === 'A' ? pointsA : opt === 'B' ? pointsB : opt === 'C' ? pointsC : opt === 'D' ? pointsD : pointsE;
              const setPoints = opt === 'A' ? setPointsA : opt === 'B' ? setPointsB : opt === 'C' ? setPointsC : opt === 'D' ? setPointsD : setPointsE;
              
              return (
                <div key={opt} className="flex items-start gap-3">
                  <span className="font-medium text-sm w-6 pt-2">{opt}.</span>
                  <div className="flex-1">
                    <Textarea
                      placeholder={`Opsi ${opt}...`}
                      value={value}
                      onChange={(e) => setValue(e.target.value)}
                      rows={2}
                    />
                  </div>
                  {category === 'TKP' && (
                    <div className="w-20">
                      <Input
                        type="number"
                        min={1}
                        max={5}
                        placeholder="Skor"
                        value={points}
                        onChange={(e) => setPoints(e.target.value)}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <Separator />

          {/* Correct Answer (for TWK/TIU) */}
          {category !== 'TKP' && (
            <div className="space-y-3">
              <Label className="text-base font-medium">Jawaban Benar *</Label>
              <RadioGroup value={correctAnswer} onValueChange={setCorrectAnswer} className="flex gap-4">
                {['A', 'B', 'C', 'D', 'E'].map((opt) => (
                  <div key={opt} className="flex items-center space-x-2">
                    <RadioGroupItem value={opt} id={`correct-${opt}`} />
                    <Label htmlFor={`correct-${opt}`} className="cursor-pointer">{opt}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          )}

          {/* Explanation */}
          <div className="space-y-2">
            <Label>Pembahasan (opsional)</Label>
            <Textarea
              placeholder="Penjelasan jawaban..."
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={resetForm}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset Form
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              <Save className="w-4 h-4 mr-2" />
              {isSubmitting ? 'Menyimpan...' : 'Simpan Soal'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ManualQuestionInput;
