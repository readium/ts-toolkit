import { Accessibility, Feature, AccessMode, PrimaryAccessMode, Hazard } from './Accessibility.ts';
import { Publication } from '../Publication.ts';
import { AccessibilityProfile } from './Accessibility.ts';

import { Localization } from './Localization.ts';
import { Layout } from '../Layout.ts';

/**
 * Represents a single accessibility claim
 */
export interface AccessibilityDisplayStatement {
  id: string;
  compactString?: string;
  descriptiveString?: string;
}

/**
* Represents a collection of related accessibility claims which should be
* displayed together in a section
*/
export interface AccessibilityDisplayField {
  // Unique identifier for this display field
  id: string;

  // Title for this display field
  title: string;

  // List of accessibility claims to display for this field
  statements: AccessibilityDisplayStatement[];

  // Indicates whether this display field should be rendered
  shouldDisplay: boolean;
}

/**
 * Represents the different ways visual adjustments can be made
 */
export enum VisualAdjustments {
  Unknown = 'unknown',
  Modifiable = 'modifiable',
  Unmodifiable = 'unmodifiable'
}

/**
 * Represents the different types of non-visual reading
 */
export enum NonvisualReading {
  NoMetadata = 'noMetadata',
  Readable = 'readable',
  NotFully = 'notFully',
  Unreadable = 'unreadable'
}

/**
 * Represents the different types of prerecorded audio
 */
export enum PrerecordedAudio {
  NoMetadata = 'noMetadata',
  Synchronized = 'synchronized',
  AudioOnly = 'audioOnly',
  AudioComplementary = 'audioComplementary'
}

/**
 * The ways of reading display field is a banner heading that groups
 * together the following information about how the content facilitates
 * access.
 */
export class WaysOfReading implements AccessibilityDisplayField {
  public readonly id = "ways-of-reading.title";
  public readonly title: string;
  public readonly shouldDisplay: boolean;

  public readonly visualAdjustments: VisualAdjustments;
  public readonly nonvisualReading: NonvisualReading;
  public readonly nonvisualReadingAltText: boolean;
  public readonly prerecordedAudio: PrerecordedAudio;
  public readonly statements: AccessibilityDisplayStatement[];

  private constructor(
    visualAdjustments: VisualAdjustments = VisualAdjustments.Unknown,
    nonvisualReading: NonvisualReading = NonvisualReading.NoMetadata,
    nonvisualReadingAltText: boolean = false,
    prerecordedAudio: PrerecordedAudio = PrerecordedAudio.NoMetadata
  ) {
    this.visualAdjustments = visualAdjustments;
    this.nonvisualReading = nonvisualReading;
    this.nonvisualReadingAltText = nonvisualReadingAltText;
    this.prerecordedAudio = prerecordedAudio;

    // This should be displayed even if there is no metadata
    this.shouldDisplay = true;

    const titleLocale = Localization.getString(this.id);
    this.title = titleLocale.compact;

    this.statements = [];

    // Visual Adjustments
    const visualAdjustmentsKey = visualAdjustments === VisualAdjustments.Modifiable
      ? "ways-of-reading.visual-adjustments.modifiable"
      : visualAdjustments === VisualAdjustments.Unmodifiable
        ? "ways-of-reading.visual-adjustments.unmodifiable"
        : "ways-of-reading.visual-adjustments.unknown";

    const visualAdjustmentsLocale = Localization.getString(visualAdjustmentsKey);
    this.statements.push({
      id: visualAdjustmentsKey,
      compactString: visualAdjustmentsLocale.compact,
      descriptiveString: visualAdjustmentsLocale.descriptive
    });

    // Non-visual Reading
    let nonvisualReadingKey = "";
    if (nonvisualReading === NonvisualReading.Readable) {
      nonvisualReadingKey = "ways-of-reading.nonvisual-reading.readable";
    } else if (nonvisualReading === NonvisualReading.NotFully) {
      nonvisualReadingKey = "ways-of-reading.nonvisual-reading.not-fully";
    } else if (nonvisualReading === NonvisualReading.Unreadable) {
      nonvisualReadingKey = "ways-of-reading.nonvisual-reading.none";
    } else if (nonvisualReading === NonvisualReading.NoMetadata) {
      nonvisualReadingKey = "ways-of-reading.nonvisual-reading.no-metadata";
    }

    const nonvisualReadingLocale = Localization.getString(nonvisualReadingKey);
    this.statements.push({
      id: nonvisualReadingKey,
      compactString: nonvisualReadingLocale.compact,
      descriptiveString: nonvisualReadingLocale.descriptive
    });

    // Non-visual Reading Alt Text
    if (nonvisualReadingAltText) {
      const altTextLocale = Localization.getString("ways-of-reading.nonvisual-reading.alt-text");
      this.statements.push({
        id: "ways-of-reading.nonvisual-reading.alt-text",
        compactString: altTextLocale.compact,
        descriptiveString: altTextLocale.descriptive
      });
    }

    // Prerecorded Audio
    let prerecordedAudioKey = "";
    if (prerecordedAudio === PrerecordedAudio.Synchronized) {
      prerecordedAudioKey = "ways-of-reading.prerecorded-audio.synchronized";
    } else if (prerecordedAudio === PrerecordedAudio.AudioOnly) {
      prerecordedAudioKey = "ways-of-reading.prerecorded-audio.only";
    } else if (prerecordedAudio === PrerecordedAudio.AudioComplementary) {
      prerecordedAudioKey = "ways-of-reading.prerecorded-audio.complementary";
    } else if (prerecordedAudio === PrerecordedAudio.NoMetadata) {
      prerecordedAudioKey = "ways-of-reading.prerecorded-audio.no-metadata";
    }

    const prerecordedAudioLocale = Localization.getString(prerecordedAudioKey);
    this.statements.push({
      id: prerecordedAudioKey,
      compactString: prerecordedAudioLocale.compact,
      descriptiveString: prerecordedAudioLocale.descriptive
    });
  }

