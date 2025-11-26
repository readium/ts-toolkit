// Lazy canvas/offscreen canvas initialization for color conversion
let canvas: HTMLCanvasElement | OffscreenCanvas | null = null;
let ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null = null;

// Track which pixel to use next for color sampling (0-24 for 5x5 grid)
let currentPixelIndex = 0;

// Default color for failed conversions
const DEFAULT_COLOR = { r: 255, g: 255, b: 255, a: 1 };

// Cache for computed color conversions
const colorCache = new Map<string, { r: number; g: number; b: number; a: number; } | null>();

const getCanvasContext = (): CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null => {
  if (!canvas) {
    // Try to use OffscreenCanvas if available
    if (typeof OffscreenCanvas !== "undefined") {
      canvas = new OffscreenCanvas(5, 5);
      ctx = canvas.getContext("2d", { 
        willReadFrequently: true,
        desynchronized: true 
      });
    } else {
      // Fall back to regular canvas
      const htmlCanvas = document.createElement("canvas");
      htmlCanvas.width = 5;
      htmlCanvas.height = 5;
      canvas = htmlCanvas;
      ctx = htmlCanvas.getContext("2d", { 
        willReadFrequently: true,
        desynchronized: true 
      });
    }
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

  try {
    // Clear and initialize canvas at the start of each cycle
    if (currentPixelIndex === 0) {
      context.clearRect(0, 0, 5, 5);
    }
    
    // Calculate which pixel to use for this operation
    const x = currentPixelIndex % 5;
    const y = Math.floor(currentPixelIndex / 5);

    // Clear just this pixel to ensure clean state
    context.clearRect(x, y, 1, 1);

    // Fill background color if provided
    if (backgroundColor) {
      context.fillStyle = backgroundColor;
      context.fillRect(x, y, 1, 1);
    }
    
    // Draw the color at the current pixel
    context.fillStyle = color;
    context.fillRect(x, y, 1, 1);
    
    // Get the pixel data for this specific pixel
    const imageData = context.getImageData(x, y, 1, 1);
    
    // Move to next pixel for next call
    currentPixelIndex = (currentPixelIndex + 1) % 25;

    // Get the pixel data for the pixel we just sampled
    const [r, g, b, a] = imageData.data;
    
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