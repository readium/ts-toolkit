import { EPUBLayout, Metadata, ReadingProgression } from "@readium/shared";
import { IPreferencesEditor } from "../../preferences/PreferencesEditor";
import { EpubDefaults } from "./EpubDefaults";
import { EpubPreferences } from "./EpubPreferences";
import { EpubSettings } from "./EpubSettings";
import { TextAlignment, Theme } from "../../preferences/Types";
import { BooleanPreference, EnumPreference, Preference, RangePreference } from "../../preferences/Preference";

import dayMode from "@readium/css/css/vars/day.json";
import fontStacks from "@readium/css/css/vars/fontStacks.json";

// WIP: will change cos’ of all the missing pieces
export class EpubPreferencesEditor implements IPreferencesEditor {
  preferences: EpubPreferences;
  private settings: EpubSettings;
  private defaults: EpubDefaults;
  private metadata: Metadata | null;
  private layout: EPUBLayout;

  constructor(initialPreferences: EpubPreferences, settings: EpubSettings, defaults: EpubDefaults, metadata: Metadata) {
    this.preferences = initialPreferences;
    this.settings = settings;
    this.defaults = defaults;
    this.metadata = metadata;
    this.layout = this.metadata?.getPresentation()?.layout || EPUBLayout.reflowable;
  }

  clear() {
    this.preferences = new EpubPreferences({ optimalLineLength: 65 });
    this.defaults = new EpubDefaults({});
    this.settings = new EpubSettings(this.preferences, this.defaults);
    this.metadata = null;
    this.layout = EPUBLayout.reflowable;
  }

  updatePreference<K extends keyof EpubPreferences>(key: K, value: EpubPreferences[K]) {
    this.preferences[key] = value;
  }