  public static fromPublication(publication: Publication): WaysOfReading {
    const a11y = publication.metadata.accessibility ?? new Accessibility();
    const features = a11y.feature ?? [];
    const isFXL = publication.metadata.layout === Layout.fixed;

    const visualAdjustments = features.some(f => f.value === Feature.DISPLAY_TRANSFORMABILITY.value)
      ? VisualAdjustments.Modifiable
      : isFXL
        ? VisualAdjustments.Unmodifiable
        : VisualAdjustments.Unknown;

    const accessModes = a11y.accessMode ?? [];
    const accessModeSufficient = a11y.accessModeSufficient ?? [];

    const allText = accessModes.length > 0 && accessModes.every((m: AccessMode) => m.value === AccessMode.TEXTUAL.value) ||
      accessModeSufficient.some((modes: PrimaryAccessMode) => {
        const modeValue = modes.value;
        if (Array.isArray(modeValue)) {
          return modeValue.every(mode => mode === AccessMode.TEXTUAL.value);
        }
        return modeValue === AccessMode.TEXTUAL.value;
      });

    const someText = accessModes.some((m: AccessMode) => m.value === AccessMode.TEXTUAL.value) ||
      accessModeSufficient.some((modes: PrimaryAccessMode) => {
        const modeValue = modes.value;
        if (Array.isArray(modeValue)) {
          return modeValue.some(mode => mode === AccessMode.TEXTUAL.value);
        }
        return modeValue === AccessMode.TEXTUAL.value;
      });

    const noText = !(accessModes.length === 0 && accessModeSufficient.length === 0) &&
      !accessModes.some((m: AccessMode) => m.value === AccessMode.TEXTUAL.value) &&
      !accessModeSufficient.some((modes: PrimaryAccessMode) => {
        const modeValue = modes.value;
        if (Array.isArray(modeValue)) {
          return modeValue.some(mode => mode === AccessMode.TEXTUAL.value);
        }
        return modeValue === AccessMode.TEXTUAL.value;
      });

    const hasTextAlt = features.some(f => [
      Feature.LONG_DESCRIPTION.value,
      Feature.ALTERNATIVE_TEXT.value,
      Feature.DESCRIBED_MATH.value,
      Feature.TRANSCRIPT.value
    ].includes(f.value));

    const nonvisualReading = allText
      ? NonvisualReading.Readable
      : (someText || hasTextAlt)
        ? NonvisualReading.NotFully
        : noText
          ? NonvisualReading.Unreadable
          : NonvisualReading.NoMetadata;

    const nonvisualReadingAltText = hasTextAlt;

    const prerecordedAudio = features.some(f => f.value === Feature.SYNCHRONIZED_AUDIO_TEXT.value)
      ? PrerecordedAudio.Synchronized
      : accessModeSufficient.some((modes: PrimaryAccessMode) => {
        const modeValue = modes.value;
        if (Array.isArray(modeValue)) {
          return modeValue.some(mode => mode === AccessMode.AUDITORY.value);
        }
        return modeValue === AccessMode.AUDITORY.value;
      })
        ? PrerecordedAudio.AudioOnly
        : accessModes.some((m: AccessMode) => m.value === AccessMode.AUDITORY.value)
          ? PrerecordedAudio.AudioComplementary
          : PrerecordedAudio.NoMetadata;

    return new WaysOfReading(
      visualAdjustments,
      nonvisualReading,
      nonvisualReadingAltText,
      prerecordedAudio
    );
  }
}

/**
 * Navigation features of the content
 */
export class Navigation implements AccessibilityDisplayField {
  public readonly id = "navigation.title";
  public readonly title: string;
  public readonly shouldDisplay: boolean;

