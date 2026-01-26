import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Ban, 
  Trash2, 
  CheckSquare, 
  Square, 
  X,
  Loader2
} from 'lucide-react';
import { ExamSession } from './types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface BatchActionsPanelProps {
  sessions: ExamSession[];
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  onActionComplete: () => void;
}

export const BatchActionsPanel = ({
  sessions,
  selectedIds,
  onSelectionChange,
  onActionComplete,
}: BatchActionsPanelProps) => {
  const [showDisqualifyDialog, setShowDisqualifyDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [disqualifyReason, setDisqualifyReason] = useState('Diskualifikasi massal oleh admin');
  const [isProcessing, setIsProcessing] = useState(false);

  const selectedCount = selectedIds.size;
  const hasSelection = selectedCount > 0;

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === sessions.length) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(sessions.map(s => s.id)));
    }
  }, [sessions, selectedIds, onSelectionChange]);

  const clearSelection = useCallback(() => {
    onSelectionChange(new Set());
  }, [onSelectionChange]);

  const handleBatchDisqualify = async () => {
    if (selectedIds.size === 0) return;
    
    setIsProcessing(true);
    try {
      const idsArray = Array.from(selectedIds);
      
      // Update all selected sessions to aborted
      const { error } = await supabase
        .from('exam_sessions')
        .update({
          status: 'aborted',
          disqualification_reason: disqualifyReason,
        })
        .in('id', idsArray);
      
      if (error) throw error;
      
      // Log audit entries
      for (const id of idsArray) {
        const session = sessions.find(s => s.id === id);
        await supabase.from('audit_logs').insert({
          action: 'BATCH_DISQUALIFY',
          target_id: id,
          target_name: session?.name || 'Unknown',
          details: `Diskualifikasi massal: ${disqualifyReason}`,
        });
      }
      
      toast.success(`${idsArray.length} peserta berhasil didiskualifikasi`);
      onSelectionChange(new Set());
      onActionComplete();
    } catch (error) {
      console.error('Batch disqualify error:', error);
      toast.error('Gagal mendiskualifikasi peserta');
    } finally {
      setIsProcessing(false);
      setShowDisqualifyDialog(false);
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;
    
    setIsProcessing(true);
    try {
      const idsArray = Array.from(selectedIds);
      
      // Soft delete all selected sessions
      const { error } = await supabase
        .from('exam_sessions')
        .update({ deleted_at: new Date().toISOString() })
        .in('id', idsArray);
      
      if (error) throw error;
      
      // Log audit entries
      for (const id of idsArray) {
        const session = sessions.find(s => s.id === id);
        await supabase.from('audit_logs').insert({
          action: 'BATCH_SOFT_DELETE',
          target_id: id,
          target_name: session?.name || 'Unknown',
          details: 'Penghapusan massal ke sampah',
        });
      }
      
      toast.success(`${idsArray.length} peserta berhasil dipindahkan ke sampah`);
      onSelectionChange(new Set());
      onActionComplete();
    } catch (error) {
      console.error('Batch delete error:', error);
      toast.error('Gagal menghapus peserta');
    } finally {
      setIsProcessing(false);
      setShowDeleteDialog(false);
    }
  };

  if (!hasSelection && sessions.length === 0) return null;

  return (
    <>
      {/* Batch Actions Bar */}
      <div className="flex items-center justify-between gap-3 p-3 bg-muted/50 border rounded-lg mb-4">
        <div className="flex items-center gap-3">
          {/* Select All Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSelectAll}
            className="h-8 gap-2"
          >
            {selectedIds.size === sessions.length && sessions.length > 0 ? (
              <CheckSquare className="w-4 h-4" />
            ) : (
              <Square className="w-4 h-4" />
            )}
            Pilih Semua
          </Button>
          
          {hasSelection && (
            <>
              <Badge variant="secondary" className="gap-1">
                {selectedCount} dipilih
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSelection}
                className="h-8 gap-1 text-muted-foreground"
              >
                <X className="w-3 h-3" />
                Batal
              </Button>
            </>
          )}
        </div>
        
        {hasSelection && (
          <div className="flex items-center gap-2">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowDisqualifyDialog(true)}
              className="h-8 gap-1"
            >
              <Ban className="w-3.5 h-3.5" />
              Diskualifikasi ({selectedCount})
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
              className="h-8 gap-1 text-amber-600 border-amber-300 hover:bg-amber-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Hapus ({selectedCount})
            </Button>
          </div>
        )}
      </div>

      {/* Disqualify Confirmation Dialog */}
      <AlertDialog open={showDisqualifyDialog} onOpenChange={setShowDisqualifyDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Ban className="w-5 h-5 text-destructive" />
              Diskualifikasi {selectedCount} Peserta?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                Anda akan mendiskualifikasi <strong>{selectedCount} peserta</strong> sekaligus. 
                Tindakan ini akan menghentikan ujian mereka dan menandai sesi sebagai dibatalkan.
              </p>
              <div className="space-y-2">
                <Label htmlFor="reason">Alasan Diskualifikasi:</Label>
                <Input
                  id="reason"
                  value={disqualifyReason}
                  onChange={(e) => setDisqualifyReason(e.target.value)}
                  placeholder="Masukkan alasan..."
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBatchDisqualify}
              disabled={isProcessing || !disqualifyReason.trim()}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Memproses...
                </>
              ) : (
                'Diskualifikasi Semua'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-amber-500" />
              Hapus {selectedCount} Data?
            </AlertDialogTitle>
            <AlertDialogDescription>
              <p>
                Anda akan memindahkan <strong>{selectedCount} data peserta</strong> ke sampah. 
                Data masih bisa dipulihkan dari tab Sampah.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBatchDelete}
              disabled={isProcessing}
              className="bg-amber-500 hover:bg-amber-600"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Memproses...
                </>
              ) : (
                'Hapus Semua'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

// Checkbox cell component for table rows
export const BatchSelectCell = ({
  sessionId,
  selectedIds,
  onSelectionChange,
}: {
  sessionId: string;
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
}) => {
  const isSelected = selectedIds.has(sessionId);

  const toggleSelection = () => {
    const newSet = new Set(selectedIds);
    if (isSelected) {
      newSet.delete(sessionId);
    } else {
      newSet.add(sessionId);
    }
    onSelectionChange(newSet);
  };

  return (
    <Checkbox
      checked={isSelected}
      onCheckedChange={toggleSelection}
      aria-label="Pilih peserta"
    />
  );
};

export default BatchActionsPanel;
