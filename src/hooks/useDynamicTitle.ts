import { useEffect } from 'react';
import { usePageConfig } from '@/hooks/useEditableConfig';

export function useDynamicTitle() {
  const { get, isLoading } = usePageConfig(['branding_site_title']);

  useEffect(() => {
    if (isLoading) return;

    const title = get('branding_site_title');
    if (title) {
      document.title = title;
    }
  }, [isLoading, get]);
}