  public readonly noMetadata: boolean;
  public readonly tableOfContents: boolean;
  public readonly index: boolean;
  public readonly headings: boolean;
  public readonly page: boolean;
  public readonly statements: AccessibilityDisplayStatement[];

  private constructor(
    tableOfContents: boolean = false,
    index: boolean = false,
    headings: boolean = false,
    page: boolean = false
  ) {
    this.tableOfContents = tableOfContents;
    this.index = index;
    this.headings = headings;
    this.page = page;
    this.noMetadata = !tableOfContents && !index && !headings && !page;

    const titleLocale = Localization.getString(this.id);
    this.title = titleLocale.compact;

    this.shouldDisplay = !this.noMetadata;

    this.statements = [];
    if (tableOfContents) {
      const tocLocale = Localization.getString("navigation.toc");
      this.statements.push({
        id: "navigation.toc",
        compactString: tocLocale.compact,
        descriptiveString: tocLocale.descriptive
      });
    }
    if (index) {
      const indexLocale = Localization.getString("navigation.index");
      this.statements.push({
        id: "navigation.index",
        compactString: indexLocale.compact,
        descriptiveString: indexLocale.descriptive
      });
    }
    if (headings) {
      const headingsLocale = Localization.getString("navigation.structural");
      this.statements.push({
        id: "navigation.structural",
        compactString: headingsLocale.compact,
        descriptiveString: headingsLocale.descriptive
      });
    }
    if (page) {
      const pageNavLocale = Localization.getString("navigation.page-navigation");
      this.statements.push({
        id: "navigation.page-navigation",
        compactString: pageNavLocale.compact,
        descriptiveString: pageNavLocale.descriptive
      });
    }

    if (this.statements.length === 0) {
      const noNavLocale = Localization.getString("navigation.no-metadata");
      this.statements.push({
        id: "navigation.no-metadata",
        compactString: noNavLocale.compact,
        descriptiveString: noNavLocale.descriptive
      });
    }
  }

  public static fromPublication(publication: Publication): Navigation {
    const a11y = publication.metadata.accessibility ?? new Accessibility();
    const features = a11y.feature ?? [];

    return new Navigation(
      features.some(f => f.value === Feature.TABLE_OF_CONTENTS.value),
      features.some(f => f.value === Feature.INDEX.value),
      features.some(f => f.value === Feature.STRUCTURAL_NAVIGATION.value),
      features.some(f => f.value === Feature.PAGE_NAVIGATION.value)
    );
  }
}

/**
 * Represents the different types of rich content
 */
export enum RichContentType {
  Math = 'math',
  Chemistry = 'chemistry',
  Music = 'music',
  Diagram = 'diagram',
  Chart = 'chart',
  Graph = 'graph',
  Table = 'table',
  Image = 'image'
}

/**
 * Rich content features of the content
 */
export class RichContent implements AccessibilityDisplayField {
  public readonly id = "rich-content.title";
  public readonly title: string;
  public readonly shouldDisplay: boolean;

  public readonly noMetadata: boolean;
  public readonly extendedAltTextDescriptions: boolean;
  public readonly mathFormula: boolean;
  public readonly mathFormulaAsMathML: boolean;
  public readonly mathFormulaAsLaTeX: boolean;
  public readonly chemicalFormulaAsMathML: boolean;
  public readonly chemicalFormulaAsLaTeX: boolean;
  public readonly closedCaptions: boolean;
  public readonly openCaptions: boolean;
  public readonly transcript: boolean;
  public readonly statements: AccessibilityDisplayStatement[];