  get backgroundColor(): Preference<string> {
    return new Preference<string>({
      initialValue: this.preferences.backgroundColor,
      effectiveValue: this.settings.backgroundColor || dayMode.RS__backgroundColor,
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
      // TODO auto-pagination
      effectiveValue: this.settings.columnCount || null,
      isEffective: this.layout === EPUBLayout.reflowable && !this.settings.scroll,
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

  get fontFamily(): Preference<string> {
    return new Preference<string>({
      initialValue: this.preferences.fontFamily,
      // TODO infer effectiveValue of fontFamily as it’s more complex than that:
      // while it’s using --RS__oldStyleTf as a default, it is actually var
      // --RS__baseFontFamily that is used as a proxy so that it can be redefined 
      // for each language ReadiumCSS supports, and these values are not extracted
      effectiveValue: this.settings.fontFamily || fontStacks.RS__oldStyleTf,
      isEffective: this.layout === EPUBLayout.reflowable,
      onChange: (newValue: string | null | undefined) => {
        this.updatePreference("fontFamily", newValue || null);
      }
    });
  }

  get fontSize(): RangePreference<number> {
    return new RangePreference<number>({
      initialValue: this.preferences.fontSize,
      effectiveValue: this.settings.fontSize || 1,
      isEffective: this.layout === EPUBLayout.reflowable,
      onChange: (newValue: number | null | undefined) => {
        this.updatePreference("fontSize", newValue || null);
      },
      supportedRange: [0.5, 2.5],
      step: 0.1
    });
  }

  get fontOpticalSizing(): BooleanPreference {
    return new BooleanPreference({
      initialValue: this.preferences.fontOpticalSizing,
      effectiveValue: this.settings.fontOpticalSizing || true,
      isEffective: this.layout === EPUBLayout.reflowable && !this.settings.publisherStyles && this.preferences.fontOpticalSizing !== null,
      onChange: (newValue: boolean | null | undefined) => {
        this.updatePreference("fontOpticalSizing", newValue || null);
      }
    });
  }

  get fontWeight(): RangePreference<number> {
    return new RangePreference<number>({
      initialValue: this.preferences.fontWeight,
      effectiveValue: this.settings.fontWeight || 400,
      isEffective: this.layout === EPUBLayout.reflowable && !this.settings.publisherStyles && this.preferences.fontWeight !== null,
      onChange: (newValue: number | null | undefined) => {
        this.updatePreference("fontWeight", newValue || null);
      },
      supportedRange: [100, 1000],
      step: 100
    });
  }

  get fontWidth(): RangePreference<number> {
    return new RangePreference<number>({
      initialValue: this.preferences.fontWidth,
      effectiveValue: this.settings.fontWidth || 100,
      isEffective: this.layout === EPUBLayout.reflowable && !this.settings.publisherStyles && this.preferences.fontWidth !== null,
      onChange: (newValue: number | null | undefined) => {
        this.updatePreference("fontWidth", newValue || null);
      },
      supportedRange: [50, 250],
      step: 10
    });
  }

  get hyphens(): BooleanPreference {
    return new BooleanPreference({
      initialValue: this.preferences.hyphens,
      effectiveValue: this.settings.hyphens || false,
      isEffective: this.layout === EPUBLayout.reflowable && !this.settings.publisherStyles && this.metadata?.effectiveReadingProgression === ReadingProgression.ltr,
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

  get letterSpacing(): RangePreference<number> {
    return new RangePreference<number>({
      initialValue: this.preferences.letterSpacing,
      effectiveValue: this.settings.letterSpacing || 0,
      isEffective: this.layout === EPUBLayout.reflowable && !this.settings.publisherStyles && this.metadata?.effectiveReadingProgression === ReadingProgression.ltr,
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
      isEffective: this.layout === EPUBLayout.reflowable && !this.settings.publisherStyles && this.metadata?.effectiveReadingProgression === ReadingProgression.rtl,
      onChange: (newValue: boolean | null | undefined) => {
        this.updatePreference("ligatures", newValue || null);
      }
    });
  }

  get lineHeight(): RangePreference<number> {
    return new RangePreference<number>({
      initialValue: this.preferences.lineHeight,
      effectiveValue: this.settings.lineHeight || 1.2,
      isEffective: this.layout === EPUBLayout.reflowable && !this.settings.publisherStyles,
      onChange: (newValue: number | null | undefined) => {
        this.updatePreference("lineHeight", newValue || null);
      },
      supportedRange: [1, 2],
      step: .1
    });
  }

  get lineLength(): RangePreference<number> {
    return new RangePreference<number>({
      initialValue: this.preferences.lineLength,
      effectiveValue: this.settings.lineLength || this.preferences.optimalLineLength,
      isEffective: this.layout === EPUBLayout.reflowable,
      onChange: (newValue: number | null | undefined) => {
        this.updatePreference("lineLength", newValue || null);
      },
      supportedRange: [20, 100],
      step: 1
    });
  }

  get linkColor(): Preference<string> {
    return new Preference<string>({
      initialValue: this.preferences.linkColor,
      effectiveValue: this.settings.linkColor || dayMode.RS__linkColor,
      isEffective: this.layout === EPUBLayout.reflowable && this.preferences.linkColor !== null,
      onChange: (newValue: string | null | undefined) => {
        this.updatePreference("linkColor", newValue || null);
      }
    });
  }

  get minimalLineLength(): RangePreference<number> {
    return new RangePreference<number>({
      initialValue: this.preferences.minimalLineLength,
      // No fallback since undefined and null are handled differently so we only pass the pref
      effectiveValue: this.preferences.minimalLineLength,
      isEffective: this.layout === EPUBLayout.reflowable,
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
      isEffective: this.layout === EPUBLayout.reflowable && this.metadata?.languages?.includes("ja") || false,
      onChange: (newValue: boolean | null | undefined) => {
        this.updatePreference("noRuby", newValue || null);
      }
    });
  }

  get optimalLineLength(): RangePreference<number> {
    return new RangePreference<number>({
      initialValue: this.preferences.optimalLineLength,
      effectiveValue: this.preferences.optimalLineLength,
      isEffective: this.layout === EPUBLayout.reflowable && !this.settings.lineLength,
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
      effectiveValue: this.preferences.pageGutter || 0,
      isEffective: this.layout === EPUBLayout.reflowable,
      onChange: (newValue: number | null | undefined) => {
        this.updatePreference("pageGutter", newValue || null);
      }
    });
  }

  get paragraphIndent(): RangePreference<number> {
    return new RangePreference<number>({
      initialValue: this.preferences.paragraphIndent,
      effectiveValue: this.settings.paragraphIndent || 0,
      isEffective: this.layout === EPUBLayout.reflowable && !this.settings.publisherStyles && this.preferences.paragraphIndent !== null,
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
      isEffective: this.layout === EPUBLayout.reflowable && !this.settings.publisherStyles && this.preferences.paragraphSpacing !== null,
      onChange: (newValue: number | null | undefined) => {
        this.updatePreference("paragraphSpacing", newValue || null);
      },
      supportedRange: [0, 3],
      step: .25
    });
  }

  get publisherStyles(): BooleanPreference {
    return new BooleanPreference({
      initialValue: this.preferences.publisherStyles,
      effectiveValue: this.settings.publisherStyles || true,
      isEffective: this.layout === EPUBLayout.reflowable,
      onChange: (newValue: boolean | null | undefined) => {
        this.updatePreference("publisherStyles", newValue || null);
      }
    });
  }

  get scroll(): BooleanPreference {
    return new BooleanPreference({
      initialValue: this.preferences.scroll,
      effectiveValue: this.settings.scroll || false,
      isEffective: this.layout === EPUBLayout.reflowable,
      onChange: (newValue: boolean | null | undefined) => {
        this.updatePreference("scroll", newValue || null);
      }
    });
  }

  get selectionBackgroundColor(): Preference<string> {
    return new Preference<string>({
      initialValue: this.preferences.selectionBackgroundColor,
      effectiveValue: this.settings.selectionBackgroundColor || dayMode.RS__selectionBackgroundColor,
      isEffective: this.layout === EPUBLayout.reflowable && this.preferences.selectionBackgroundColor !== null,
      onChange: (newValue: string | null | undefined) => {
        this.updatePreference("selectionBackgroundColor", newValue || null);
      }
    });
  }

  get selectionTextColor(): Preference<string> {
    return new Preference<string>({
      initialValue: this.preferences.selectionTextColor,
      effectiveValue: this.settings.selectionTextColor || dayMode.RS__selectionTextColor,
      isEffective: this.layout === EPUBLayout.reflowable && this.preferences.selectionTextColor !== null,
      onChange: (newValue: string | null | undefined) => {
        this.updatePreference("selectionTextColor", newValue || null);
      }
    });
  }

  get textAlign(): EnumPreference<TextAlignment> {
    return new EnumPreference<TextAlignment>({
      initialValue: this.preferences.textAlign,
      effectiveValue: this.settings.textAlign || TextAlignment.start,
      isEffective: this.layout === EPUBLayout.reflowable && !this.settings.publisherStyles,
      onChange: (newValue: TextAlignment | null | undefined) => {
        this.updatePreference("textAlign", newValue || null);
      },
      supportedValues: Object.values(TextAlignment)
    });
  }

  get textColor(): Preference<string> {
    return new Preference<string>({
      initialValue: this.preferences.textColor,
      effectiveValue: this.settings.textColor || dayMode.RS__textColor,
      isEffective: this.layout === EPUBLayout.reflowable && this.preferences.textColor !== null,
      onChange: (newValue: string | null | undefined) => {
        this.updatePreference("textColor", newValue || null);
      }
    });
  }

  get textNormalization(): BooleanPreference {
    return new BooleanPreference({
      initialValue: this.preferences.textNormalization,
      effectiveValue: this.settings.textNormalization || false,
      isEffective: this.layout === EPUBLayout.reflowable,
      onChange: (newValue: boolean | null | undefined) => {
        this.updatePreference("textNormalization", newValue || null);
      }
    });
  }

  get theme(): EnumPreference<Theme> {
    return new EnumPreference<Theme>({
      initialValue: this.preferences.theme,
      effectiveValue: this.settings.theme || Theme.day,
      isEffective: this.layout === EPUBLayout.reflowable,
      onChange: (newValue: Theme | null | undefined) => {
        this.updatePreference("theme", newValue || null);
      },
      supportedValues: Object.values(Theme)
    });
  }

  get visitedColor(): Preference<string> {
    return new Preference<string>({
      initialValue: this.preferences.visitedColor,
      effectiveValue: this.settings.visitedColor || dayMode.RS__visitedColor,
      isEffective: this.layout === EPUBLayout.reflowable && this.preferences.visitedColor !== null,
      onChange: (newValue: string | null | undefined) => {
        this.updatePreference("visitedColor", newValue || null);
      }
    });
  }

  get wordSpacing(): RangePreference<number> {
    return new RangePreference<number>({
      initialValue: this.preferences.wordSpacing,
      effectiveValue: this.settings.wordSpacing || 0,
      isEffective: this.layout === EPUBLayout.reflowable && !this.settings.publisherStyles && this.preferences.wordSpacing !== null,
      onChange: (newValue: number | null | undefined) => {
        this.updatePreference("wordSpacing", newValue || null);
      },
      supportedRange: [0, 2],
      step: 0.125
    });
  }
}