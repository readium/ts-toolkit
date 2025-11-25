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

export const colorToRgba = (color: string): { r: number; g: number; b: number; a: number } => {
  // Check cache first
  const cached = colorCache.get(color);
  if (cached !== undefined) {
    return cached ?? DEFAULT_COLOR;
  }

  // Check for special color values
  if (isSpecialColorValue(color)) {
    warnAboutInvalidColor(color, "Unsupported color format or special value.");
    colorCache.set(color, null);
    return DEFAULT_COLOR;
  }

  const context = getCanvasContext();
  if (!context) {
    warnAboutInvalidColor(color, "Could not get canvas context.");
    colorCache.set(color, null);
    return DEFAULT_COLOR;
  }

  // Clear the canvas
  context.clearRect(0, 0, 1, 1);
  
  try {
    // Set the color and draw a 1x1 pixel
    context.fillStyle = color;
    context.fillRect(0, 0, 1, 1);
    
    // Get the pixel data
    const [r, g, b, a] = context.getImageData(0, 0, 1, 1).data;
    
    // If the color is completely transparent, return default
    if (a === 0) {
      warnAboutInvalidColor(color, "Fully transparent color.");
      colorCache.set(color, null);
      return DEFAULT_COLOR;
    }
    
    // Convert from 0-255 to 0-1 for alpha
    const result = { r, g, b, a: a / 255 };
    
    // Cache the result for future use
    colorCache.set(color, result);
    return result;
  } catch (error) {
    warnAboutInvalidColor(color, `Error: ${error instanceof Error ? error.message : String(error)}`);
    colorCache.set(color, null);
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