  private constructor(
    extendedAltTextDescriptions: boolean = false,
    mathFormula: boolean = false,
    mathFormulaAsMathML: boolean = false,
    mathFormulaAsLaTeX: boolean = false,
    chemicalFormulaAsMathML: boolean = false,
    chemicalFormulaAsLaTeX: boolean = false,
    closedCaptions: boolean = false,
    openCaptions: boolean = false,
    transcript: boolean = false
  ) {
    this.extendedAltTextDescriptions = extendedAltTextDescriptions;
    this.mathFormula = mathFormula;
    this.mathFormulaAsMathML = mathFormulaAsMathML;
    this.mathFormulaAsLaTeX = mathFormulaAsLaTeX;
    this.chemicalFormulaAsMathML = chemicalFormulaAsMathML;
    this.chemicalFormulaAsLaTeX = chemicalFormulaAsLaTeX;
    this.closedCaptions = closedCaptions;
    this.openCaptions = openCaptions;
    this.transcript = transcript;
    this.noMetadata = !extendedAltTextDescriptions && !mathFormula && !mathFormulaAsMathML &&
      !mathFormulaAsLaTeX && !chemicalFormulaAsMathML && !chemicalFormulaAsLaTeX &&
      !closedCaptions && !openCaptions && !transcript;

    this.shouldDisplay = !this.noMetadata;

    const titleLocale = Localization.getString(this.id);
    this.title = titleLocale.compact;

    this.statements = [];
    if (extendedAltTextDescriptions) {
      const extendedLocale = Localization.getString("rich-content.extended-descriptions");
      this.statements.push({
        id: "rich-content.extended-descriptions",
        compactString: extendedLocale.compact,
        descriptiveString: extendedLocale.descriptive
      });
    }
    if (mathFormula) {
      const mathLocale = Localization.getString("rich-content.accessible-math-described");
      this.statements.push({
        id: "rich-content.accessible-math-described",
        compactString: mathLocale.compact,
        descriptiveString: mathLocale.descriptive
      });
    }
    if (mathFormulaAsMathML) {
      const mathMLLocale = Localization.getString("rich-content.math-as-mathml");
      this.statements.push({
        id: "rich-content.math-as-mathml",
        compactString: mathMLLocale.compact,
        descriptiveString: mathMLLocale.descriptive
      });
    }
    if (mathFormulaAsLaTeX) {
      const latexLocale = Localization.getString("rich-content.accessible-math-as-latex");
      this.statements.push({
        id: "rich-content.accessible-math-as-latex",
        compactString: latexLocale.compact,
        descriptiveString: latexLocale.descriptive
      });
    }
    if (chemicalFormulaAsMathML) {
      const chemMLLocale = Localization.getString("rich-content.accessible-chemistry-as-mathml");
      this.statements.push({
        id: "rich-content.accessible-chemistry-as-mathml",
        compactString: chemMLLocale.compact,
        descriptiveString: chemMLLocale.descriptive
      });
    }
    if (chemicalFormulaAsLaTeX) {
      const chemLatexLocale = Localization.getString("rich-content.accessible-chemistry-as-latex");
      this.statements.push({
        id: "rich-content.accessible-chemistry-as-latex",
        compactString: chemLatexLocale.compact,
        descriptiveString: chemLatexLocale.descriptive
      });
    }
    if (closedCaptions) {
      const ccLocale = Localization.getString("rich-content.closed-captions");
      this.statements.push({
        id: "rich-content.closed-captions",
        compactString: ccLocale.compact,
        descriptiveString: ccLocale.descriptive
      });
    }
    if (openCaptions) {
      const ocLocale = Localization.getString("rich-content.open-captions");
      this.statements.push({
        id: "rich-content.open-captions",
        compactString: ocLocale.compact,
        descriptiveString: ocLocale.descriptive
      });
    }
    if (transcript) {
      const transcriptLocale = Localization.getString("rich-content.transcript");
      this.statements.push({
        id: "rich-content.transcript",
        compactString: transcriptLocale.compact,
        descriptiveString: transcriptLocale.descriptive
      });
    }

    if (this.statements.length === 0) {
      const unknownLocale = Localization.getString("rich-content.unknown");
      this.statements.push({
        id: "rich-content.unknown",
        compactString: unknownLocale.compact,
        descriptiveString: unknownLocale.descriptive
      });
    }
  }

  public static fromPublication(publication: Publication): RichContent {
    const a11y = publication.metadata.accessibility ?? new Accessibility();
    const features = a11y.feature ?? [];

    return new RichContent(
      features.some(f => f.value === Feature.LONG_DESCRIPTION.value),
      features.some(f => f.value === Feature.DESCRIBED_MATH.value),
      features.some(f => f.value === Feature.MATH_ML.value),
      features.some(f => f.value === Feature.LATEX.value),
      features.some(f => f.value === Feature.MATH_ML_CHEMISTRY.value),
      features.some(f => f.value === Feature.LATEX_CHEMISTRY.value),
      features.some(f => f.value === Feature.CLOSED_CAPTIONS.value),
      features.some(f => f.value === Feature.OPEN_CAPTIONS.value),
      features.some(f => f.value === Feature.TRANSCRIPT.value)
    );
  }
}

/**
 * Represents additional accessibility information
 */
export class AdditionalInformation implements AccessibilityDisplayField {
  public readonly id = "additional-accessibility-information.title";
  public readonly title: string;
  public readonly shouldDisplay: boolean;

  public readonly noMetadata: boolean;
  public readonly pageBreakMarkers: boolean;
  public readonly aria: boolean;
  public readonly audioDescriptions: boolean;
  public readonly braille: boolean;
  public readonly rubyAnnotations: boolean;
  public readonly fullRubyAnnotations: boolean;
  public readonly highAudioContrast: boolean;
  public readonly highDisplayContrast: boolean;
  public readonly largePrint: boolean;
  public readonly signLanguage: boolean;
  public readonly tactileGraphics: boolean;
  public readonly tactileObjects: boolean;
  public readonly textToSpeechHinting: boolean;
  public readonly statements: AccessibilityDisplayStatement[];

