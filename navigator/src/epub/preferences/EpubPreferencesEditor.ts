import { Layout, Metadata, ReadingProgression } from "@readium/shared";
import { IPreferencesEditor } from "../../preferences/PreferencesEditor";
import { EpubPreferences } from "./EpubPreferences";
import { EpubSettings } from "./EpubSettings";
import { BooleanPreference, EnumPreference, Preference, RangePreference } from "../../preferences/Preference";
import { 
  TextAlignment, 
  Theme, 
  fontSizeRangeConfig, 
  fontWeightRangeConfig, 
  fontWidthRangeConfig 
} from "../../preferences/Types";

import defaultColors from "@readium/css/css/vars/day.json";

// WIP: will change cos’ of all the missing pieces
export class EpubPreferencesEditor implements IPreferencesEditor {
  preferences: EpubPreferences;
  private settings: EpubSettings;
  private metadata: Metadata | null;
  private layout: Layout;

  constructor(initialPreferences: EpubPreferences, settings: EpubSettings, metadata: Metadata) {
    this.preferences = initialPreferences;
    this.settings = settings;
    this.metadata = metadata;
    this.layout = this.metadata?.effectiveLayout || Layout.reflowable;
  }

  clear() {
    this.preferences = new EpubPreferences({ optimalLineLength: 65 });
  }

  private updatePreference<K extends keyof EpubPreferences>(key: K, value: EpubPreferences[K]) {
    this.preferences[key] = value;
  }

  get backgroundColor(): Preference<string> {
    return new Preference<string>({
      initialValue: this.preferences.backgroundColor,
      effectiveValue: this.settings.backgroundColor || defaultColors.RS__backgroundColor,
      isEffective: this.preferences.backgroundColor !== null,
      onChange: (newValue: string | null | undefined) => {
        this.updatePreference("backgroundColor", newValue || null);
      }
    });
  }
  get blendFilter(): BooleanPreference {
    return new BooleanPreference({
      initialValue: this.preferences.blendFilter,
      effectiveValue: this.settings.blendFilter || false,
      isEffective: this.preferences.blendFilter !== null,
      onChange: (newValue: boolean | null | undefined) => {
        this.updatePreference("blendFilter", newValue || null);
      }
    });
  }

  get columnCount(): Preference<number> {
    return new Preference<number>({
      initialValue: this.preferences.columnCount,
      effectiveValue: this.settings.columnCount || null,
      isEffective: this.layout !== Layout.fixed && !this.settings.scroll,
      onChange: (newValue: number | null | undefined) => {
        this.updatePreference("columnCount", newValue || null);
      }
    });
  }

  get constraint(): Preference<number> {
    return new Preference<number>({
      initialValue: this.preferences.constraint,
      effectiveValue: this.preferences.constraint || 0,
      isEffective: true,
      onChange: (newValue: number | null | undefined) => {
        this.updatePreference("constraint", newValue || null);
      }
    })
  }

  get darkenFilter(): RangePreference<number> {
    return new RangePreference<number>({
      initialValue: typeof this.preferences.darkenFilter === "boolean" ? 100 : this.preferences.darkenFilter,
      effectiveValue: typeof this.settings.darkenFilter === "boolean" ? 100 : this.settings.darkenFilter || 0,
      isEffective: this.settings.darkenFilter !== null,
      onChange: (newValue: number | boolean | null | undefined) => {
        this.updatePreference("darkenFilter", newValue || null);
      },
      supportedRange: [0, 100],
      step: 1
    });
  }

  get deprecatedFontSize(): BooleanPreference {
    return new BooleanPreference({
      initialValue: this.preferences.deprecatedFontSize,
      effectiveValue: CSS.supports("zoom", "1") ? this.settings.deprecatedFontSize || false : true,
      isEffective: this.layout !== Layout.fixed,
      onChange: (newValue: boolean | null | undefined) => {
        this.updatePreference("deprecatedFontSize", newValue || null);
      }
    });
  }

