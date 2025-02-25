export const colorToRgba = (color: string): { r: number; g: number; b: number; a: number; } => {
  if (color.startsWith("rgb")) {
    const rgb = color.match(/rgb\((\d+),\s(\d+),\s(\d+)(?:,\s(\d+))?\)/);
    if (rgb) {
      return {
        r: parseInt(rgb[1], 10),
        g: parseInt(rgb[2], 10),
        b: parseInt(rgb[3], 10),
        a: rgb[4] ? parseInt(rgb[4], 10) / 255 : 1,
      };
    }
  } else if (color.startsWith("#")) {
    const hex = color.slice(1);
    if (hex.length === 3 || hex.length === 4) {
      return {
        r: parseInt(hex[0] + hex[0], 16) / 255,
        g: parseInt(hex[1] + hex[1], 16) / 255,
        b: parseInt(hex[2] + hex[2], 16) / 255,
        a: hex.length === 4 ? parseInt(hex[3] + hex[3], 16) / 255 : 1,
      };
    } else if (hex.length === 6 || hex.length === 8) {
      return {
        r: parseInt(hex[0] + hex[1], 16) / 255,
        g: parseInt(hex[2] + hex[3], 16) / 255,
        b: parseInt(hex[4] + hex[5], 16) / 255,
        a: hex.length === 8 ? parseInt(hex[6] + hex[7], 16) / 255 : 1,
      };
    }
  }
  return { r: 0, g: 0, b: 0, a: 1 };
};

export const isDarkColor = (color: string): boolean => {
  const rgba = colorToRgba(color);
  const luminance = 0.2126 * rgba.r * rgba.a + 0.7152 * rgba.g * rgba.a + 0.0722 * rgba.b * rgba.a;
  return luminance < 128;
};

export const isLightColor = (color: string): boolean => !isDarkColor(color);

export const checkContrast = (color1: string, color2: string): number => {
  const rgba1 = colorToRgba(color1);
  const rgba2 = colorToRgba(color2);
  const lum1 = 0.2126 * rgba1.r * rgba1.a + 0.7152 * rgba1.g * rgba1.a + 0.0722 * rgba1.b * rgba1.a;
  const lum2 = 0.2126 * rgba2.r * rgba2.a + 0.7152 * rgba2.g * rgba2.a + 0.0722 * rgba2.b * rgba2.a;
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
};

export const ensureContrast = (color1: string, color2: string, contrast: number = 4.5): string => {
  const c1 = colorToRgba(color1);
  const contrastRatio = checkContrast(color1, color2);
  if (contrastRatio < contrast) {
    const delta = (contrast - contrastRatio) / (contrastRatio + 0.05);
    const correction = delta * 255;
    const r = Math.max(0, Math.min(255, c1.r + correction));
    const g = Math.max(0, Math.min(255, c1.g + correction));
    const b = Math.max(0, Math.min(255, c1.b + correction));
    return `rgb(${r}, ${g}, ${b})`;
  }
  return `rgb(${c1.r}, ${c1.g}, ${c1.b})`;
};