  private constructor(
    pageBreakMarkers: boolean = false,
    aria: boolean = false,
    audioDescriptions: boolean = false,
    braille: boolean = false,
    rubyAnnotations: boolean = false,
    fullRubyAnnotations: boolean = false,
    highAudioContrast: boolean = false,
    highDisplayContrast: boolean = false,
    largePrint: boolean = false,
    signLanguage: boolean = false,
    tactileGraphics: boolean = false,
    tactileObjects: boolean = false,
    textToSpeechHinting: boolean = false
  ) {
    this.pageBreakMarkers = pageBreakMarkers;
    this.aria = aria;
    this.audioDescriptions = audioDescriptions;
    this.braille = braille;
    this.rubyAnnotations = rubyAnnotations;
    this.fullRubyAnnotations = fullRubyAnnotations;
    this.highAudioContrast = highAudioContrast;
    this.highDisplayContrast = highDisplayContrast;
    this.largePrint = largePrint;
    this.signLanguage = signLanguage;
    this.tactileGraphics = tactileGraphics;
    this.tactileObjects = tactileObjects;
    this.textToSpeechHinting = textToSpeechHinting;
    this.noMetadata = !pageBreakMarkers && !aria && !audioDescriptions &&
      !braille && !rubyAnnotations && !fullRubyAnnotations &&
      !highAudioContrast && !highDisplayContrast && !largePrint &&
      !signLanguage && !tactileGraphics && !tactileObjects && !textToSpeechHinting;

    this.shouldDisplay = !this.noMetadata;

    const titleLocale = Localization.getString(this.id);
    this.title = titleLocale.compact;

    this.statements = [];
    if (pageBreakMarkers) {
      const pageBreaksLocale = Localization.getString("additional-accessibility-information.page-breaks");
      this.statements.push({
        id: "additional-accessibility-information.page-breaks",
        compactString: pageBreaksLocale.compact,
        descriptiveString: pageBreaksLocale.descriptive
      });
    }
    if (aria) {
      const ariaLocale = Localization.getString("additional-accessibility-information.aria");
      this.statements.push({
        id: "additional-accessibility-information.aria",
        compactString: ariaLocale.compact,
        descriptiveString: ariaLocale.descriptive
      });
    }
    if (audioDescriptions) {
      const audioDescLocale = Localization.getString("additional-accessibility-information.audio-descriptions");
      this.statements.push({
        id: "additional-accessibility-information.audio-descriptions",
        compactString: audioDescLocale.compact,
        descriptiveString: audioDescLocale.descriptive
      });
    }
    if (braille) {
      const brailleLocale = Localization.getString("additional-accessibility-information.braille");
      this.statements.push({
        id: "additional-accessibility-information.braille",
        compactString: brailleLocale.compact,
        descriptiveString: brailleLocale.descriptive
      });
    }
    if (rubyAnnotations) {
      const rubyLocale = Localization.getString("additional-accessibility-information.ruby-annotations");
      this.statements.push({
        id: "additional-accessibility-information.ruby-annotations",
        compactString: rubyLocale.compact,
        descriptiveString: rubyLocale.descriptive
      });
    }
    if (fullRubyAnnotations) {
      const fullRubyLocale = Localization.getString("additional-accessibility-information.full-ruby-annotations");
      this.statements.push({
        id: "additional-accessibility-information.full-ruby-annotations",
        compactString: fullRubyLocale.compact,
        descriptiveString: fullRubyLocale.descriptive
      });
    }
    if (highAudioContrast) {
      const audioContrastLocale = Localization.getString("additional-accessibility-information.high-contrast-between-foreground-and-background-audio");
      this.statements.push({
        id: "additional-accessibility-information.high-contrast-between-foreground-and-background-audio",
        compactString: audioContrastLocale.compact,
        descriptiveString: audioContrastLocale.descriptive
      });
    }
    if (highDisplayContrast) {
      const displayContrastLocale = Localization.getString("additional-accessibility-information.high-contrast-between-text-and-background");
      this.statements.push({
        id: "additional-accessibility-information.high-contrast-between-text-and-background",
        compactString: displayContrastLocale.compact,
        descriptiveString: displayContrastLocale.descriptive
      });
    }
    if (largePrint) {
      const largePrintLocale = Localization.getString("additional-accessibility-information.large-print");
      this.statements.push({
        id: "additional-accessibility-information.large-print",
        compactString: largePrintLocale.compact,
        descriptiveString: largePrintLocale.descriptive
      });
    }
    if (signLanguage) {
      const signLanguageLocale = Localization.getString("additional-accessibility-information.sign-language");
      this.statements.push({
        id: "additional-accessibility-information.sign-language",
        compactString: signLanguageLocale.compact,
        descriptiveString: signLanguageLocale.descriptive
      });
    }
    if (tactileGraphics) {
      const tactileGraphicsLocale = Localization.getString("additional-accessibility-information.tactile-graphics");
      this.statements.push({
        id: "additional-accessibility-information.tactile-graphics",
        compactString: tactileGraphicsLocale.compact,
        descriptiveString: tactileGraphicsLocale.descriptive
      });
    }
    if (tactileObjects) {
      const tactileObjectsLocale = Localization.getString("additional-accessibility-information.tactile-objects");
      this.statements.push({
        id: "additional-accessibility-information.tactile-objects",
        compactString: tactileObjectsLocale.compact,
        descriptiveString: tactileObjectsLocale.descriptive
      });
    }
    if (textToSpeechHinting) {
      const ttsHintingLocale = Localization.getString("additional-accessibility-information.text-to-speech-hinting");
      this.statements.push({
        id: "additional-accessibility-information.text-to-speech-hinting",
        compactString: ttsHintingLocale.compact,
        descriptiveString: ttsHintingLocale.descriptive
      });
    }
  }

