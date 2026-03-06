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

const GOOGLE_FONTS = [
  'Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Poppins',
  'Playfair Display', 'Merriweather', 'Raleway', 'Nunito', 'Source Sans 3',
  'PT Sans', 'Oswald', 'Noto Sans', 'Ubuntu', 'Fira Sans',
];

function loadGoogleFont(fontFamily: string) {
  const id = `gfont-${fontFamily.replace(/\s+/g, '-')}`;
  if (document.getElementById(id)) return;
  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontFamily)}:wght@300;400;500;600;700;800&display=swap`;
  document.head.appendChild(link);
}

function loadGoogleFontUrl(url: string) {
  const id = `gfont-custom-${url.replace(/[^a-z0-9]/gi, '-').substring(0, 40)}`;
  if (document.getElementById(id)) return;
  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = url;
  document.head.appendChild(link);
}

function extractFontNameFromUrl(url: string): string | null {
  const match = url.match(/family=([^&:]+)/);
  if (!match) return null;
  return decodeURIComponent(match[1].replace(/\+/g, ' '));
}

export { GOOGLE_FONTS, loadGoogleFontUrl, extractFontNameFromUrl };

export function useDynamicTheme() {
  const { get, isLoading } = usePageConfig([
    'branding_theme_mode',
    'branding_primary_color',
    'branding_accent_color',
    'branding_font_heading',
    'branding_font_body',
    'branding_font_heading_url',
    'branding_font_body_url',
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

    // Fonts - support custom URL or dropdown selection
    const headingFontUrl = get('branding_font_heading_url');
    const bodyFontUrl = get('branding_font_body_url');
    let headingFont = get('branding_font_heading') || 'Inter';
    let bodyFont = get('branding_font_body') || 'Inter';

    if (headingFontUrl) {
      loadGoogleFontUrl(headingFontUrl);
      const extracted = extractFontNameFromUrl(headingFontUrl);
      if (extracted) headingFont = extracted;
    } else if (headingFont !== 'Inter') {
      loadGoogleFont(headingFont);
    }

    if (bodyFontUrl) {
      loadGoogleFontUrl(bodyFontUrl);
      const extracted = extractFontNameFromUrl(bodyFontUrl);
      if (extracted) bodyFont = extracted;
    } else if (bodyFont !== 'Inter' && bodyFont !== headingFont) {
      loadGoogleFont(bodyFont);
    }

    root.style.setProperty('--font-heading', `"${headingFont}", sans-serif`);
    root.style.setProperty('--font-body', `"${bodyFont}", sans-serif`);
    document.body.style.fontFamily = `"${bodyFont}", sans-serif`;

    // Apply heading font to h1-h6
    let style = document.getElementById('dynamic-font-style');
    if (!style) {
      style = document.createElement('style');
      style.id = 'dynamic-font-style';
      document.head.appendChild(style);
    }
    style.textContent = `h1,h2,h3,h4,h5,h6,.font-heading{font-family:var(--font-heading)!important}`;
  }, [isLoading, get]);
}
