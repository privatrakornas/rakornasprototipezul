import { useEffect } from 'react';
import { usePageConfig } from '@/hooks/useEditableConfig';

export function useDynamicTheme() {
  const { get, isLoading } = usePageConfig(['branding_theme_mode']);

  useEffect(() => {
    if (isLoading) return;

    const mode = get('branding_theme_mode') || 'light';
    const root = document.documentElement;

    if (mode === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [isLoading, get]);
}
