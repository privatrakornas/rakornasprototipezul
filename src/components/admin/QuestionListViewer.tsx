import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, ChevronLeft, ChevronRight, FileText, Edit2, Trash2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Question {
  id: string;
  question_number: number;
  category: string;
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

interface QuestionListViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  packageId: string;
  packageName: string;
  onRefresh?: () => void;
}

const ITEMS_PER_PAGE = 10;

const QuestionListViewer = ({ open, onOpenChange, packageId, packageName, onRefresh }: QuestionListViewerProps) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [questionToDelete, setQuestionToDelete] = useState<Question | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (open && packageId) {
      fetchQuestions();
    }
  }, [open, packageId]);

  const fetchQuestions = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('package_id', packageId)
        .order('question_number', { ascending: true });

      if (error) throw error;
      setQuestions(data || []);
    } catch (err) {
      console.error('Error fetching questions:', err);
      toast.error('Gagal memuat daftar soal');
    } finally {
      setIsLoading(false);
    }
  };

  // Filter and search logic
  const filteredQuestions = useMemo(() => {
    return questions.filter(q => {
      const matchesCategory = categoryFilter === 'all' || q.category === categoryFilter;
      const matchesSearch = searchQuery === '' || 
        q.question_text.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.question_number.toString().includes(searchQuery);
      return matchesCategory && matchesSearch;
    });
  }, [questions, categoryFilter, searchQuery]);

  // Pagination logic
  const totalPages = Math.ceil(filteredQuestions.length / ITEMS_PER_PAGE);
  const paginatedQuestions = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredQuestions.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredQuestions, currentPage]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, categoryFilter]);

  const handleDeleteQuestion = async () => {
    if (!questionToDelete) return;
    
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('questions')
        .delete()
        .eq('id', questionToDelete.id);

      if (error) throw error;

      // Update package counts
      const category = questionToDelete.category.toLowerCase();
      const countField = `${category}_count`;
      
      // Fetch current package to get counts
      const { data: pkg } = await supabase
        .from('exam_packages')
        .select('twk_count, tiu_count, tkp_count, total_questions')
        .eq('id', packageId)
        .single();

      if (pkg) {
        const updateData: Record<string, number> = {
          total_questions: pkg.total_questions - 1,
        };
        
        if (category === 'twk') updateData.twk_count = pkg.twk_count - 1;
        if (category === 'tiu') updateData.tiu_count = pkg.tiu_count - 1;
        if (category === 'tkp') updateData.tkp_count = pkg.tkp_count - 1;

        await supabase
          .from('exam_packages')
          .update(updateData)
          .eq('id', packageId);
      }

      toast.success(`Soal nomor ${questionToDelete.question_number} berhasil dihapus`);
      setDeleteDialogOpen(false);
      setQuestionToDelete(null);
      fetchQuestions();
      onRefresh?.();
    } catch (err) {
      console.error('Error deleting question:', err);
      toast.error('Gagal menghapus soal');
    } finally {
      setIsDeleting(false);
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'TWK': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'TIU': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'TKP': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const truncateText = (text: string, maxLength: number = 150) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Daftar Soal - {packageName}
            </DialogTitle>
            <DialogDescription>
              Total {questions.length} soal | Menampilkan {filteredQuestions.length} soal sesuai filter
            </DialogDescription>
          </DialogHeader>

          {/* Filters */}
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Cari soal atau nomor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Kategori" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua</SelectItem>
                <SelectItem value="TWK">TWK</SelectItem>
                <SelectItem value="TIU">TIU</SelectItem>
                <SelectItem value="TKP">TKP</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Question List */}
          <ScrollArea className="flex-1 min-h-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : paginatedQuestions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                {questions.length === 0 
                  ? 'Belum ada soal dalam paket ini'
                  : 'Tidak ada soal yang sesuai dengan filter'}
              </div>
            ) : (
              <div className="space-y-3 pr-4">
                {paginatedQuestions.map((q) => (
                  <Card key={q.id} className="hover:bg-muted/30 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="text-xs font-mono">
                              #{q.question_number}
                            </Badge>
                            <Badge className={`text-xs ${getCategoryColor(q.category)}`}>
                              {q.category}
                            </Badge>
                            {q.category !== 'TKP' && q.correct_answer && (
                              <Badge variant="secondary" className="text-xs">
                                Jawaban: {q.correct_answer}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-foreground leading-relaxed">
                            {truncateText(q.question_text)}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-1 text-xs text-muted-foreground">
                            <span>A: {truncateText(q.option_a, 30)}</span>
                            <span className="mx-1">|</span>
                            <span>B: {truncateText(q.option_b, 30)}</span>
                            <span className="mx-1">|</span>
                            <span>C: {truncateText(q.option_c, 30)}</span>
                          </div>
                          {q.category === 'TKP' && (
                            <div className="mt-1 text-xs text-muted-foreground">
                              Skor: A={q.points_a} | B={q.points_b} | C={q.points_c} | D={q.points_d} | E={q.points_e}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => {
                              setQuestionToDelete(q);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Halaman {currentPage} dari {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Prev
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Soal?</AlertDialogTitle>
            <AlertDialogDescription>
              Soal nomor {questionToDelete?.question_number} ({questionToDelete?.category}) akan dihapus permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteQuestion}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Menghapus...' : 'Hapus'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default QuestionListViewer;
