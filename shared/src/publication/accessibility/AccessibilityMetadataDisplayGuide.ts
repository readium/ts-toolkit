import { Accessibility, Feature, AccessMode, PrimaryAccessMode, Hazard } from './Accessibility';
import { Publication } from '../Publication';
import { AccessibilityDisplayString } from './AccessibilityDisplayString';
import { EPUBLayout } from '../epub';
import { Profile } from './Accessibility';

/**
 * Represents a single accessibility claim
 */
export interface AccessibilityDisplayStatement {
  displayId: string;
  values?: any[];
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
  public readonly id = AccessibilityDisplayString.WaysOfReadingTitle;
  public readonly title = 'Ways of Reading';
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

    this.statements = [];
    this.statements.push({
      displayId: visualAdjustments === VisualAdjustments.Modifiable
        ? AccessibilityDisplayString.WaysOfReadingVisualAdjustmentsModifiable
        : visualAdjustments === VisualAdjustments.Unmodifiable
          ? AccessibilityDisplayString.WaysOfReadingVisualAdjustmentsUnmodifiable
          : AccessibilityDisplayString.WaysOfReadingVisualAdjustmentsUnknown
    });
    this.statements.push({
      displayId: nonvisualReading === NonvisualReading.Readable
        ? AccessibilityDisplayString.WaysOfReadingNonvisualReadingReadable
        : nonvisualReading === NonvisualReading.NotFully
          ? AccessibilityDisplayString.WaysOfReadingNonvisualReadingNotFully
          : nonvisualReading === NonvisualReading.Unreadable
            ? AccessibilityDisplayString.WaysOfReadingNonvisualReadingNone
            : AccessibilityDisplayString.WaysOfReadingNonvisualReadingNoMetadata
    });
    if (nonvisualReadingAltText) {
      this.statements.push({
        displayId: AccessibilityDisplayString.WaysOfReadingNonvisualReadingAltText
      });
    }
    this.statements.push({
      displayId: prerecordedAudio === PrerecordedAudio.Synchronized
        ? AccessibilityDisplayString.WaysOfReadingPrerecordedAudioSynchronized
        : prerecordedAudio === PrerecordedAudio.AudioOnly
          ? AccessibilityDisplayString.WaysOfReadingPrerecordedAudioOnly
          : prerecordedAudio === PrerecordedAudio.AudioComplementary
            ? AccessibilityDisplayString.WaysOfReadingPrerecordedAudioComplementary
            : AccessibilityDisplayString.WaysOfReadingPrerecordedAudioNoMetadata
    });
  }

  public static fromPublication(publication: Publication): WaysOfReading {
    const a11y = publication.metadata.accessibility ?? new Accessibility();
    const features = a11y.feature ?? [];
    const isFXL = publication.metadata.getPresentation()?.layout === EPUBLayout.fixed;

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
  public readonly id = AccessibilityDisplayString.NavigationTitle;
  public readonly title = 'Navigation';
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

    this.shouldDisplay = !this.noMetadata;

    this.statements = [];
    if (tableOfContents) {
      this.statements.push({
        displayId: AccessibilityDisplayString.NavigationToc
      });
    }
    if (index) {
      this.statements.push({
        displayId: AccessibilityDisplayString.NavigationIndex
      });
    }
    if (headings) {
      this.statements.push({
        displayId: AccessibilityDisplayString.NavigationStructural
      });
    }
    if (page) {
      this.statements.push({
        displayId: AccessibilityDisplayString.NavigationPageNavigation
      });
    }

    if (this.statements.length === 0) {
      this.statements.push({
        displayId: AccessibilityDisplayString.NavigationNoMetadata
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
  public readonly id = AccessibilityDisplayString.RichContentTitle;
  public readonly title = 'Rich Content';
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

    this.statements = [];
    if (extendedAltTextDescriptions) {
      this.statements.push({
        displayId: AccessibilityDisplayString.RichContentExtended
      });
    }
    if (mathFormula) {
      this.statements.push({
        displayId: AccessibilityDisplayString.RichContentAccessibleMathDescribed
      });
    }
    if (mathFormulaAsMathML) {
      this.statements.push({
        displayId: AccessibilityDisplayString.RichContentAccessibleMathAsMathml
      });
    }
    if (mathFormulaAsLaTeX) {
      this.statements.push({
        displayId: AccessibilityDisplayString.RichContentAccessibleMathAsLatex
      });
    }
    if (chemicalFormulaAsMathML) {
      this.statements.push({
        displayId: AccessibilityDisplayString.RichContentAccessibleChemistryAsMathml
      });
    }
    if (chemicalFormulaAsLaTeX) {
      this.statements.push({
        displayId: AccessibilityDisplayString.RichContentAccessibleChemistryAsLatex
      });
    }
    if (closedCaptions) {
      this.statements.push({
        displayId: AccessibilityDisplayString.RichContentClosedCaptions
      });
    }
    if (openCaptions) {
      this.statements.push({
        displayId: AccessibilityDisplayString.RichContentOpenCaptions
      });
    }
    if (transcript) {
      this.statements.push({
        displayId: AccessibilityDisplayString.RichContentTranscript
      });
    }

    if (this.statements.length === 0) {
      this.statements.push({
        displayId: AccessibilityDisplayString.RichContentUnknown
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
  public readonly id = AccessibilityDisplayString.AdditionalInformationTitle;
  public readonly title = 'Additional Information';
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

    this.statements = [];
    if (pageBreakMarkers) {
      this.statements.push({
        displayId: AccessibilityDisplayString.AdditionalInformationPageBreaks
      });
    }
    if (aria) {
      this.statements.push({
        displayId: AccessibilityDisplayString.AdditionalInformationAria
      });
    }
    if (audioDescriptions) {
      this.statements.push({
        displayId: AccessibilityDisplayString.AdditionalInformationAudioDescriptions
      });
    }
    if (braille) {
      this.statements.push({
        displayId: AccessibilityDisplayString.AdditionalInformationBraille
      });
    }
    if (rubyAnnotations) {
      this.statements.push({
        displayId: AccessibilityDisplayString.AdditionalInformationRubyAnnotations
      });
    }
    if (fullRubyAnnotations) {
      this.statements.push({
        displayId: AccessibilityDisplayString.AdditionalInformationFullRubyAnnotations
      });
    }
    if (highAudioContrast) {
      this.statements.push({
        displayId: AccessibilityDisplayString.AdditionalInformationHighContrastBetweenForegroundAndBackgroundAudio
      });
    }
    if (highDisplayContrast) {
      this.statements.push({
        displayId: AccessibilityDisplayString.AdditionalInformationHighContrastBetweenTextAndBackground
      });
    }
    if (largePrint) {
      this.statements.push({
        displayId: AccessibilityDisplayString.AdditionalInformationLargePrint
      });
    }
    if (signLanguage) {
      this.statements.push({
        displayId: AccessibilityDisplayString.AdditionalInformationSignLanguage
      });
    }
    if (tactileGraphics) {
      this.statements.push({
        displayId: AccessibilityDisplayString.AdditionalInformationTactileGraphics
      });
    }
    if (tactileObjects) {
      this.statements.push({
        displayId: AccessibilityDisplayString.AdditionalInformationTactileObjects
      });
    }
    if (textToSpeechHinting) {
      this.statements.push({
        displayId: AccessibilityDisplayString.AdditionalInformationTextToSpeechHinting
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
  public readonly id = AccessibilityDisplayString.HazardsTitle;
  public readonly title = 'Hazards';
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

    this.noMetadata = flashing === HazardType.noMetadata && motion === HazardType.noMetadata && sound === HazardType.noMetadata;
    this.noHazards = flashing === HazardType.no && motion === HazardType.no && sound === HazardType.no;
    this.unknown = flashing === HazardType.unknown && motion === HazardType.unknown && sound === HazardType.unknown;

    this.shouldDisplay = !this.noMetadata;

    this.statements = [];
    if (this.noHazards) {
      this.statements.push({
        displayId: AccessibilityDisplayString.HazardsNone
      });
    } else if (this.unknown) {
      this.statements.push({
        displayId: AccessibilityDisplayString.HazardsUnknown
      });
    } else if (this.noMetadata) {
      this.statements.push({
        displayId: AccessibilityDisplayString.HazardsNoMetadata
      });
    } else {
      if (flashing === HazardType.yes) {
        this.statements.push({
          displayId: AccessibilityDisplayString.HazardsFlashing
        });
      } else if (flashing === HazardType.unknown) {
        this.statements.push({
          displayId: AccessibilityDisplayString.HazardsFlashingUnknown
        });
      } else if (flashing === HazardType.no) {
        this.statements.push({
          displayId: AccessibilityDisplayString.HazardsFlashingNone
        });
      }
      if (motion === HazardType.yes) {
        this.statements.push({
          displayId: AccessibilityDisplayString.HazardsMotion
        });
      } else if (motion === HazardType.unknown) {
        this.statements.push({
          displayId: AccessibilityDisplayString.HazardsMotionUnknown
        });
      } else if (motion === HazardType.no) {
        this.statements.push({
          displayId: AccessibilityDisplayString.HazardsMotionNone
        });
      }
      if (sound === HazardType.yes) {
        this.statements.push({
          displayId: AccessibilityDisplayString.HazardsSound
        });
      } else if (sound === HazardType.unknown) {
        this.statements.push({
          displayId: AccessibilityDisplayString.HazardsSoundUnknown
        });
      } else if (sound === HazardType.no) {
        this.statements.push({
          displayId: AccessibilityDisplayString.HazardsSoundNone
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
  public readonly id = AccessibilityDisplayString.ConformanceTitle;
  public readonly title = 'Conformance';
  public readonly shouldDisplay: boolean;
  public readonly profiles: Profile[];
  public readonly statements: AccessibilityDisplayStatement[];

  private constructor(profiles: Profile[] = []) {
    this.profiles = profiles;
    
    // This should be displayed even if there is no metadata
    this.shouldDisplay = true;

    this.statements = [];
    if (profiles.length === 0) {
      this.statements.push({
        displayId: AccessibilityDisplayString.ConformanceNo
      });
      return;
    }

    if (profiles.some(profile => profile.isWCAGLevelAAA)) {
      this.statements.push({
        displayId: AccessibilityDisplayString.ConformanceAaa
      });
    } else if (profiles.some(profile => profile.isWCAGLevelAA)) {
      this.statements.push({
        displayId: AccessibilityDisplayString.ConformanceAa
      });
    } else if (profiles.some(profile => profile.isWCAGLevelA)) {
      this.statements.push({
        displayId: AccessibilityDisplayString.ConformanceA
      });
    } else {
      this.statements.push({
        displayId: AccessibilityDisplayString.ConformanceUnknownStandard
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
  public readonly id = AccessibilityDisplayString.LegalConsiderationsTitle;
  public readonly title = 'Legal';
  public readonly shouldDisplay: boolean;
  public readonly exemption: boolean;
  public readonly statements: AccessibilityDisplayStatement[];

  private constructor(
    exemption: boolean = false
  ) {
    this.exemption = exemption;
    this.shouldDisplay = this.exemption;

    this.statements = [];
    if (exemption) {
      this.statements.push({
        displayId: AccessibilityDisplayString.LegalConsiderationsExempt
      });
    } else {
      this.statements.push({
        displayId: AccessibilityDisplayString.LegalConsiderationsNoMetadata
      });
    }
  }

  public static fromPublication(publication: Publication): Legal {
    const exemptions = publication.metadata.accessibility?.exemption ?? [];
    return new Legal(exemptions.length > 0);
  }
}

/**
* Represents the accessibility summary
*/
export class AccessibilitySummary implements AccessibilityDisplayField {
  public readonly id = AccessibilityDisplayString.AccessibilitySummaryTitle;
  public readonly title = 'Accessibility Summary';
  public readonly shouldDisplay: boolean;

  public readonly summary: string | undefined | null;
  public readonly statements: AccessibilityDisplayStatement[];

  private constructor(
    summary: string | undefined | null
  ) {
    this.summary = summary;
    this.shouldDisplay = !!summary;

    this.statements = [];
    if (this.shouldDisplay && summary) {
      this.statements.push({
        displayId: "summary", 
        values: [summary]
      });
    } else {
      this.statements.push({
        displayId: AccessibilityDisplayString.AccessibilitySummaryNoMetadata
      });
    }
  }

  public static fromPublication(publication: Publication): AccessibilitySummary {
    const a11y = publication.metadata.accessibility;
    return new AccessibilitySummary(a11y?.summary);
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