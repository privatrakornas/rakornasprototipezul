import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SocialMediaLink {
  id: string;
  platform: string;
  username: string;
  link: string;
  is_visible: boolean;
  display_order: number;
}

export const useSocialMediaLinks = () => {
  const [links, setLinks] = useState<SocialMediaLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLinks = async () => {
    const { data, error } = await supabase
      .from('social_media_links')
      .select('*')
      .order('display_order', { ascending: true });
    
    if (!error && data) {
      setLinks(data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchLinks();

    const channel = supabase
      .channel('social_media_links_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'social_media_links' }, () => {
        fetchLinks();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const updateLink = async (id: string, updates: Partial<SocialMediaLink>) => {
    const { error } = await supabase
      .from('social_media_links')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);
    
    if (!error) await fetchLinks();
    return { error };
  };

  return { links, isLoading, updateLink, refetch: fetchLinks };
};
