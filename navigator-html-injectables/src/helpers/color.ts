export const colorToRgba = (color: string): { r: number; g: number; b: number; a: number; } => {
  if (color.startsWith("rgb")) {
    const rgb = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/i);
    if (rgb) {
      return {
        r: parseInt(rgb[1], 10),  // 0-255
        g: parseInt(rgb[2], 10),  // 0-255
        b: parseInt(rgb[3], 10),  // 0-255
        a: rgb[4] ? parseFloat(rgb[4]) : 1,  // 0-1
      };
    }
  } else if (color.startsWith("#")) {
    const hex = color.slice(1);
    if (hex.length === 3 || hex.length === 4) {
      return {
        r: parseInt(hex[0] + hex[0], 16),  // 0-255
        g: parseInt(hex[1] + hex[1], 16),  // 0-255
        b: parseInt(hex[2] + hex[2], 16),  // 0-255
        a: hex.length === 4 ? parseInt(hex[3] + hex[3], 16) / 255 : 1,  // 0-1
      };
    } else if (hex.length === 6 || hex.length === 8) {
      return {
        r: parseInt(hex[0] + hex[1], 16),  // 0-255
        g: parseInt(hex[2] + hex[3], 16),  // 0-255
        b: parseInt(hex[4] + hex[5], 16),  // 0-255
        a: hex.length === 8 ? parseInt(hex[6] + hex[7], 16) / 255 : 1,  // 0-1
      };
    }
  }
  return { r: 255, g: 255, b: 255, a: 1 };  // Default to white (255, 255, 255, 1)
};

const toLinear = (c: number): number => {
  const normalized = c / 255;
  return normalized <= 0.03928 
    ? normalized / 12.92 
    : Math.pow((normalized + 0.055) / 1.055, 2.4);
};

export const getLuminance = (color: { r: number; g: number; b: number; a?: number }): number => {
  // Convert sRGB to linear RGB and apply WCAG 2.0 formula
  const r = toLinear(color.r);
  const g = toLinear(color.g);
  const b = toLinear(color.b);

  // WCAG 2.0 relative luminance formula (returns 0-1)
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;

  // Apply alpha if provided (0-1 range)
  return color.a !== undefined ? luminance * color.a : luminance;
};

export const checkContrast = (color1: string, color2: string): number => {
  const luminance1 = getLuminance(colorToRgba(color1));
  const luminance2 = getLuminance(colorToRgba(color2));

  // Ensure luminance1 is the lighter color
  const l1 = Math.max(luminance1, luminance2);
  const l2 = Math.min(luminance1, luminance2);

  // WCAG 2.0 contrast ratio formula
  return (l1 + 0.05) / (l2 + 0.05);
};

export const isDarkColor = (color: string): boolean => {
  const contrastWithWhite = checkContrast(color, "#FFFFFF");
  const contrastWithBlack = checkContrast(color, "#000000");
  return contrastWithWhite > contrastWithBlack;
};

export const isLightColor = (color: string): boolean => !isDarkColor(color);