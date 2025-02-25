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

export const getLuminance = (color: { r: number; g: number; b: number; a: number }): number => {
  return 0.2126 * color.r * color.a + 0.7152 * color.g * color.a + 0.0722 * color.b * color.a;
}

export const isDarkColor = (color: string): boolean => {
  const rgba = colorToRgba(color);
  const luminance = getLuminance(rgba);
  return luminance < 128;
};

export const isLightColor = (color: string): boolean => !isDarkColor(color);

export const checkContrast = (color1: string, color2: string): number => {
  const rgba1 = colorToRgba(color1);
  const rgba2 = colorToRgba(color2);
  const lum1 = getLuminance(rgba1);
  const lum2 = getLuminance(rgba2);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
};

export const ensureContrast = (color1: string, color2: string, contrast: number = 4.5): string[] => {
  const c1 = colorToRgba(color1);
  const c2 = colorToRgba(color2);
  
  const lum1 = getLuminance(c1);
  const lum2 = getLuminance(c2);
  const [darkest, brightest] = lum1 < lum2 ? [lum1, lum2] : [lum2, lum1];

  const contrastRatio = (brightest + 0.05) / (darkest + 0.05);
  if (contrastRatio >= contrast) {
    return [
      `rgba(${c1.r}, ${c1.g}, ${c1.b}, ${c1.a})`, 
      `rgba(${c2.r}, ${c2.g}, ${c2.b}, ${c2.a})`
    ];
  }

  const adjustColor = (color: { r: number; g: number; b: number; a: number }, delta: number) => ({
    r: Math.max(0, Math.min(255, color.r + delta)),
    g: Math.max(0, Math.min(255, color.g + delta)),
    b: Math.max(0, Math.min(255, color.b + delta)),
    a: color.a
  });
  
  const delta = ((contrast - contrastRatio) * 255) / (contrastRatio + 0.05);
  let correctedColor: { r: number; g: number; b: number; a: number };
  let otherColor: { r: number; g: number; b: number; a: number };
  if (lum1 < lum2) {
    correctedColor = c1;
    otherColor = c2;
  } else {
    correctedColor = c2;
    otherColor = c1;
  }

  const correctedColorAdjusted = adjustColor(correctedColor, -delta);
  const newLum = getLuminance(correctedColorAdjusted);
  const newContrastRatio = (brightest + 0.05) / (newLum + 0.05);

  if (newContrastRatio < contrast) {
    const updatedDelta = ((contrast - newContrastRatio) * 255) / (newContrastRatio + 0.05);
    const otherColorAdjusted = adjustColor(otherColor, updatedDelta);
    return [
      lum1 < lum2 
        ? `rgba(${correctedColorAdjusted.r}, ${correctedColorAdjusted.g}, ${correctedColorAdjusted.b}, ${correctedColorAdjusted.a})` 
        : `rgba(${otherColorAdjusted.r}, ${otherColorAdjusted.g}, ${otherColorAdjusted.b}, ${otherColorAdjusted.a})`,
      lum1 < lum2 
        ? `rgba(${otherColorAdjusted.r}, ${otherColorAdjusted.g}, ${otherColorAdjusted.b}, ${otherColorAdjusted.a})` 
        : `rgba(${correctedColorAdjusted.r}, ${correctedColorAdjusted.g}, ${correctedColorAdjusted.b}, ${correctedColorAdjusted.a})`,
    ];
  }

  return [
    lum1 < lum2
      ? `rgba(${correctedColorAdjusted.r}, ${correctedColorAdjusted.g}, ${correctedColorAdjusted.b}, ${correctedColorAdjusted.a})` 
      : `rgba(${otherColor.r}, ${otherColor.g}, ${otherColor.b}, ${otherColor.a})`,
    lum1 < lum2
      ? `rgba(${otherColor.r}, ${otherColor.g}, ${otherColor.b}, ${otherColor.a})` 
      : `rgba(${correctedColorAdjusted.r}, ${correctedColorAdjusted.g}, ${correctedColorAdjusted.b}, ${correctedColorAdjusted.a})`,
  ];
};