  get fontFamily(): Preference<string> {
    return new Preference<string>({
      initialValue: this.preferences.fontFamily,
      effectiveValue: this.settings.fontFamily || null,
      isEffective: this.layout !== Layout.fixed,
      onChange: (newValue: string | null | undefined) => {
        this.updatePreference("fontFamily", newValue || null);
      }
    });
  }

  get fontSize(): RangePreference<number> {
    return new RangePreference<number>({
      initialValue: this.preferences.fontSize,
      effectiveValue: this.settings.fontSize || 1,
      isEffective: this.layout !== Layout.fixed,
      onChange: (newValue: number | null | undefined) => {
        this.updatePreference("fontSize", newValue || null);
      },
      supportedRange: fontSizeRangeConfig.range,
      step: fontSizeRangeConfig.step
    });
  }

  get fontSizeNormalize(): BooleanPreference {
    return new BooleanPreference({
      initialValue: this.preferences.fontSizeNormalize,
      effectiveValue: this.settings.fontSizeNormalize || false,
      isEffective: this.layout !== Layout.fixed && this.preferences.fontSizeNormalize !== null,
      onChange: (newValue: boolean | null | undefined) => {
        this.updatePreference("fontSizeNormalize", newValue || null);
      }
    });
  }

  get fontOpticalSizing(): BooleanPreference {
    return new BooleanPreference({
      initialValue: this.preferences.fontOpticalSizing,
      effectiveValue: this.settings.fontOpticalSizing || true,
      isEffective: this.layout !== Layout.fixed && this.preferences.fontOpticalSizing !== null,
      onChange: (newValue: boolean | null | undefined) => {
        this.updatePreference("fontOpticalSizing", newValue || null);
      }
    });
  }

  get fontWeight(): RangePreference<number> {
    return new RangePreference<number>({
      initialValue: this.preferences.fontWeight,
      effectiveValue: this.settings.fontWeight || 400,
      isEffective: this.layout !== Layout.fixed && this.preferences.fontWeight !== null,
      onChange: (newValue: number | null | undefined) => {
        this.updatePreference("fontWeight", newValue || null);
      },
      supportedRange: fontWeightRangeConfig.range,
      step: fontWeightRangeConfig.step
    });
  }

  get fontWidth(): RangePreference<number> {
    return new RangePreference<number>({
      initialValue: this.preferences.fontWidth,
      effectiveValue: this.settings.fontWidth || 100,
      isEffective: this.layout !== Layout.fixed && this.preferences.fontWidth !== null,
      onChange: (newValue: number | null | undefined) => {
        this.updatePreference("fontWidth", newValue || null);
      },
      supportedRange: fontWidthRangeConfig.range,
      step: fontWidthRangeConfig.step
    });
  }

  get hyphens(): BooleanPreference {
    return new BooleanPreference({
      initialValue: this.preferences.hyphens,
      effectiveValue: this.settings.hyphens || false,
      isEffective: this.layout !== Layout.fixed && this.metadata?.effectiveReadingProgression === ReadingProgression.ltr && this.preferences.hyphens !== null,
      onChange: (newValue: boolean | null | undefined) => {
        this.updatePreference("hyphens", newValue || null);
      }
    });
  }

  get invertFilter(): RangePreference<number> {
    return new RangePreference<number>({
      initialValue: typeof this.preferences.invertFilter === "boolean" ? 100 : this.preferences.invertFilter,
      effectiveValue: typeof this.settings.invertFilter === "boolean" ? 100 : this.settings.invertFilter || 0,
      isEffective: this.settings.invertFilter !== null,
      onChange: (newValue: number | boolean | null | undefined) => {
        this.updatePreference("invertFilter", newValue || null);
      },
      supportedRange: [0, 100],
      step: 1
    });
  }