  public static fromPublication(publication: Publication): AdditionalInformation {
    const a11y = publication.metadata.accessibility ?? new Accessibility();
    const features = a11y.feature ?? [];

    return new AdditionalInformation(
      features.some(f => f.value === Feature.PAGE_BREAK_MARKERS.value || f.value === Feature.PRINT_PAGE_NUMBERS.value),
      features.some(f => f.value === Feature.ARIA.value),
      features.some(f => f.value === Feature.AUDIO_DESCRIPTION.value),
      features.some(f => f.value === Feature.BRAILLE.value),
      features.some(f => f.value === Feature.RUBY_ANNOTATIONS.value),
      features.some(f => f.value === Feature.FULL_RUBY_ANNOTATIONS.value),
      features.some(f => f.value === Feature.HIGH_CONTRAST_AUDIO.value),
      features.some(f => f.value === Feature.HIGH_CONTRAST_DISPLAY.value),
      features.some(f => f.value === Feature.LARGE_PRINT.value),
      features.some(f => f.value === Feature.SIGN_LANGUAGE.value),
      features.some(f => f.value === Feature.TACTILE_GRAPHIC.value),
      features.some(f => f.value === Feature.TACTILE_OBJECT.value),
      features.some(f => f.value === Feature.TTS_MARKUP.value)
    );
  }
}

export enum HazardType {
  yes = 'yes',
  no = 'no',
  unknown = 'unknown',
  noMetadata = 'noMetadata'
}

/**
 * Represents potential hazards in the content
 */
export class Hazards implements AccessibilityDisplayField {
  public readonly id = "hazards.title";
  public readonly title: string;
  public readonly shouldDisplay: boolean;
  public readonly noMetadata: boolean;
  public readonly noHazards: boolean;
  public readonly unknown: boolean;
  public readonly flashing: HazardType;
  public readonly motion: HazardType;
  public readonly sound: HazardType;
  public readonly statements: AccessibilityDisplayStatement[];

  private constructor(
    flashing: HazardType = HazardType.unknown,
    motion: HazardType = HazardType.unknown,
    sound: HazardType = HazardType.unknown
  ) {
    this.flashing = flashing;
    this.motion = motion;
    this.sound = sound;

    const titleLocale = Localization.getString(this.id);
    this.title = titleLocale.compact;

    this.noMetadata = flashing === HazardType.noMetadata && motion === HazardType.noMetadata && sound === HazardType.noMetadata;
    this.noHazards = flashing === HazardType.no && motion === HazardType.no && sound === HazardType.no;
    this.unknown = flashing === HazardType.unknown && motion === HazardType.unknown && sound === HazardType.unknown;

    this.shouldDisplay = !this.noMetadata;

    this.statements = [];
    if (this.noHazards) {
      const noneLocale = Localization.getString("hazards.none");
      this.statements.push({
        id: "hazards.none",
        compactString: noneLocale.compact,
        descriptiveString: noneLocale.descriptive
      });
    } else if (this.unknown) {
      const unknownLocale = Localization.getString("hazards.unknown");
      this.statements.push({
        id: "hazards.unknown",
        compactString: unknownLocale.compact,
        descriptiveString: unknownLocale.descriptive
      });
    } else if (this.noMetadata) {
      const noMetadataLocale = Localization.getString("hazards.no-metadata");
      this.statements.push({
        id: "hazards.no-metadata",
        compactString: noMetadataLocale.compact,
        descriptiveString: noMetadataLocale.descriptive
      });
    } else {
      if (flashing === HazardType.yes) {
        const flashingLocale = Localization.getString("hazards.flashing");
        this.statements.push({
          id: "hazards.flashing",
          compactString: flashingLocale.compact,
          descriptiveString: flashingLocale.descriptive
        });
      } else if (flashing === HazardType.unknown) {
        const flashingUnknownLocale = Localization.getString("hazards.flashing-unknown");
        this.statements.push({
          id: "hazards.flashing-unknown",
          compactString: flashingUnknownLocale.compact,
          descriptiveString: flashingUnknownLocale.descriptive
        });
      } else if (flashing === HazardType.no) {
        const flashingNoneLocale = Localization.getString("hazards.flashing-none");
        this.statements.push({
          id: "hazards.flashing-none",
          compactString: flashingNoneLocale.compact,
          descriptiveString: flashingNoneLocale.descriptive
        });
      }
      if (motion === HazardType.yes) {
        const motionLocale = Localization.getString("hazards.motion");
        this.statements.push({
          id: "hazards.motion",
          compactString: motionLocale.compact,
          descriptiveString: motionLocale.descriptive
        });
      } else if (motion === HazardType.unknown) {
        const motionUnknownLocale = Localization.getString("hazards.motion-unknown");
        this.statements.push({
          id: "hazards.motion-unknown",
          compactString: motionUnknownLocale.compact,
          descriptiveString: motionUnknownLocale.descriptive
        });
      } else if (motion === HazardType.no) {
        const motionNoneLocale = Localization.getString("hazards.motion-none");
        this.statements.push({
          id: "hazards.motion-none",
          compactString: motionNoneLocale.compact,
          descriptiveString: motionNoneLocale.descriptive
        });
      }
      if (sound === HazardType.yes) {
        const soundLocale = Localization.getString("hazards.sound");
        this.statements.push({
          id: "hazards.sound",
          compactString: soundLocale.compact,
          descriptiveString: soundLocale.descriptive
        });
      } else if (sound === HazardType.unknown) {
        const soundUnknownLocale = Localization.getString("hazards.sound-unknown");
        this.statements.push({
          id: "hazards.sound-unknown",
          compactString: soundUnknownLocale.compact,
          descriptiveString: soundUnknownLocale.descriptive
        });
      } else if (sound === HazardType.no) {
        const soundNoneLocale = Localization.getString("hazards.sound-none");
        this.statements.push({
          id: "hazards.sound-none",
          compactString: soundNoneLocale.compact,
          descriptiveString: soundNoneLocale.descriptive
        });
      }
    }
  }

