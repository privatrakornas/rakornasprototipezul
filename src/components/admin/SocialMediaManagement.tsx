import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Loader2, Save, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { useSocialMediaLinks } from '@/hooks/useSocialMediaLinks';

const PLATFORM_INFO: Record<string, { label: string; linkPlaceholder: string; usernamePlaceholder: string; color: string }> = {
  instagram: { label: 'Instagram', linkPlaceholder: 'https://instagram.com/username', usernamePlaceholder: '@username', color: 'text-pink-600' },
  telegram: { label: 'Telegram', linkPlaceholder: 'https://t.me/username', usernamePlaceholder: '@username', color: 'text-blue-500' },
  tiktok: { label: 'TikTok', linkPlaceholder: 'https://tiktok.com/@username', usernamePlaceholder: '@username', color: 'text-foreground' },
  whatsapp: { label: 'WhatsApp', linkPlaceholder: 'https://wa.me/6281234567890', usernamePlaceholder: '081234567890', color: 'text-green-600' },
  youtube: { label: 'YouTube', linkPlaceholder: 'https://youtube.com/@channel', usernamePlaceholder: '@channel', color: 'text-red-600' },
  facebook: { label: 'Facebook', linkPlaceholder: 'https://facebook.com/page', usernamePlaceholder: 'Page Name', color: 'text-blue-700' },
};

const SocialMediaManagement = () => {
  const { links, isLoading, updateLink } = useSocialMediaLinks();
  const [savingId, setSavingId] = useState<string | null>(null);
  const [editState, setEditState] = useState<Record<string, { username: string; link: string; is_visible: boolean }>>({});

  const getEditValue = (link: typeof links[0]) => {
    return editState[link.id] || { username: link.username, link: link.link, is_visible: link.is_visible };
  };

  const setField = (id: string, field: string, value: string | boolean) => {
    const current = links.find(l => l.id === id);
    if (!current) return;
    setEditState(prev => ({
      ...prev,
      [id]: { ...getEditValue(current), [field]: value },
    }));
  };

  const handleSave = async (link: typeof links[0]) => {
    const values = getEditValue(link);
    setSavingId(link.id);
    const { error } = await updateLink(link.id, values);
    setSavingId(null);
    if (error) {
      toast.error('Gagal menyimpan');
    } else {
      toast.success(`${PLATFORM_INFO[link.platform]?.label || link.platform} berhasil diperbarui`);
      setEditState(prev => { const n = { ...prev }; delete n[link.id]; return n; });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Share2 className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-lg">Manajemen Media Sosial</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Kelola link media sosial yang ditampilkan di halaman Login, Hasil Ujian, dan Leaderboard.
        </p>

        <div className="space-y-4">
          {links.map((link) => {
            const info = PLATFORM_INFO[link.platform] || { label: link.platform, linkPlaceholder: '', usernamePlaceholder: '', color: '' };
            const values = getEditValue(link);
            const hasChanges = values.username !== link.username || values.link !== link.link || values.is_visible !== link.is_visible;

            return (
              <div key={link.id} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className={`font-semibold text-sm ${info.color}`}>{info.label}</span>
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`visible-${link.id}`} className="text-xs text-muted-foreground">Tampilkan</Label>
                    <Switch
                      id={`visible-${link.id}`}
                      checked={values.is_visible}
                      onCheckedChange={(v) => setField(link.id, 'is_visible', v)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Username / Nomor</Label>
                    <Input
                      value={values.username}
                      onChange={(e) => setField(link.id, 'username', e.target.value)}
                      placeholder={info.usernamePlaceholder}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Link URL</Label>
                    <Input
                      value={values.link}
                      onChange={(e) => setField(link.id, 'link', e.target.value)}
                      placeholder={info.linkPlaceholder}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
                {hasChanges && (
                  <div className="flex justify-end">
                    <Button size="sm" className="h-7 text-xs gap-1" onClick={() => handleSave(link)} disabled={savingId === link.id}>
                      {savingId === link.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                      Simpan
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
};

export default SocialMediaManagement;