  get invertGaijiFilter(): RangePreference<number> {
    return new RangePreference<number>({
      initialValue: typeof this.preferences.invertGaijiFilter === "boolean" ? 100 : this.preferences.invertGaijiFilter,
      effectiveValue: typeof this.settings.invertGaijiFilter === "boolean" ? 100 : this.settings.invertGaijiFilter || 0,
      isEffective: this.preferences.invertGaijiFilter !== null,
      onChange: (newValue: number | boolean | null | undefined) => {
        this.updatePreference("invertGaijiFilter", newValue || null);
      },
      supportedRange: [0, 100],
      step: 1
    });
  }

  get iOSPatch(): BooleanPreference {
    return new BooleanPreference({
      initialValue: this.preferences.iOSPatch,
      effectiveValue: this.settings.iOSPatch || false,
      isEffective: this.layout !== Layout.fixed,
      onChange: (newValue: boolean | null | undefined) => {
        this.updatePreference("iOSPatch", newValue || null);
      }
    });
  }

  get iPadOSPatch(): BooleanPreference {
    return new BooleanPreference({
      initialValue: this.preferences.iPadOSPatch,
      effectiveValue: this.settings.iPadOSPatch || false,
      isEffective: this.layout !== Layout.fixed,
      onChange: (newValue: boolean | null | undefined) => {
        this.updatePreference("iPadOSPatch", newValue || null);
      }
    });
  }

  get letterSpacing(): RangePreference<number> {
    return new RangePreference<number>({
      initialValue: this.preferences.letterSpacing,
      effectiveValue: this.settings.letterSpacing || 0,
      isEffective: this.layout !== Layout.fixed && this.preferences.letterSpacing !== null,
      onChange: (newValue: number | null | undefined) => {
        this.updatePreference("letterSpacing", newValue || null);
      },
      supportedRange: [0, 1],
      step: .125
    });
  }

  get ligatures(): BooleanPreference {
    return new BooleanPreference({
      initialValue: this.preferences.ligatures,
      effectiveValue: this.settings.ligatures || true,
      isEffective: this.layout !== Layout.fixed
        && this.metadata?.languages?.some(lang => lang === "ar" || lang === "fa")
        && this.preferences.ligatures !== null || false,
      onChange: (newValue: boolean | null | undefined) => {
        this.updatePreference("ligatures", newValue || null);
      }
    });
  }

  get lineHeight(): RangePreference<number> {
    return new RangePreference<number>({
      initialValue: this.preferences.lineHeight,
      effectiveValue: this.settings.lineHeight,
      isEffective: this.layout !== Layout.fixed && this.preferences.lineHeight !== null,
      onChange: (newValue: number | null | undefined) => {
        this.updatePreference("lineHeight", newValue || null);
      },
      supportedRange: [1, 2],
      step: .1
    });
  }

  get linkColor(): Preference<string> {
    return new Preference<string>({
      initialValue: this.preferences.linkColor,
      effectiveValue: this.settings.linkColor || defaultColors.RS__linkColor,
      isEffective: this.layout !== Layout.fixed && this.preferences.linkColor !== null,
      onChange: (newValue: string | null | undefined) => {
        this.updatePreference("linkColor", newValue || null);
      }
    });
  }

  get maximalLineLength(): RangePreference<number> {
    return new RangePreference<number>({
      initialValue: this.preferences.maximalLineLength,
      effectiveValue: this.settings.maximalLineLength,
      isEffective: this.layout !== Layout.fixed,
      onChange: (newValue: number | null | undefined) => {
        this.updatePreference("maximalLineLength", newValue);
      },
      supportedRange: [20, 100],
      step: 1
    });
  }

  get minimalLineLength(): RangePreference<number> {
    return new RangePreference<number>({
      initialValue: this.preferences.minimalLineLength,
      effectiveValue: this.settings.minimalLineLength,
      isEffective: this.layout !== Layout.fixed,
      onChange: (newValue: number | null | undefined) => {
        this.updatePreference("minimalLineLength", newValue);
      },
      supportedRange: [20, 100],
      step: 1
    });
  }

