export interface ColorAnalysis {
  hex: string;
  family: string;
  percentage: number;
  hue: number;
  saturation: number;
  lightness: number;
}

export interface ColorTheoryBreakdown {
  dominant: ColorAnalysis[];
  primary: ColorAnalysis[];
  secondary: ColorAnalysis[];
  accents: ColorAnalysis[];
}

export function hexToHsl(hex: string): { h: number; s: number; l: number } {
  let cleanHex = hex.replace('#', '');
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map(c => c + c).join('');
  }
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

export function getColorFamily(hex: string): string {
  const { h, s, l } = hexToHsl(hex);

  if (l < 15) return 'Deep Slate';
  if (l > 88 && s < 15) return 'Light Neutral';
  if (s < 12) return l > 50 ? 'Cool Gray' : 'Warm Gray';

  if (h >= 345 || h < 15) return 'Crimson / Red';
  if (h >= 15 && h < 45) return 'Warm Orange';
  if (h >= 45 && h < 70) return 'Gold / Yellow';
  if (h >= 70 && h < 160) return 'Emerald / Green';
  if (h >= 160 && h < 200) return 'Cyan / Teal';
  if (h >= 200 && h < 260) return 'Cool Blue';
  if (h >= 260 && h < 310) return 'Violet / Purple';
  if (h >= 310 && h < 345) return 'Magenta / Pink';

  return 'Harmonic Tone';
}

export function analyzePalette(palette?: string[]): ColorTheoryBreakdown {
  if (!palette || palette.length === 0) {
    return { dominant: [], primary: [], secondary: [], accents: [] };
  }

  // Generate mock area percentages based on palette ordering & saturation
  const percentages = [50, 25, 15, 10];

  const analyzed: ColorAnalysis[] = palette.slice(0, 6).map((hex, idx) => {
    const { h, s, l } = hexToHsl(hex);
    const family = getColorFamily(hex);
    const percentage = percentages[idx] || Math.max(5, Math.round(100 / palette.length));
    return { hex, family, percentage, hue: h, saturation: s, lightness: l };
  });

  // Categorize based on lightness & saturation (color theory)
  const dominant = analyzed.slice(0, 1);
  const primary = analyzed.filter((c, i) => i === 1 || (c.saturation < 40 && i > 0)).slice(0, 2);
  const secondary = analyzed.filter((c, i) => i > 1 && c.saturation >= 30 && c.saturation < 70);
  const accents = analyzed.filter((c, i) => i > 0 && c.saturation >= 70);

  return {
    dominant: dominant.length > 0 ? dominant : analyzed.slice(0, 1),
    primary: primary.length > 0 ? primary : (analyzed[1] ? [analyzed[1]] : []),
    secondary: secondary.length > 0 ? secondary : (analyzed[2] ? [analyzed[2]] : []),
    accents: accents.length > 0 ? accents : (analyzed[3] ? [analyzed[3]] : []),
  };
}
