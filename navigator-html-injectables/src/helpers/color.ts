// Lazy canvas initialization for color conversion
let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;

// Default color for failed conversions
const DEFAULT_COLOR = { r: 255, g: 255, b: 255, a: 1 };

// Cache for computed color conversions
const colorCache = new Map<string, { r: number; g: number; b: number; a: number; } | null>();

const getCanvasContext = (): CanvasRenderingContext2D | null => {
  if (!canvas) {
    canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    ctx = canvas.getContext("2d", { willReadFrequently: true });
  }
  return ctx;
};

const isSpecialColorValue = (color: string): boolean => {
  if (!color) return true;
  
  const normalizedColor = color.trim().toLowerCase();
  
  // Check for CSS variables
  if (normalizedColor.startsWith("var(")) {
    return true;
  }
  
  // Check for CSS color keywords
  const cssKeywords = [
    "transparent",
    "currentcolor",
    "inherit",
    "initial",
    "revert",
    "unset",
    "revert-layer"
  ];
  
  if (cssKeywords.includes(normalizedColor)) {
    return true;
  }
  
  // Check for gradients
  const gradientTypes = [
    "linear-gradient",
    "radial-gradient",
    "conic-gradient",
    "repeating-linear-gradient",
    "repeating-radial-gradient",
    "repeating-conic-gradient"
  ];
  
  return gradientTypes.some(grad => normalizedColor.includes(grad));
};

const warnAboutInvalidColor = (color: string, reason: string): void => {
  console.warn(
    `[Decorator] Could not parse color: "${color}". ${reason} Falling back to ${JSON.stringify(DEFAULT_COLOR)} to compute contrast. Please use a CSS color value that can be computed to RGB(A).`
  );
};

export const colorToRgba = (
  color: string, 
  backgroundColor: string | null = null
): { r: number; g: number; b: number; a: number } => {
  // Check cache with background key if provided
  const cacheKey = backgroundColor ? `${color}|${backgroundColor}` : color;
  const cached = colorCache.get(cacheKey);
  if (cached !== undefined) {
    return cached ?? DEFAULT_COLOR;
  }

  // Check for special color values
  if (isSpecialColorValue(color)) {
    warnAboutInvalidColor(color, "Unsupported color format or special value.");
    colorCache.set(cacheKey, null);
    return DEFAULT_COLOR;
  }

  const context = getCanvasContext();
  if (!context) {
    warnAboutInvalidColor(color, "Could not get canvas context.");
    colorCache.set(cacheKey, null);
    return DEFAULT_COLOR;
  }

  // Clear the canvas
  context.clearRect(0, 0, 1, 1);
  
  try {
    // Draw background if provided
    if (backgroundColor) {
      context.fillStyle = backgroundColor;
      context.fillRect(0, 0, 1, 1);
    }
    
    // Draw the color
    context.fillStyle = color;
    context.fillRect(0, 0, 1, 1);
    
    // Get the resulting pixel data
    const [r, g, b, a] = context.getImageData(0, 0, 1, 1).data;
    
    // If the color is completely transparent, return default
    if (a === 0) {
      warnAboutInvalidColor(color, "Fully transparent color.");
      colorCache.set(cacheKey, null);
      return DEFAULT_COLOR;
    }
    
    const result = { r, g, b, a: a / 255 };
    colorCache.set(cacheKey, result);
    return result;
  } catch (error) {
    warnAboutInvalidColor(color, `Error: ${error instanceof Error ? error.message : String(error)}`);
    colorCache.set(cacheKey, null);
    return DEFAULT_COLOR;
  }
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

export const checkContrast = (
  color1: string | { r: number; g: number; b: number; a?: number },
  color2: string | { r: number; g: number; b: number; a?: number }
): number => {
  const rgba1 = typeof color1 === "string" ? colorToRgba(color1) : color1;
  const rgba2 = typeof color2 === "string" ? colorToRgba(color2) : color2;
  
  const l1 = getLuminance(rgba1);
  const l2 = getLuminance(rgba2);
  
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
};

export const isDarkColor = (color: string, blendedWith: string | null = null): boolean => {
  const blended = colorToRgba(color, blendedWith);
  const contrastWithWhite = checkContrast(blended, { r: 255, g: 255, b: 255, a: 1 });
  const contrastWithBlack = checkContrast(blended, { r: 0, g: 0, b: 0, a: 1 });
  return contrastWithWhite > contrastWithBlack;
};

export const isLightColor = (color: string, blendedWith: string | null = null): boolean => {
  return !isDarkColor(color, blendedWith);
};

export const getContrastingTextColor = (color: string, blendedWith: string | null = null): "black" | "white" => {
  return isDarkColor(color, blendedWith) ? "white" : "black";
};