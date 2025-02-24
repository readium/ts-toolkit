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
    if (hex.length === 3) {
      return {
        r: parseInt(hex[0] + hex[0], 16) / 255,
        g: parseInt(hex[1] + hex[1], 16) / 255,
        b: parseInt(hex[2] + hex[2], 16) / 255,
        a: 1,
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