import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Package, Plus, Trash2, Edit2, FileText, Upload, Eye, RefreshCw, Star, Copy, CheckCircle, Loader2, List } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import ManualQuestionInput from './ManualQuestionInput';
import WordQuestionImport from './WordQuestionImport';
import QuestionViewer from './QuestionViewer';
import PackageExport from './PackageExport';
import PackageImport from './PackageImport';

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

interface ExamPackageManagementProps {
  logAuditAction: (action: string, targetId: string | null, targetName: string | null, details: string) => Promise<void>;
}

const ExamPackageManagement = ({ logAuditAction }: ExamPackageManagementProps) => {
  const [packages, setPackages] = useState<ExamPackage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPackage, setSelectedPackage] = useState<ExamPackage | null>(null);
  
  // Create package dialog
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newPackageName, setNewPackageName] = useState('');
  const [newPackageDesc, setNewPackageDesc] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  
  // Edit package dialog
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editPackage, setEditPackage] = useState<ExamPackage | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  
  // Clone package dialog
  const [cloneDialogOpen, setCloneDialogOpen] = useState(false);
  const [packageToClone, setPackageToClone] = useState<ExamPackage | null>(null);
  const [cloneName, setCloneName] = useState('');
  const [isCloning, setIsCloning] = useState(false);
  
  // Add questions dialog
  const [addQuestionsDialogOpen, setAddQuestionsDialogOpen] = useState(false);
  const [activeInputTab, setActiveInputTab] = useState('manual');
  
  // View questions dialog
  const [viewQuestionsDialogOpen, setViewQuestionsDialogOpen] = useState(false);
  const [viewingPackage, setViewingPackage] = useState<ExamPackage | null>(null);

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('exam_packages')
        .select('*')
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPackages(data || []);
    } catch (err) {
      console.error('Error fetching packages:', err);
      toast.error('Gagal memuat daftar paket ujian');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePackage = async () => {
    if (!newPackageName.trim()) {
      toast.error('Nama paket harus diisi');
      return;
    }

    setIsCreating(true);
    try {
      const { data, error } = await supabase
        .from('exam_packages')
        .insert({
          name: newPackageName.trim(),
          description: newPackageDesc.trim() || null,
        })
        .select()
        .single();

      if (error) throw error;

      await logAuditAction('CREATE_PACKAGE', data.id, data.name, `Paket ujian baru: ${data.name}`);
      toast.success(`Paket "${data.name}" berhasil dibuat`);
      setCreateDialogOpen(false);
      setNewPackageName('');
      setNewPackageDesc('');
      fetchPackages();
    } catch (err) {
      console.error('Error creating package:', err);
      toast.error('Gagal membuat paket ujian');
    } finally {
      setIsCreating(false);
    }
  };

  const handleEditPackage = async () => {
    if (!editPackage || !editName.trim()) {
      toast.error('Nama paket harus diisi');
      return;
    }

    setIsEditing(true);
    try {
      const { error } = await supabase
        .from('exam_packages')
        .update({
          name: editName.trim(),
          description: editDesc.trim() || null,
        })
        .eq('id', editPackage.id);

      if (error) throw error;

      await logAuditAction('UPDATE_PACKAGE', editPackage.id, editName.trim(), `Nama sebelumnya: ${editPackage.name}`);
      toast.success('Paket ujian berhasil diperbarui');
      setEditDialogOpen(false);
      setEditPackage(null);
      fetchPackages();
    } catch (err) {
      console.error('Error updating package:', err);
      toast.error('Gagal memperbarui paket ujian');
    } finally {
      setIsEditing(false);
    }
  };

  const handleDeletePackage = async (pkg: ExamPackage) => {
    if (pkg.is_default) {
      toast.error('Paket default tidak dapat dihapus');
      return;
    }

    try {
      const { error } = await supabase
        .from('exam_packages')
        .delete()
        .eq('id', pkg.id);

      if (error) throw error;

      await logAuditAction('DELETE_PACKAGE', pkg.id, pkg.name, `Total soal: ${pkg.total_questions}`);
      toast.success(`Paket "${pkg.name}" berhasil dihapus`);
      fetchPackages();
    } catch (err) {
      console.error('Error deleting package:', err);
      toast.error('Gagal menghapus paket ujian');
    }
  };

  const handleSetActive = async (pkg: ExamPackage, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('exam_packages')
        .update({ is_active: isActive })
        .eq('id', pkg.id);

      if (error) throw error;

      await logAuditAction('TOGGLE_PACKAGE', pkg.id, pkg.name, `Status aktif: ${isActive}`);
      toast.success(`Paket "${pkg.name}" ${isActive ? 'diaktifkan' : 'dinonaktifkan'}`);
      fetchPackages();
    } catch (err) {
      console.error('Error toggling package:', err);
      toast.error('Gagal mengubah status paket');
    }
  };

  const handleClonePackage = async () => {
    if (!packageToClone || !cloneName.trim()) {
      toast.error('Nama paket harus diisi');
      return;
    }

    setIsCloning(true);
    try {
      // 1. Create new package
      const { data: newPkg, error: createError } = await supabase
        .from('exam_packages')
        .insert({
          name: cloneName.trim(),
          description: packageToClone.description ? `Clone dari: ${packageToClone.name}. ${packageToClone.description}` : `Clone dari: ${packageToClone.name}`,
          twk_count: packageToClone.twk_count,
          tiu_count: packageToClone.tiu_count,
          tkp_count: packageToClone.tkp_count,
          total_questions: packageToClone.total_questions,
        })
        .select()
        .single();

      if (createError) throw createError;

      // 2. Copy all questions from source package
      const { data: questions, error: fetchError } = await supabase
        .from('questions')
        .select('*')
        .eq('package_id', packageToClone.id);

      if (fetchError) throw fetchError;

      if (questions && questions.length > 0) {
        const clonedQuestions = questions.map(q => ({
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
          .insert(clonedQuestions);

        if (insertError) throw insertError;
      }

      await logAuditAction(
        'CLONE_PACKAGE',
        newPkg.id,
        newPkg.name,
        `Clone dari ${packageToClone.name} (${packageToClone.total_questions} soal)`
      );

      toast.success(`Paket "${cloneName}" berhasil dibuat dari "${packageToClone.name}"`);
      setCloneDialogOpen(false);
      setPackageToClone(null);
      setCloneName('');
      fetchPackages();
    } catch (err) {
      console.error('Error cloning package:', err);
      toast.error('Gagal menduplikasi paket');
    } finally {
      setIsCloning(false);
    }
  };

  const openCloneDialog = (pkg: ExamPackage) => {
    setPackageToClone(pkg);
    setCloneName(`${pkg.name} (Copy)`);
    setCloneDialogOpen(true);
  };

  const openAddQuestions = (pkg: ExamPackage) => {
    setSelectedPackage(pkg);
    setAddQuestionsDialogOpen(true);
  };

  const openEditDialog = (pkg: ExamPackage) => {
    setEditPackage(pkg);
    setEditName(pkg.name);
    setEditDesc(pkg.description || '');
    setEditDialogOpen(true);
  };

  const openViewQuestions = (pkg: ExamPackage) => {
    setViewingPackage(pkg);
    setViewQuestionsDialogOpen(true);
  };

  const handleQuestionsAdded = () => {
    setAddQuestionsDialogOpen(false);
    fetchPackages();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Manajemen Paket Ujian
              </CardTitle>
              <CardDescription>
                Kelola paket soal ujian - buat paket baru, tambah soal manual atau import dari Word
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={fetchPackages} disabled={isLoading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <PackageImport logAuditAction={logAuditAction} onSuccess={fetchPackages} />
              <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Buat Paket Baru
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Buat Paket Ujian Baru</DialogTitle>
                    <DialogDescription>
                      Buat paket soal baru untuk mengelola set soal yang berbeda
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="packageName">Nama Paket *</Label>
                      <Input
                        id="packageName"
                        placeholder="Contoh: Paket Tryout 2"
                        value={newPackageName}
                        onChange={(e) => setNewPackageName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="packageDesc">Deskripsi (opsional)</Label>
                      <Textarea
                        id="packageDesc"
                        placeholder="Deskripsi singkat paket soal..."
                        value={newPackageDesc}
                        onChange={(e) => setNewPackageDesc(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                      Batal
                    </Button>
                    <Button onClick={handleCreatePackage} disabled={isCreating}>
                      {isCreating ? 'Membuat...' : 'Buat Paket'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Memuat daftar paket...
            </div>
          ) : packages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Belum ada paket ujian
            </div>
          ) : (
            <div className="grid gap-4">
              {packages.map((pkg) => (
                <div
                  key={pkg.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      {pkg.is_default && (
                        <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                      )}
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          {pkg.name}
                          {pkg.is_default && (
                            <Badge variant="secondary" className="text-xs">Default</Badge>
                          )}
                          {!pkg.is_active && (
                            <Badge variant="outline" className="text-xs text-muted-foreground">Nonaktif</Badge>
                          )}
                        </div>
                        {pkg.description && (
                          <p className="text-sm text-muted-foreground">{pkg.description}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="flex gap-2 text-sm">
                      <Badge variant="outline">TWK: {pkg.twk_count}</Badge>
                      <Badge variant="outline">TIU: {pkg.tiu_count}</Badge>
                      <Badge variant="outline">TKP: {pkg.tkp_count}</Badge>
                      <Badge>Total: {pkg.total_questions}</Badge>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openViewQuestions(pkg)}
                        title="Lihat Soal"
                      >
                        <List className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openAddQuestions(pkg)}
                        title="Tambah Soal"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                      <PackageExport package_={pkg} logAuditAction={logAuditAction} />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openCloneDialog(pkg)}
                        title="Duplikasi Paket"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(pkg)}
                        title="Edit Paket"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      {!pkg.is_default && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleSetActive(pkg, !pkg.is_active)}
                            title={pkg.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                            className={pkg.is_active ? 'text-primary' : ''}
                          >
                            {pkg.is_active ? (
                              <CheckCircle className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4 text-muted-foreground" />
                            )}
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" title="Hapus Paket">
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Hapus Paket Ujian?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Paket "{pkg.name}" dan semua {pkg.total_questions} soal di dalamnya akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Batal</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeletePackage(pkg)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Hapus
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Package Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Paket Ujian</DialogTitle>
            <DialogDescription>
              Perbarui informasi paket ujian
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editName">Nama Paket *</Label>
              <Input
                id="editName"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editDesc">Deskripsi (opsional)</Label>
              <Textarea
                id="editDesc"
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleEditPackage} disabled={isEditing}>
              {isEditing ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clone Package Dialog */}
      <Dialog open={cloneDialogOpen} onOpenChange={setCloneDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Duplikasi Paket Ujian</DialogTitle>
            <DialogDescription>
              Buat salinan dari paket "{packageToClone?.name}" beserta semua {packageToClone?.total_questions} soalnya
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="cloneName">Nama Paket Baru *</Label>
              <Input
                id="cloneName"
                placeholder="Contoh: Paket Tryout 2 (Variasi)"
                value={cloneName}
                onChange={(e) => setCloneName(e.target.value)}
              />
            </div>
            {packageToClone && (
              <div className="p-3 bg-muted rounded-lg text-sm">
                <p className="font-medium mb-2">Soal yang akan diduplikasi:</p>
                <div className="flex gap-2">
                  <Badge variant="outline">TWK: {packageToClone.twk_count}</Badge>
                  <Badge variant="outline">TIU: {packageToClone.tiu_count}</Badge>
                  <Badge variant="outline">TKP: {packageToClone.tkp_count}</Badge>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloneDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleClonePackage} disabled={isCloning}>
              {isCloning ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Menduplikasi...
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  Duplikasi
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Questions Dialog */}
      <Dialog open={addQuestionsDialogOpen} onOpenChange={setAddQuestionsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tambah Soal ke "{selectedPackage?.name}"</DialogTitle>
            <DialogDescription>
              Pilih metode input soal: manual satu per satu atau import dari file Word
            </DialogDescription>
          </DialogHeader>
          
          <Tabs value={activeInputTab} onValueChange={setActiveInputTab} className="mt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="manual" className="gap-2">
                <FileText className="w-4 h-4" />
                Input Manual
              </TabsTrigger>
              <TabsTrigger value="import" className="gap-2">
                <Upload className="w-4 h-4" />
                Import Word
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="manual" className="mt-4">
              {selectedPackage && (
                <ManualQuestionInput
                  packageId={selectedPackage.id}
                  packageName={selectedPackage.name}
                  onSuccess={handleQuestionsAdded}
                  logAuditAction={logAuditAction}
                />
              )}
            </TabsContent>
            
            <TabsContent value="import" className="mt-4">
              {selectedPackage && (
                <WordQuestionImport
                  packageId={selectedPackage.id}
                  packageName={selectedPackage.name}
                  onSuccess={handleQuestionsAdded}
                  logAuditAction={logAuditAction}
                />
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* View Questions Dialog */}
      <Dialog open={viewQuestionsDialogOpen} onOpenChange={setViewQuestionsDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <List className="w-5 h-5" />
              Daftar Soal - {viewingPackage?.name}
            </DialogTitle>
            <DialogDescription>
              Lihat, edit, atau hapus soal individual dalam paket ini
            </DialogDescription>
          </DialogHeader>
          
          {viewingPackage && (
            <QuestionViewer
              packageId={viewingPackage.id}
              packageName={viewingPackage.name}
              logAuditAction={logAuditAction}
              onQuestionsChanged={fetchPackages}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ExamPackageManagement;