  get noRuby(): BooleanPreference {
    return new BooleanPreference({
      initialValue: this.preferences.noRuby,
      effectiveValue: this.settings.noRuby || false,
      isEffective: this.layout !== Layout.fixed && this.metadata?.languages?.includes("ja") || false,
      onChange: (newValue: boolean | null | undefined) => {
        this.updatePreference("noRuby", newValue || null);
      }
    });
  }

  get optimalLineLength(): RangePreference<number> {
    return new RangePreference<number>({
      initialValue: this.preferences.optimalLineLength,
      effectiveValue: this.settings.optimalLineLength,
      isEffective: this.layout !== Layout.fixed,
      onChange: (newValue: number | null | undefined) => {
        this.updatePreference("optimalLineLength", newValue as number);
      },
      supportedRange: [20, 100],
      step: 1
    });
  }

  get pageGutter(): Preference<number> {
    return new Preference<number>({
      initialValue: this.preferences.pageGutter,
      effectiveValue: this.settings.pageGutter,
      isEffective: this.layout !== Layout.fixed,
      onChange: (newValue: number | null | undefined) => {
        this.updatePreference("pageGutter", newValue || null);
      }
    });
  }

  get paragraphIndent(): RangePreference<number> {
    return new RangePreference<number>({
      initialValue: this.preferences.paragraphIndent,
      effectiveValue: this.settings.paragraphIndent || 0,
      isEffective: this.layout !== Layout.fixed && this.preferences.paragraphIndent !== null,
      onChange: (newValue: number | null | undefined) => {
        this.updatePreference("paragraphIndent", newValue || null);
      },
      supportedRange: [0, 3],
      step: .25
    });
  }

  get paragraphSpacing(): RangePreference<number> {
    return new RangePreference<number>({
      initialValue: this.preferences.paragraphSpacing,
      effectiveValue: this.settings.paragraphSpacing || 0,
      isEffective: this.layout !== Layout.fixed && this.preferences.paragraphSpacing !== null,
      onChange: (newValue: number | null | undefined) => {
        this.updatePreference("paragraphSpacing", newValue || null);
      },
      supportedRange: [0, 3],
      step: .25
    });
  }

  get scroll(): BooleanPreference {
    return new BooleanPreference({
      initialValue: this.preferences.scroll,
      effectiveValue: this.settings.scroll || false,
      isEffective: this.layout !== Layout.fixed,
      onChange: (newValue: boolean | null | undefined) => {
        this.updatePreference("scroll", newValue || null);
      }
    });
  }

  get scrollPaddingTop(): Preference<number> {
    return new Preference<number>({
      initialValue: this.preferences.scrollPaddingTop,
      effectiveValue: this.settings.scrollPaddingTop || 0,
      isEffective: this.layout !== Layout.fixed && !!this.settings.scroll && this.preferences.scrollPaddingTop !== null,
      onChange: (newValue: number | null | undefined) => {
        this.updatePreference("scrollPaddingTop", newValue || null);
      }
    });
  }

  get scrollPaddingBottom(): Preference<number> {
    return new Preference<number>({
      initialValue: this.preferences.scrollPaddingBottom,
      effectiveValue: this.settings.scrollPaddingBottom || 0,
      isEffective: this.layout !== Layout.fixed && !!this.settings.scroll && this.preferences.scrollPaddingBottom !== null,
      onChange: (newValue: number | null | undefined) => {
        this.updatePreference("scrollPaddingBottom", newValue || null);
      }
    });
  }

  /* 
  get scrollPaddingLeft(): Preference<number> {
    return new Preference<number>({
      initialValue: this.preferences.scrollPaddingLeft,
      effectiveValue: this.settings.scrollPaddingLeft || 0,
      isEffective: this.layout !== Layout.fixed && !!this.settings.scroll && this.preferences.scrollPaddingLeft !== null,
      onChange: (newValue: number | null | undefined) => {
        this.updatePreference("scrollPaddingLeft", newValue || null);
      }
    });
  }

  get scrollPaddingRight(): Preference<number> {
    return new Preference<number>({
      initialValue: this.preferences.scrollPaddingRight,
      effectiveValue: this.settings.scrollPaddingRight || 0,
      isEffective: this.layout !== Layout.fixed && !!this.settings.scroll && this.preferences.scrollPaddingRight !== null,
      onChange: (newValue: number | null | undefined) => {
        this.updatePreference("scrollPaddingRight", newValue || null);
      }
    });
  } 
  */

