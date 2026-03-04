import { useEffect } from 'react';
import { usePageConfig } from '@/hooks/useEditableConfig';

export function useDynamicFavicon() {
  const { get, isLoading } = usePageConfig(['branding_favicon_url']);

  useEffect(() => {
    if (isLoading) return;

    const faviconUrl = get('branding_favicon_url');
    if (!faviconUrl) return;

    // Update or create favicon link element
    let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = faviconUrl;
    link.type = faviconUrl.endsWith('.svg') ? 'image/svg+xml' : 'image/png';
  }, [isLoading, get]);
}
