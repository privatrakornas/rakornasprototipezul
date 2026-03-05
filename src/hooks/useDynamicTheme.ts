import { useEffect } from 'react';
import { usePageConfig } from '@/hooks/useEditableConfig';

function hexToHSL(hex: string): string | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;

  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;

  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export function useDynamicTheme() {
  const { get, isLoading } = usePageConfig([
    'branding_theme_mode',
    'branding_primary_color',
    'branding_accent_color',
  ]);

  useEffect(() => {
    if (isLoading) return;

    const mode = get('branding_theme_mode') || 'light';
    const root = document.documentElement;

    if (mode === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    const primaryHex = get('branding_primary_color');
    const accentHex = get('branding_accent_color');

    if (primaryHex) {
      const hsl = hexToHSL(primaryHex);
      if (hsl) {
        root.style.setProperty('--primary', hsl);
        root.style.setProperty('--ring', hsl);
        root.style.setProperty('--maroon', hsl);
      }
    }

    if (accentHex) {
      const hsl = hexToHSL(accentHex);
      if (hsl) {
        root.style.setProperty('--accent', hsl);
        root.style.setProperty('--gold', hsl);
      }
    }
  }, [isLoading, get]);
}