  get selectionBackgroundColor(): Preference<string> {
    return new Preference<string>({
      initialValue: this.preferences.selectionBackgroundColor,
      effectiveValue: this.settings.selectionBackgroundColor || defaultColors.RS__selectionBackgroundColor,
      isEffective: this.layout !== Layout.fixed && this.preferences.selectionBackgroundColor !== null,
      onChange: (newValue: string | null | undefined) => {
        this.updatePreference("selectionBackgroundColor", newValue || null);
      }
    });
  }

  get selectionTextColor(): Preference<string> {
    return new Preference<string>({
      initialValue: this.preferences.selectionTextColor,
      effectiveValue: this.settings.selectionTextColor || defaultColors.RS__selectionTextColor,
      isEffective: this.layout !== Layout.fixed && this.preferences.selectionTextColor !== null,
      onChange: (newValue: string | null | undefined) => {
        this.updatePreference("selectionTextColor", newValue || null);
      }
    });
  }

  get textAlign(): EnumPreference<TextAlignment> {
    return new EnumPreference<TextAlignment>({
      initialValue: this.preferences.textAlign,
      effectiveValue: this.settings.textAlign || TextAlignment.start,
      isEffective: this.layout !== Layout.fixed && this.preferences.textAlign !== null,
      onChange: (newValue: TextAlignment | null | undefined) => {
        this.updatePreference("textAlign", newValue || null);
      },
      supportedValues: Object.values(TextAlignment)
    });
  }

  get textColor(): Preference<string> {
    return new Preference<string>({
      initialValue: this.preferences.textColor,
      effectiveValue: this.settings.textColor || defaultColors.RS__textColor,
      isEffective: this.layout !== Layout.fixed && this.preferences.textColor !== null,
      onChange: (newValue: string | null | undefined) => {
        this.updatePreference("textColor", newValue || null);
      }
    });
  }

  get textNormalization(): BooleanPreference {
    return new BooleanPreference({
      initialValue: this.preferences.textNormalization,
      effectiveValue: this.settings.textNormalization || false,
      isEffective: this.layout !== Layout.fixed,
      onChange: (newValue: boolean | null | undefined) => {
        this.updatePreference("textNormalization", newValue || null);
      }
    });
  }

  get theme(): EnumPreference<Theme> {
    return new EnumPreference<Theme>({
      initialValue: this.preferences.theme,
      effectiveValue: this.settings.theme || null,
      isEffective: this.layout !== Layout.fixed,
      onChange: (newValue: Theme | null | undefined) => {
        this.updatePreference("theme", newValue || null);
      },
      supportedValues: Object.values(Theme)
    });
  }

  get visitedColor(): Preference<string> {
    return new Preference<string>({
      initialValue: this.preferences.visitedColor,
      effectiveValue: this.settings.visitedColor || defaultColors.RS__visitedColor,
      isEffective: this.layout !== Layout.fixed && this.preferences.visitedColor !== null,
      onChange: (newValue: string | null | undefined) => {
        this.updatePreference("visitedColor", newValue || null);
      }
    });
  }

  get wordSpacing(): RangePreference<number> {
    return new RangePreference<number>({
      initialValue: this.preferences.wordSpacing,
      effectiveValue: this.settings.wordSpacing || 0,
      isEffective: this.layout !== Layout.fixed && this.preferences.wordSpacing !== null,
      onChange: (newValue: number | null | undefined) => {
        this.updatePreference("wordSpacing", newValue || null);
      },
      supportedRange: [0, 2],
      step: 0.125
    });
  }
}