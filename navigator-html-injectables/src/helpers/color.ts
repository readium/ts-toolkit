// Lazy canvas initialization
let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;

// Default color for failed conversions
const DEFAULT_COLOR = { r: 255, g: 255, b: 255, a: 1 };

// Cache for computed color conversions
const colorCache = new Map<string, { r: number; g: number; b: number; a: number; } | null>();

const getCanvasContext = () => {
  if (!canvas) {
    canvas = document.createElement("canvas");
    ctx = canvas.getContext("2d");
  }
  return ctx;
};

export const colorToRgba = (color: string): { r: number; g: number; b: number; a: number; } => {
  // Check cache first
  const cached = colorCache.get(color);
  if (cached !== undefined) {
    if (cached === null) {
      return DEFAULT_COLOR; // Return default white for previously failed colors
    }
    return cached;
  }

  // Use Canvas API to convert any CSS color to “standardized” format
  const context = getCanvasContext();
  let computedColor = color;
  
  if (context) {
    context.fillStyle = color;
    computedColor = context.fillStyle;
  }

  // Parse the computed color value from canvas
  if (computedColor.startsWith("rgb")) {
    // Regex that handles both comma and space separators, slash for alpha
    const rgba = computedColor.match(/rgba?\(([\d.]+%?)[,\s]+([\d.]+%?)[,\s]+([\d.]+%?)(?:[\/,]\s*([\d.]+%?))?\)/);

    if (rgba) {
      const parseValue = (val: string): number => {
        if (val.endsWith("%")) {
          return Math.round(parseFloat(val) * 2.55); // Convert percentage to 0-255
        }
        return parseFloat(val);
      };
      
      const parseAlpha = (val: string): number => {
        if (val.endsWith("%")) {
          return parseFloat(val) / 100; // Convert percentage to 0-1
        }
        return parseFloat(val);
      };
      
      const result = {
        r: parseValue(rgba[1]),  // 0-255
        g: parseValue(rgba[2]),  // 0-255
        b: parseValue(rgba[3]),  // 0-255
        a: rgba[4] ? parseAlpha(rgba[4]) : 1,  // 0-1
      };
      
      // Cache the result for future use
      colorCache.set(color, result);
      return result;
    }
  } else if (computedColor.startsWith("#")) {
    const hex = computedColor.slice(1);
    let result;
    
    if (hex.length === 3 || hex.length === 4) {
      result = {
        r: parseInt(hex[0] + hex[0], 16),  // 0-255
        g: parseInt(hex[1] + hex[1], 16),  // 0-255
        b: parseInt(hex[2] + hex[2], 16),  // 0-255
        a: hex.length === 4 ? parseInt(hex[3] + hex[3], 16) / 255 : 1,  // 0-1
      };
    } else if (hex.length === 6 || hex.length === 8) {
      result = {
        r: parseInt(hex[0] + hex[1], 16),  // 0-255
        g: parseInt(hex[2] + hex[3], 16),  // 0-255
        b: parseInt(hex[4] + hex[5], 16),  // 0-255
        a: hex.length === 8 ? parseInt(hex[6] + hex[7], 16) / 255 : 1,  // 0-1
      };
    } else {
      // Invalid hex length, cache null and return default
      colorCache.set(color, null);
      return DEFAULT_COLOR;
    }
    
    // Cache the result for future use
    colorCache.set(color, result);
    return result;
  }
  
  // If we couldn't parse the color, warn and return default
  console.warn(`Could not parse color format: ${color}. Falling back to ${DEFAULT_COLOR} to check contrast. Please make sure your color value can be computed to HEX or RGB(A) format.`);
  
  // Cache null to avoid repeated warnings + entire conversion process
  colorCache.set(color, null);
  return DEFAULT_COLOR;
};

const toLinear = (c: number): number => {
  const normalized = c / 255;
  return normalized <= 0.03928 
    ? normalized / 12.92 
    : Math.pow((normalized + 0.055) / 1.055, 2.4);
};

export const getLuminance = (color: { r: number; g: number; b: number; a?: number }): number => {
  // Convert sRGB to linear RGB and apply WCAG 2.2 formula
  const r = toLinear(color.r);
  const g = toLinear(color.g);
  const b = toLinear(color.b);

  // WCAG 2.2 relative luminance formula (returns 0-1)
  // Note: Alpha is ignored for contrast calculations. WCAG 2.2 only defines contrast for opaque colors,
  // and semi-transparent colors have a range of possible contrast ratios depending on background.
  // For text readability decisions, we use the base color as the most conservative approach.
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance;
};

export const checkContrast = (color1: string, color2: string): number => {
  const luminance1 = getLuminance(colorToRgba(color1));
  const luminance2 = getLuminance(colorToRgba(color2));

  // Ensure luminance1 is the lighter color
  const l1 = Math.max(luminance1, luminance2);
  const l2 = Math.min(luminance1, luminance2);

  // WCAG 2.2 contrast ratio formula
  return (l1 + 0.05) / (l2 + 0.05);
};

export const isDarkColor = (color: string): boolean => {
  const contrastWithWhite = checkContrast(color, "#FFFFFF");
  const contrastWithBlack = checkContrast(color, "#000000");
  return contrastWithWhite > contrastWithBlack;
};

export const isLightColor = (color: string): boolean => !isDarkColor(color);

export const getContrastingTextColor = (backgroundColor: string): "black" | "white" => {
  return isDarkColor(backgroundColor) ? "white" : "black";
};