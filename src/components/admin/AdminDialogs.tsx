import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Ban, Trash2, RotateCcw } from 'lucide-react';
import { ExamSession } from './types';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

const formatDateTime = (dateStr: string | null) => {
  if (!dateStr) return '-';
  try {
    return format(new Date(dateStr), 'dd MMM yyyy HH:mm', { locale: localeId });
  } catch {
    return '-';
  }
};

interface DisqualifyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: ExamSession | null;
  reason: string;
  onReasonChange: (reason: string) => void;
  onConfirm: () => void;
  isLoading: boolean;
}

export const DisqualifyDialog = ({
  open,
  onOpenChange,
  session,
  reason,
  onReasonChange,
  onConfirm,
  isLoading,
}: DisqualifyDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Ban className="w-5 h-5" />
            Diskualifikasi Peserta
          </DialogTitle>
          <DialogDescription>
            Anda akan mendiskualifikasi <strong>{session?.name}</strong>. 
            Tindakan ini tidak dapat dibatalkan.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div>
            <label className="block text-sm font-medium mb-2">Alasan Diskualifikasi *</label>
            <Textarea
              value={reason}
              onChange={(e) => onReasonChange(e.target.value)}
              placeholder="Masukkan alasan diskualifikasi..."
              rows={3}
            />
          </div>
          
          {session && (
            <div className="bg-slate-50 p-3 rounded-md text-sm space-y-1">
              <p><strong>Progress:</strong> {session.answered_count}/{session.total_questions}</p>
              <p><strong>Skor:</strong> TWK:{session.twk_score} TIU:{session.tiu_score} TKP:{session.tkp_score}</p>
              <p><strong>Mulai:</strong> {formatDateTime(session.started_at)}</p>
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Batal
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isLoading || !reason.trim()}>
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Memproses...
              </>
            ) : (
              <>
                <Ban className="w-4 h-4 mr-2" />
                Diskualifikasi
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

interface DeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: ExamSession | null;
  onConfirm: () => void;
  isLoading: boolean;
}

export const DeleteDialog = ({
  open,
  onOpenChange,
  session,
  onConfirm,
  isLoading,
}: DeleteDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-600">
            <Trash2 className="w-5 h-5" />
            Hapus Data
          </DialogTitle>
          <DialogDescription>
            Anda akan menghapus data <strong>{session?.name}</strong>. 
            Data akan dipindahkan ke Sampah dan dapat dipulihkan kembali.
          </DialogDescription>
        </DialogHeader>
        
        {session && (
          <div className="bg-slate-50 p-3 rounded-md text-sm space-y-1">
            <p><strong>Status:</strong> {session.status}</p>
            <p><strong>Skor:</strong> TWK:{session.twk_score} TIU:{session.tiu_score} TKP:{session.tkp_score}</p>
            <p><strong>Total:</strong> {session.total_score}</p>
          </div>
        )}
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Batal
          </Button>
          <Button 
            onClick={onConfirm} 
            disabled={isLoading}
            className="bg-amber-600 hover:bg-amber-700"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Menghapus...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4 mr-2" />
                Hapus ke Sampah
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

interface RestoreDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: ExamSession | null;
  onConfirm: () => void;
  isLoading: boolean;
}

export const RestoreDialog = ({
  open,
  onOpenChange,
  session,
  onConfirm,
  isLoading,
}: RestoreDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-green-600">
            <RotateCcw className="w-5 h-5" />
            Pulihkan Data
          </DialogTitle>
          <DialogDescription>
            Anda akan memulihkan data <strong>{session?.name}</strong>. 
            Data akan dikembalikan ke tabel sesuai status aslinya.
          </DialogDescription>
        </DialogHeader>
        
        {session && (
          <div className="bg-slate-50 p-3 rounded-md text-sm space-y-1">
            <p><strong>Status:</strong> {session.status}</p>
            <p><strong>Skor:</strong> TWK:{session.twk_score} TIU:{session.tiu_score} TKP:{session.tkp_score}</p>
            <p><strong>Total:</strong> {session.total_score}</p>
            <p><strong>Dihapus pada:</strong> {formatDateTime(session.deleted_at)}</p>
          </div>
        )}
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Batal
          </Button>
          <Button 
            onClick={onConfirm} 
            disabled={isLoading}
            className="bg-green-600 hover:bg-green-700"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Memulihkan...
              </>
            ) : (
              <>
                <RotateCcw className="w-4 h-4 mr-2" />
                Pulihkan Data
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

interface PermanentDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: ExamSession | null;
  onConfirm: () => void;
  isLoading: boolean;
}

export const PermanentDeleteDialog = ({
  open,
  onOpenChange,
  session,
  onConfirm,
  isLoading,
}: PermanentDeleteDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="w-5 h-5" />
            Hapus Permanen
          </DialogTitle>
          <DialogDescription>
            Anda akan menghapus permanen data <strong>{session?.name}</strong>. 
            <span className="font-semibold text-destructive"> Tindakan ini TIDAK dapat dibatalkan!</span>
          </DialogDescription>
        </DialogHeader>
        
        {session && (
          <div className="bg-red-50 p-3 rounded-md text-sm space-y-1 border border-red-200">
            <p><strong>Nama:</strong> {session.name}</p>
            <p><strong>Status:</strong> {session.status}</p>
            <p><strong>Skor:</strong> TWK:{session.twk_score} TIU:{session.tiu_score} TKP:{session.tkp_score}</p>
            <p><strong>Total:</strong> {session.total_score}</p>
          </div>
        )}
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Batal
          </Button>
          <Button 
            variant="destructive"
            onClick={onConfirm} 
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Menghapus...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4 mr-2" />
                Hapus Permanen
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