  public static fromPublication(publication: Publication): Hazards {
    const hazards = publication.metadata.accessibility?.hazard ?? [];

    let fallback: HazardType;
    if (hazards.some(h => h.value === Hazard.NONE.value)) {
      fallback = HazardType.no;
    } else if (hazards.some(h => h.value === Hazard.UNKNOWN.value)) {
      fallback = HazardType.unknown;
    } else {
      fallback = HazardType.noMetadata;
    }

    let flashing: HazardType;
    if (hazards.some(h => h.value === Hazard.FLASHING.value)) {
      flashing = HazardType.yes;
    } else if (hazards.some(h => h.value === Hazard.NO_FLASHING_HAZARD.value)) {
      flashing = HazardType.no;
    } else if (hazards.some(h => h.value === Hazard.UNKNOWN_FLASHING_HAZARD.value)) {
      flashing = HazardType.unknown;
    } else {
      flashing = fallback;
    }

    let motion: HazardType;
    if (hazards.some(h => h.value === Hazard.MOTION_SIMULATION.value)) {
      motion = HazardType.yes;
    } else if (hazards.some(h => h.value === Hazard.NO_MOTION_SIMULATION_HAZARD.value)) {
      motion = HazardType.no;
    } else if (hazards.some(h => h.value === Hazard.UNKNOWN_MOTION_SIMULATION_HAZARD.value)) {
      motion = HazardType.unknown;
    } else {
      motion = fallback;
    }

    let sound: HazardType;
    if (hazards.some(h => h.value === Hazard.SOUND.value)) {
      sound = HazardType.yes;
    } else if (hazards.some(h => h.value === Hazard.NO_SOUND_HAZARD.value)) {
      sound = HazardType.no;
    } else if (hazards.some(h => h.value === Hazard.UNKNOWN_SOUND_HAZARD.value)) {
      sound = HazardType.unknown;
    } else {
      sound = fallback;
    }

    return new Hazards(flashing, motion, sound);
  }
}

/**
* Represents conformance to accessibility standards
*/
export class Conformance implements AccessibilityDisplayField {
  public readonly id = "conformance.title";
  public readonly title: string;
  public readonly shouldDisplay: boolean;
  public readonly profiles: AccessibilityProfile[];
  public readonly statements: AccessibilityDisplayStatement[];

