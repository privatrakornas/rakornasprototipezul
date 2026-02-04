import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Edit2, Trash2, ChevronLeft, ChevronRight, Loader2, RefreshCw, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Question {
  id: string;
  package_id: string | null;
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
  created_at: string;
}

interface QuestionViewerProps {
  packageId: string;
  packageName: string;
  logAuditAction: (action: string, targetId: string | null, targetName: string | null, details: string) => Promise<void>;
  onQuestionsChanged: () => void;
}

const ITEMS_PER_PAGE = 10;

const QuestionViewer = ({ packageId, packageName, logAuditAction, onQuestionsChanged }: QuestionViewerProps) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [filteredQuestions, setFilteredQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchQuestions();
  }, [packageId]);

  useEffect(() => {
    filterQuestions();
  }, [questions, searchQuery, categoryFilter]);

  const fetchQuestions = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('package_id', packageId)
        .order('category')
        .order('question_number');

      if (error) throw error;
      setQuestions(data || []);
    } catch (err) {
      console.error('Error fetching questions:', err);
      toast.error('Gagal memuat daftar soal');
    } finally {
      setIsLoading(false);
    }
  };

  const filterQuestions = () => {
    let filtered = [...questions];

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(q => q.category === categoryFilter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(q =>
        q.question_text.toLowerCase().includes(query) ||
        q.option_a.toLowerCase().includes(query) ||
        q.option_b.toLowerCase().includes(query) ||
        q.option_c.toLowerCase().includes(query) ||
        q.option_d.toLowerCase().includes(query) ||
        q.option_e.toLowerCase().includes(query) ||
        q.question_number.toString().includes(query)
      );
    }

    setFilteredQuestions(filtered);
    setCurrentPage(1);
  };

  const totalPages = Math.ceil(filteredQuestions.length / ITEMS_PER_PAGE);
  const paginatedQuestions = filteredQuestions.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const openEditDialog = (question: Question) => {
    setEditingQuestion({ ...question });
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingQuestion) return;

    setIsSaving(true);
    try {
      const isTKP = editingQuestion.category === 'TKP';

      const { error } = await supabase
        .from('questions')
        .update({
          category: editingQuestion.category,
          question_number: editingQuestion.question_number,
          question_text: editingQuestion.question_text,
          option_a: editingQuestion.option_a,
          option_b: editingQuestion.option_b,
          option_c: editingQuestion.option_c,
          option_d: editingQuestion.option_d,
          option_e: editingQuestion.option_e,
          correct_answer: isTKP ? null : editingQuestion.correct_answer,
          points_a: editingQuestion.points_a,
          points_b: editingQuestion.points_b,
          points_c: editingQuestion.points_c,
          points_d: editingQuestion.points_d,
          points_e: editingQuestion.points_e,
          explanation: editingQuestion.explanation,
        })
        .eq('id', editingQuestion.id);

      if (error) throw error;

      await logAuditAction(
        'UPDATE_QUESTION',
        editingQuestion.id,
        `${editingQuestion.category} #${editingQuestion.question_number}`,
        `Paket: ${packageName}`
      );

      toast.success('Soal berhasil diperbarui');
      setEditDialogOpen(false);
      setEditingQuestion(null);
      fetchQuestions();
    } catch (err) {
      console.error('Error updating question:', err);
      toast.error('Gagal memperbarui soal');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteQuestion = async (question: Question) => {
    try {
      const { error } = await supabase
        .from('questions')
        .delete()
        .eq('id', question.id);

      if (error) throw error;

      // Update package counts
      const countField = question.category.toLowerCase() + '_count';
      const { data: currentPackage } = await supabase
        .from('exam_packages')
        .select('twk_count, tiu_count, tkp_count, total_questions')
        .eq('id', packageId)
        .single();

      if (currentPackage) {
        const updateData: Record<string, number> = {
          total_questions: currentPackage.total_questions - 1,
        };
        if (question.category === 'TWK') updateData.twk_count = currentPackage.twk_count - 1;
        if (question.category === 'TIU') updateData.tiu_count = currentPackage.tiu_count - 1;
        if (question.category === 'TKP') updateData.tkp_count = currentPackage.tkp_count - 1;

        await supabase.from('exam_packages').update(updateData).eq('id', packageId);
      }

      await logAuditAction(
        'DELETE_QUESTION',
        question.id,
        `${question.category} #${question.question_number}`,
        `Paket: ${packageName}`
      );

      toast.success('Soal berhasil dihapus');
      fetchQuestions();
      onQuestionsChanged();
    } catch (err) {
      console.error('Error deleting question:', err);
      toast.error('Gagal menghapus soal');
    }
  };

  const updateEditingQuestion = (field: keyof Question, value: any) => {
    if (editingQuestion) {
      setEditingQuestion({ ...editingQuestion, [field]: value });
    }
  };

  const getCategoryCount = (cat: string) => questions.filter(q => q.category === cat).length;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Cari soal..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Kategori" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua ({questions.length})</SelectItem>
            <SelectItem value="TWK">TWK ({getCategoryCount('TWK')})</SelectItem>
            <SelectItem value="TIU">TIU ({getCategoryCount('TIU')})</SelectItem>
            <SelectItem value="TKP">TKP ({getCategoryCount('TKP')})</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={fetchQuestions} disabled={isLoading}>
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Question List */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
          Memuat soal...
        </div>
      ) : filteredQuestions.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
          {searchQuery || categoryFilter !== 'all' 
            ? 'Tidak ada soal yang sesuai dengan filter' 
            : 'Belum ada soal dalam paket ini'}
        </div>
      ) : (
        <>
          <ScrollArea className="h-[500px] border rounded-lg">
            <div className="p-4 space-y-3">
              {paginatedQuestions.map((question) => (
                <Card key={question.id} className="hover:bg-muted/30 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="secondary">{question.category}</Badge>
                          <span className="font-medium">#{question.question_number}</span>
                          {question.category === 'TKP' ? (
                            <span className="text-xs text-muted-foreground">
                              (Skor: A={question.points_a}, B={question.points_b}, C={question.points_c}, D={question.points_d}, E={question.points_e})
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              (Jawaban: {question.correct_answer})
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {question.question_text}
                        </p>
                        <div className="mt-2 text-xs text-muted-foreground space-y-1">
                          <p className="truncate">A. {question.option_a}</p>
                          <p className="truncate">B. {question.option_b}</p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(question)}
                          title="Edit soal"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Hapus soal"
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Hapus Soal?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Soal {question.category} #{question.question_number} akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Batal</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteQuestion(question)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Hapus
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Menampilkan {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredQuestions.length)} dari {filteredQuestions.length} soal
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => p - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm">
                  {currentPage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => p + 1)}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Edit Question Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Soal {editingQuestion?.category} #{editingQuestion?.question_number}</DialogTitle>
            <DialogDescription>
              Perbarui detail soal dalam paket "{packageName}"
            </DialogDescription>
          </DialogHeader>

          {editingQuestion && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Kategori</Label>
                  <Select
                    value={editingQuestion.category}
                    onValueChange={(v) => updateEditingQuestion('category', v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TWK">TWK</SelectItem>
                      <SelectItem value="TIU">TIU</SelectItem>
                      <SelectItem value="TKP">TKP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Nomor Soal</Label>
                  <Input
                    type="number"
                    value={editingQuestion.question_number}
                    onChange={(e) => updateEditingQuestion('question_number', parseInt(e.target.value) || 1)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Pertanyaan</Label>
                <Textarea
                  value={editingQuestion.question_text}
                  onChange={(e) => updateEditingQuestion('question_text', e.target.value)}
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-1 gap-3">
                {['A', 'B', 'C', 'D', 'E'].map((opt) => (
                  <div key={opt} className="space-y-1">
                    <Label className="text-xs">Opsi {opt}</Label>
                    <Input
                      value={(editingQuestion[`option_${opt.toLowerCase()}` as keyof Question] as string) || ''}
                      onChange={(e) => updateEditingQuestion(`option_${opt.toLowerCase()}` as keyof Question, e.target.value)}
                    />
                  </div>
                ))}
              </div>

              {editingQuestion.category === 'TKP' ? (
                <div className="space-y-2">
                  <Label>Skor per Opsi (1-5)</Label>
                  <div className="grid grid-cols-5 gap-2">
                    {['a', 'b', 'c', 'd', 'e'].map((opt) => (
                      <div key={opt} className="space-y-1">
                        <Label className="text-xs text-center block">{opt.toUpperCase()}</Label>
                        <Input
                          type="number"
                          min={1}
                          max={5}
                          value={(editingQuestion[`points_${opt}` as keyof Question] as number) || 1}
                          onChange={(e) => updateEditingQuestion(`points_${opt}` as keyof Question, parseInt(e.target.value) || 1)}
                          className="text-center"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Kunci Jawaban</Label>
                  <Select
                    value={editingQuestion.correct_answer || 'A'}
                    onValueChange={(v) => updateEditingQuestion('correct_answer', v)}
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {['A', 'B', 'C', 'D', 'E'].map((opt) => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label>Pembahasan (opsional)</Label>
                <Textarea
                  value={editingQuestion.explanation || ''}
                  onChange={(e) => updateEditingQuestion('explanation', e.target.value)}
                  rows={3}
                  placeholder="Penjelasan jawaban..."
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleSaveEdit} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                'Simpan Perubahan'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default QuestionViewer;