  private constructor(profiles: AccessibilityProfile[] = []) {
    this.profiles = profiles;

    // This should be displayed even if there is no metadata
    this.shouldDisplay = true;

    const titleLocale = Localization.getString(this.id);
    this.title = titleLocale.compact;

    this.statements = [];
    if (profiles.length === 0) {
      const noConformanceLocale = Localization.getString("conformance.no");
      this.statements.push({
        id: "conformance.no",
        compactString: noConformanceLocale.compact,
        descriptiveString: noConformanceLocale.descriptive
      });
      return;
    }

    if (profiles.some(profile => profile.isWCAGLevelAAA)) {
      const aaaLocale = Localization.getString("conformance.aaa");
      this.statements.push({
        id: "conformance.aaa",
        compactString: aaaLocale.compact,
        descriptiveString: aaaLocale.descriptive
      });
    } else if (profiles.some(profile => profile.isWCAGLevelAA)) {
      const aaLocale = Localization.getString("conformance.aa");
      this.statements.push({
        id: "conformance.aa",
        compactString: aaLocale.compact,
        descriptiveString: aaLocale.descriptive
      });
    } else if (profiles.some(profile => profile.isWCAGLevelA)) {
      const aLocale = Localization.getString("conformance.a");
      this.statements.push({
        id: "conformance.a",
        compactString: aLocale.compact,
        descriptiveString: aLocale.descriptive
      });
    } else {
      const unknownLocale = Localization.getString("conformance.unknown-standard");
      this.statements.push({
        id: "conformance.unknown-standard",
        compactString: unknownLocale.compact,
        descriptiveString: unknownLocale.descriptive
      });
    }
  }

  public static fromPublication(publication: Publication): Conformance {
    const profiles = publication.metadata.accessibility?.conformsTo ?? [];
    return new Conformance(profiles);
  }
}
/**
 * Represents legal exemptions
 */
export class Legal implements AccessibilityDisplayField {
  public readonly id = "legal-considerations.title";
  public readonly title: string;
  public readonly shouldDisplay: boolean;
  public readonly exemption: boolean;
  public readonly statements: AccessibilityDisplayStatement[];

  private constructor(
    exemption: boolean = false
  ) {
    this.exemption = exemption;
    this.shouldDisplay = this.exemption;

    const titleLocale = Localization.getString(this.id);
    this.title = titleLocale.compact;

    this.statements = [];
    if (exemption) {
      const exemptLocale = Localization.getString("legal-considerations.exempt");
      this.statements.push({
        id: "legal-considerations.exempt",
        compactString: exemptLocale.compact,
        descriptiveString: exemptLocale.descriptive
      });
    } else {
      const noMetadataLocale = Localization.getString("legal-considerations.no-metadata");
      this.statements.push({
        id: "legal-considerations.no-metadata",
        compactString: noMetadataLocale.compact,
        descriptiveString: noMetadataLocale.descriptive
      });
    }
  }

  public static fromPublication(publication: Publication): Legal {
    const exemptions = publication.metadata.accessibility?.exemption ?? [];
    const hasExemption = exemptions.length > 0;
    return new Legal(hasExemption);
  }
}

/**
* Represents the accessibility summary
*/
export class AccessibilitySummary implements AccessibilityDisplayField {
  public readonly id = "accessibility-summary.title";
  public readonly title: string;
  public readonly shouldDisplay: boolean;

  public readonly statements: AccessibilityDisplayStatement[];

  private constructor(publication: Publication) {
    this.shouldDisplay = true;

    const titleLocale = Localization.getString(this.id);
    this.title = titleLocale.compact;

    const summary = publication.metadata.accessibility?.summary;
    this.statements = [];

    if (this.shouldDisplay && summary) {
      this.statements.push({
        id: "accessibility-summary.summary",
        compactString: summary,
        descriptiveString: summary
      });
    } else {
      const locale = Localization.getString("accessibility-summary.no-metadata");
      this.statements.push({
        id: "accessibility-summary.no-metadata",
        compactString: locale.compact,
        descriptiveString: locale.descriptive
      });
    }
  }

  public static fromPublication(publication: Publication): AccessibilitySummary {
    return new AccessibilitySummary(publication);
  }
}

/**
 * Main accessibility metadata display guide
 */
export class AccessibilityMetadataDisplayGuide {
  public readonly waysOfReading: WaysOfReading;
  public readonly navigation: Navigation;
  public readonly richContent: RichContent;
  public readonly additionalInformation: AdditionalInformation;
  public readonly hazards: Hazards;
  public readonly conformance: Conformance;
  public readonly legal: Legal;
  public readonly accessibilitySummary: AccessibilitySummary;
  public readonly fields: AccessibilityDisplayField[];

  constructor(publication: Publication) {
    this.waysOfReading = WaysOfReading.fromPublication(publication);
    this.navigation = Navigation.fromPublication(publication);
    this.richContent = RichContent.fromPublication(publication);
    this.additionalInformation = AdditionalInformation.fromPublication(publication);
    this.hazards = Hazards.fromPublication(publication);
    this.conformance = Conformance.fromPublication(publication);
    this.legal = Legal.fromPublication(publication);
    this.accessibilitySummary = AccessibilitySummary.fromPublication(publication);

    this.fields = [
      this.waysOfReading,
      this.navigation,
      this.richContent,
      this.additionalInformation,
      this.hazards,
      this.conformance,
      this.legal,
      this.accessibilitySummary
    ];
  }
}
