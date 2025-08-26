/* Copyright 2025 Readium Foundation. All rights reserved.
 * Use of this source code is governed by a BSD-style license,
 * available in the LICENSE file present in the Github repository of the project.
 */

/**
 * Holds the accessibility metadata of a Publication.
 *
 * https://www.w3.org/2021/a11y-discov-vocab/latest/
 * https://readium.org/webpub-manifest/schema/a11y.schema.json
 */
export class Accessibility {
    /**
     * An established standard to which the described resource conforms.
     */
    public conformsTo: AccessibilityProfile[];

    /**
     * Certification of accessible publications.
     */
    public certification: Certification | null;

    /**
     * A human-readable summary of specific accessibility features or deficiencies.
     */
    public summary: string | null;

    /**
     * The human sensory perceptual system through which a person may process or perceive information.
     */
    public accessMode: AccessMode[];

    /**
     * A list of single or combined accessModes that are sufficient to understand all the intellectual content.
     */
    public accessModeSufficient: PrimaryAccessMode[];

    /**
     * Content features of the resource.
     */
    public feature: Feature[];

    /**
     * A characteristic of the described resource that is physiologically dangerous to some users.
     */
    public hazard: Hazard[];

    /**
     * Justifications for non-conformance based on exemptions in a given jurisdiction.
     */
    public exemption: Exemption[];

    constructor(values: {
        conformsTo?: AccessibilityProfile[],
        certification?: Certification | null,
        summary?: string | null,
        accessMode?: AccessMode[],
        accessModeSufficient?: PrimaryAccessMode[],
        feature?: Feature[],
        hazard?: Hazard[],
        exemption?: Exemption[]
    } = {}) {
        this.conformsTo = values.conformsTo ?? [];
        this.certification = values.certification ?? null;
        this.summary = values.summary ?? null;
        this.accessMode = values.accessMode ?? [];
        this.accessModeSufficient = values.accessModeSufficient ?? [];
        this.feature = values.feature ?? [];
        this.hazard = values.hazard ?? [];
        this.exemption = values.exemption ?? [];
    }

    /**
     * Parses an [Accessibility] from its RWPM JSON representation.
     */
    public static deserialize(json: Record<string, any> | string): Accessibility | undefined {
        if (!json || typeof json !== 'object') return;

        type AccessibilityJson = {
            conformsTo?: string[];
            certification?: {
                certifiedBy: string;
                credential: string;
                report: string;
            };
            summary?: string;
            accessMode?: string[];
            accessModeSufficient?: string[][];
            feature?: string[];
            hazard?: string[];
            exemption?: string[];
        };

        const accessibilityJson = json as AccessibilityJson;

        return new Accessibility({
            conformsTo: accessibilityJson.conformsTo 
                ? accessibilityJson.conformsTo.map(uri => AccessibilityProfile.deserialize(uri))
                .filter((profile): profile is AccessibilityProfile => profile !== undefined)
                : undefined,
            certification: accessibilityJson.certification 
                ? Certification.deserialize(accessibilityJson.certification)
                : undefined,
            summary: accessibilityJson.summary,
            accessMode: accessibilityJson.accessMode 
                ? accessibilityJson.accessMode.map(value => AccessMode.deserialize(value))
                .filter((mode): mode is AccessMode => mode !== undefined)
                : undefined,
            accessModeSufficient: accessibilityJson.accessModeSufficient 
                ? accessibilityJson.accessModeSufficient.map(modes => PrimaryAccessMode.deserialize(modes))
                .filter((mode): mode is PrimaryAccessMode => mode !== undefined) 
                : undefined,
            feature: accessibilityJson.feature 
                ? accessibilityJson.feature.map(value => Feature.deserialize(value))
                .filter((feature): feature is Feature => feature !== undefined)
                : undefined,
            hazard: accessibilityJson.hazard 
                ? accessibilityJson.hazard.map(value => Hazard.deserialize(value))
                .filter((hazard): hazard is Hazard => hazard !== undefined)
                : undefined,
            exemption: accessibilityJson.exemption 
                ? accessibilityJson.exemption.map(value => Exemption.deserialize(value))
                .filter((exemption): exemption is Exemption => exemption !== undefined)
                : undefined
        });
    }

    /**
     * Serializes an [Accessibility] to its RWPM JSON representation.
     */
    public serialize(): Record<string, any> {
        const result: Record<string, any> = {};

        if (this.conformsTo?.length > 0) {
            result.conformsTo = this.conformsTo.map(profile => profile.serialize());
        }
        if (this.certification !== undefined && this.certification !== null) {
            result.certification = this.certification.serialize();
        }
        if (this.summary !== undefined && this.summary !== null) {
            result.summary = this.summary;
        }
        if (this.accessMode?.length > 0) {
            result.accessMode = this.accessMode.map(mode => mode.serialize());
        }
        if (this.accessModeSufficient?.length > 0) {
            result.accessModeSufficient = this.accessModeSufficient.map(mode => mode.serialize());
        }
        if (this.feature?.length > 0) {
            result.feature = this.feature.map(feature => feature.serialize());
        }
        if (this.hazard?.length > 0) {
            result.hazard = this.hazard.map(hazard => hazard.serialize());
        }
        if (this.exemption?.length > 0) {
            result.exemption = this.exemption.map(exemption => exemption.serialize());
        }

        return result;
    }
}

export class AccessibilityProfile {
    public readonly uri: string;

    constructor(uri: string) {
        this.uri = uri;
    }

    /**
     * Parses an [AccessibilityProfile] from its RWPM JSON representation.
     */
    public static deserialize(json: any): AccessibilityProfile | undefined {
        if (!json || typeof json !== 'string') return;
        return new AccessibilityProfile(json);
    }

    /**
     * Serializes an [AccessibilityProfile] to its RWPM JSON representation.
     */
    public serialize(): any {
        return this.uri;
    }

    /**
     * EPUB Accessibility 1.0 WCAG 2.0 A – http://www.idpf.org/epub/a11y/accessibility-20170105.html#wcag-a
     */
    public static readonly EPUB_A11Y_10_WCAG_20_A = new AccessibilityProfile('http://www.idpf.org/epub/a11y/accessibility-20170105.html#wcag-a');

    /**
     * EPUB Accessibility 1.0 WCAG 2.0 AA – http://www.idpf.org/epub/a11y/accessibility-20170105.html#wcag-aa
     */
    public static readonly EPUB_A11Y_10_WCAG_20_AA = new AccessibilityProfile('http://www.idpf.org/epub/a11y/accessibility-20170105.html#wcag-aa');

    /**
     * EPUB Accessibility 1.0 WCAG 2.0 AAA – http://www.idpf.org/epub/a11y/accessibility-20170105.html#wcag-aaa
     */
    public static readonly EPUB_A11Y_10_WCAG_20_AAA = new AccessibilityProfile('http://www.idpf.org/epub/a11y/accessibility-20170105.html#wcag-aaa');

    /**
     * EPUB Accessibility 1.1 WCAG 2.0 A – https://www.w3.org/TR/epub-a11y-11#wcag-2.0-a
     */
    public static readonly EPUB_A11Y_11_WCAG_20_A = new AccessibilityProfile('https://www.w3.org/TR/epub-a11y-11#wcag-2.0-a');

    /**
     * EPUB Accessibility 1.1 WCAG 2.0 AA – https://www.w3.org/TR/epub-a11y-11#wcag-2.0-aa
     */
    public static readonly EPUB_A11Y_11_WCAG_20_AA = new AccessibilityProfile('https://www.w3.org/TR/epub-a11y-11#wcag-2.0-aa');

    /**
     * EPUB Accessibility 1.1 WCAG 2.0 AAA – https://www.w3.org/TR/epub-a11y-11#wcag-2.0-aaa
     */
    public static readonly EPUB_A11Y_11_WCAG_20_AAA = new AccessibilityProfile('https://www.w3.org/TR/epub-a11y-11#wcag-2.0-aaa');

    /**
     * EPUB Accessibility 1.1 WCAG 2.1 A – https://www.w3.org/TR/epub-a11y-11#wcag-2.1-a
     */
    public static readonly EPUB_A11Y_11_WCAG_21_A = new AccessibilityProfile('https://www.w3.org/TR/epub-a11y-11#wcag-2.1-a');

    /**
     * EPUB Accessibility 1.1 WCAG 2.1 AA – https://www.w3.org/TR/epub-a11y-11#wcag-2.1-aa
     */
    public static readonly EPUB_A11Y_11_WCAG_21_AA = new AccessibilityProfile('https://www.w3.org/TR/epub-a11y-11#wcag-2.1-aa');

    /**
     * EPUB Accessibility 1.1 WCAG 2.1 AAA – https://www.w3.org/TR/epub-a11y-11#wcag-2.1-aaa
     */
    public static readonly EPUB_A11Y_11_WCAG_21_AAA = new AccessibilityProfile('https://www.w3.org/TR/epub-a11y-11#wcag-2.1-aaa');

    /**
     * EPUB Accessibility 1.1 WCAG 2.2 A – https://www.w3.org/TR/epub-a11y-11#wcag-2.2-a
     */
    public static readonly EPUB_A11Y_11_WCAG_22_A = new AccessibilityProfile('https://www.w3.org/TR/epub-a11y-11#wcag-2.2-a');

    /**
     * EPUB Accessibility 1.1 WCAG 2.2 AA – https://www.w3.org/TR/epub-a11y-11#wcag-2.2-aa
     */
    public static readonly EPUB_A11Y_11_WCAG_22_AA = new AccessibilityProfile('https://www.w3.org/TR/epub-a11y-11#wcag-2.2-aa');

    /**
     * EPUB Accessibility 1.1 WCAG 2.2 AAA – https://www.w3.org/TR/epub-a11y-11#wcag-2.2-aaa
     */
    public static readonly EPUB_A11Y_11_WCAG_22_AAA = new AccessibilityProfile('https://www.w3.org/TR/epub-a11y-11#wcag-2.2-aaa');

    /**
     * Returns true if the profile is a WCAG Level A profile.
     */
    public get isWCAGLevelA(): boolean {
        return this === AccessibilityProfile.EPUB_A11Y_10_WCAG_20_A ||
               this === AccessibilityProfile.EPUB_A11Y_11_WCAG_20_A ||
               this === AccessibilityProfile.EPUB_A11Y_11_WCAG_21_A ||
               this === AccessibilityProfile.EPUB_A11Y_11_WCAG_22_A;
    }

    /**
     * Returns true if the profile is a WCAG Level AA profile.
     */
    public get isWCAGLevelAA(): boolean {
        return this === AccessibilityProfile.EPUB_A11Y_10_WCAG_20_AA ||
               this === AccessibilityProfile.EPUB_A11Y_11_WCAG_20_AA ||
               this === AccessibilityProfile.EPUB_A11Y_11_WCAG_21_AA ||
               this === AccessibilityProfile.EPUB_A11Y_11_WCAG_22_AA;
    }

    /**
     * Returns true if the profile is a WCAG Level AAA profile.
     */
    public get isWCAGLevelAAA(): boolean {
        return this === AccessibilityProfile.EPUB_A11Y_10_WCAG_20_AAA ||
               this === AccessibilityProfile.EPUB_A11Y_11_WCAG_20_AAA ||
               this === AccessibilityProfile.EPUB_A11Y_11_WCAG_21_AAA ||
               this === AccessibilityProfile.EPUB_A11Y_11_WCAG_22_AAA;
    }
}

export class Certification {
    public readonly certifiedBy: string | null;
    public readonly credential: string | null;
    public readonly report: string | null;

    constructor(
        certifiedBy: string | null = null,
        credential: string | null = null,
        report: string | null = null
    ) {
        this.certifiedBy = certifiedBy;
        this.credential = credential;
        this.report = report;
    }

    /**
     * Parses a [Certification] from its RWPM JSON representation.
     */
    public static deserialize(json: any): Certification | undefined {
        if (!json || typeof json !== 'object') return;
        return new Certification(
            json.certifiedBy,
            json.credential,
            json.report
        );
    }

    /**
     * Serializes a [Certification] to its RWPM JSON representation.
     */
    public serialize(): Record<string, any> {
        const json: any = {};
        if (this.certifiedBy) {
            json.certifiedBy = this.certifiedBy;
        }
        if (this.credential) {
            json.credential = this.credential;
        }
        if (this.report) {
            json.report = this.report;
        }
        return json;
    }
}

export class AccessMode {
    public readonly value: string;

    constructor(value: string) {
        this.value = value;
    }

    /**
     * Parses an [AccessMode] from its RWPM JSON representation.
     */
    public static deserialize(json: any): AccessMode | undefined {
        if (!json || typeof json !== 'string') return;
        return new AccessMode(json);
    }

    /**
     * Serializes an [AccessMode] to its RWPM JSON representation.
     */
    public serialize(): any {
        return this.value;
    }

    /**
     * Access mode for auditory content.
     */
    public static readonly AUDITORY = new AccessMode('auditory');

    /**
     * Access mode for chart on visual content.
     */
    public static readonly CHART_ON_VISUAL = new AccessMode('chartOnVisual');

    /**
     * Access mode for chemical on visual content.
     */
    public static readonly CHEM_ON_VISUAL = new AccessMode('chemOnVisual');

    /**
     * Access mode for color dependent content.
     */
    public static readonly COLOR_DEPENDENT = new AccessMode('colorDependent');

    /**
     * Access mode for diagram on visual content.
     */
    public static readonly DIAGRAM_ON_VISUAL = new AccessMode('diagramOnVisual');

    /**
     * Access mode for math on visual content.
     */
    public static readonly MATH_ON_VISUAL = new AccessMode('mathOnVisual');

    /**
     * Access mode for music on visual content.
     */
    public static readonly MUSIC_ON_VISUAL = new AccessMode('musicOnVisual');

    /**
     * Access mode for tactile content.
     */
    public static readonly TACTILE = new AccessMode('tactile');

    /**
     * Access mode for text on visual content.
     */
    public static readonly TEXT_ON_VISUAL = new AccessMode('textOnVisual');

    /**
     * Access mode for textual content.
     */
    public static readonly TEXTUAL = new AccessMode('textual');

    /**
     * Access mode for visual content.
     */
    public static readonly VISUAL = new AccessMode('visual');
}

export class PrimaryAccessMode {
    public readonly value!: string | string[];
    private static readonly VALID_MODES = new Set(['auditory', 'tactile', 'textual', 'visual']);

    constructor(value: string | string[]) {
        if (typeof value === 'string') {
            if (!PrimaryAccessMode.VALID_MODES.has(value.toLowerCase())) {
                return;
            }
            this.value = value.toLowerCase();
        } else {
            // Filter out invalid modes and duplicates
            const validModes = value.filter(mode => 
                PrimaryAccessMode.VALID_MODES.has(mode.toLowerCase())
            );
            
            if (validModes.length === 0) {
                return;
            }
            
            this.value = Array.from(new Set(validModes));
        }
    }

    /**
     * Parses a [PrimaryAccessMode] from its RWPM JSON representation.
     */
    public static deserialize(json: any): PrimaryAccessMode | undefined {
        if (!json) return;
        
        if (typeof json === 'string') {
            return new PrimaryAccessMode(json);
        }

        if (!Array.isArray(json)) return undefined;
        
        // Create a new array with only valid modes
        const validModes = json.filter(mode => {
            if (!mode) {
                return false;
            }
            return PrimaryAccessMode.VALID_MODES.has(mode.toLowerCase());
        });

        if (validModes.length === 0) {
            return undefined;
        }

        return new PrimaryAccessMode(validModes);
    }

    /**
     * Serializes a [PrimaryAccessMode] to its RWPM JSON representation.
     */
    public serialize(): string | string[] {
        return this.value;
    }

    /**
     * Primary access mode for auditory content.
     */
    public static readonly AUDITORY = new PrimaryAccessMode('auditory');

    /**
     * Primary access mode for tactile content.
     */
    public static readonly TACTILE = new PrimaryAccessMode('tactile');

    /**
     * Primary access mode for textual content.
     */
    public static readonly TEXTUAL = new PrimaryAccessMode('textual');

    /**
     * Primary access mode for visual content.
     */
    public static readonly VISUAL = new PrimaryAccessMode('visual');
}

export class Feature {
    public readonly value: string;

    constructor(value: string) {
        this.value = value;
    }

    /**
     * Parses a [Feature] from its RWPM JSON representation.
     */
    public static deserialize(json: any): Feature | undefined {
        if (!json || typeof json !== 'string') return;
        return new Feature(json);
    }

    /**
     * Serializes a [Feature] to its RWPM JSON representation.
     */
    public serialize(): any {
        return this.value;
    }

    /**
     * Feature for no accessibility features.
     */
    public static readonly NONE = new Feature('none');

    /**
     * Feature for annotations.
     */
    public static readonly ANNOTATIONS = new Feature('annotations');

    /**
     * Feature for ARIA.
     */
    public static readonly ARIA = new Feature('ARIA');

    /**
     * Feature for index.
     */
    public static readonly INDEX = new Feature('index');

    /**
     * Feature for page break markers.
     */
    public static readonly PAGE_BREAK_MARKERS = new Feature('pageBreakMarkers');
    
    /**
     * Feature for page navigation.
     */
    public static readonly PAGE_NAVIGATION = new Feature('pageNavigation');
    
    /**
     * Feature for print page numbers.
     */
    public static readonly PRINT_PAGE_NUMBERS = new Feature('printPageNumbers');
    
    /**
     * Feature for reading order.
     */
    public static readonly READING_ORDER = new Feature('readingOrder');
    
    /**
     * Feature for structural navigation.
     */
    public static readonly STRUCTURAL_NAVIGATION = new Feature('structuralNavigation');
    
    /**
     * Feature for table of contents.
     */
    public static readonly TABLE_OF_CONTENTS = new Feature('tableOfContents');
    
    /**
     * Feature for tagged PDF.
     */
    public static readonly TAGGED_PDF = new Feature('taggedPDF');
    
    /**
     * Feature for alternative text.
     */
    public static readonly ALTERNATIVE_TEXT = new Feature('alternativeText');
    
    /**
     * Feature for audio description.
     */
    public static readonly AUDIO_DESCRIPTION = new Feature('audioDescription');
    
    /**
     * Feature for captions.
     */
    public static readonly CAPTIONS = new Feature('captions');
    
    /**
     * Feature for closed captions.
     */
    public static readonly CLOSED_CAPTIONS = new Feature('closedCaptions');
    
    /**
     * Feature for described math.
     */
    public static readonly DESCRIBED_MATH = new Feature('describedMath');
    
    /**
     * Feature for long description.
     */
    public static readonly LONG_DESCRIPTION = new Feature('longDescription');
    
    /**
     * Feature for open captions.
     */
    public static readonly OPEN_CAPTIONS = new Feature('openCaptions');
    
    /**
     * Feature for sign language.
     */
    public static readonly SIGN_LANGUAGE = new Feature('signLanguage');
    
    /**
     * Feature for transcript.
     */
    public static readonly TRANSCRIPT = new Feature('transcript');
    
    /**
     * Feature for display transformability.
     */
    public static readonly DISPLAY_TRANSFORMABILITY = new Feature('displayTransformability');
    
    /**
     * Feature for synchronized audio text.
     */
    public static readonly SYNCHRONIZED_AUDIO_TEXT = new Feature('synchronizedAudioText');
    
    /**
     * Feature for timing control.
     */
    public static readonly TIMING_CONTROL = new Feature('timingControl');
    
    /**
     * Feature for unlocked.
     */
    public static readonly UNLOCKED = new Feature('unlocked');
    
    /**
     * Feature for ChemML.
     */
    public static readonly CHEM_ML = new Feature('ChemML');
    
    /**
     * Feature for LaTeX.
     */
    public static readonly LATEX = new Feature('latex');
    
    /**
     * Feature for LaTeX chemistry.
     */
    public static readonly LATEX_CHEMISTRY = new Feature('latex-chemistry');
    
    /**
     * Feature for MathML.
     */
    public static readonly MATH_ML = new Feature('MathML');
    
    /**
     * Feature for MathML chemistry.
     */
    public static readonly MATH_ML_CHEMISTRY = new Feature('MathML-chemistry');
    
    /**
     * Feature for TTS markup.
     */
    public static readonly TTS_MARKUP = new Feature('ttsMarkup');
    
    /**
     * Feature for high contrast audio.
     */
    public static readonly HIGH_CONTRAST_AUDIO = new Feature('highContrastAudio');
    
    /**
     * Feature for high contrast display.
     */
    public static readonly HIGH_CONTRAST_DISPLAY = new Feature('highContrastDisplay');
    
    /**
     * Feature for large print.
     */
    public static readonly LARGE_PRINT = new Feature('largePrint');
    
    /**
     * Feature for braille.
     */
    public static readonly BRAILLE = new Feature('braille');
    
    /**
     * Feature for tactile graphic.
     */
    public static readonly TACTILE_GRAPHIC = new Feature('tactileGraphic');
    
    /**
     * Feature for tactile object.
     */
    public static readonly TACTILE_OBJECT = new Feature('tactileObject');
    
    /**
     * Feature for full ruby annotations.
     */
    public static readonly FULL_RUBY_ANNOTATIONS = new Feature('fullRubyAnnotations');
    
    /**
     * Feature for horizontal writing.
     */
    public static readonly HORIZONTAL_WRITING = new Feature('horizontalWriting');
    
    /**
     * Feature for ruby annotations.
     */
    public static readonly RUBY_ANNOTATIONS = new Feature('rubyAnnotations');
    
    /**
     * Feature for vertical writing.
     */
    public static readonly VERTICAL_WRITING = new Feature('verticalWriting');
    
    /**
     * Feature for additional word segmentation.
     */
    public static readonly WITH_ADDITIONAL_WORD_SEGMENTATION = new Feature('withAdditionalWordSegmentation');
    
    /**
     * Feature for lack of additional word segmentation.
     */
    public static readonly WITHOUT_ADDITIONAL_WORD_SEGMENTATION = new Feature('withoutAdditionalWordSegmentation');
}

export class Hazard {
    public readonly value: string;

    constructor(value: string) {
        this.value = value;
    }

    /**
     * Parses a [Hazard] from its RWPM JSON representation.
     */
    public static deserialize(json: any): Hazard | undefined {
        if (!json || typeof json !== 'string') return;
        return new Hazard(json);
    }

    /**
     * Serializes a [Hazard] to its RWPM JSON representation.
     */
    public serialize(): any {
        return this.value;
    }

    /**
     * Hazard for flashing.
     */
    public static readonly FLASHING = new Hazard('flashing');
    
    /**
     * Hazard for no flashing hazard.
     */
    public static readonly NO_FLASHING_HAZARD = new Hazard('noFlashingHazard');
    
    /**
     * Hazard for unknown flashing hazard.
     */
    public static readonly UNKNOWN_FLASHING_HAZARD = new Hazard('unknownFlashingHazard');
    
    /**
     * Hazard for motion simulation.
     */
    public static readonly MOTION_SIMULATION = new Hazard('motionSimulation');
    
    /**
     * Hazard for no motion simulation hazard.
     */
    public static readonly NO_MOTION_SIMULATION_HAZARD = new Hazard('noMotionSimulationHazard');
    
    /**
     * Hazard for unknown motion simulation hazard.
     */
    public static readonly UNKNOWN_MOTION_SIMULATION_HAZARD = new Hazard('unknownMotionSimulationHazard');
    
    /**
     * Hazard for sound.
     */
    public static readonly SOUND = new Hazard('sound');
    
    /**
     * Hazard for no sound hazard.
     */
    public static readonly NO_SOUND_HAZARD = new Hazard('noSoundHazard');
    
    /**
     * Hazard for unknown sound hazard.
     */
    public static readonly UNKNOWN_SOUND_HAZARD = new Hazard('unknownSoundHazard');
    
    /**
     * Hazard for unknown hazard.
     */
    public static readonly UNKNOWN = new Hazard('unknown');
    
    /**
     * Hazard for no hazard.
     */
    public static readonly NONE = new Hazard('none');
}

export class Exemption {
    public readonly value: string;

    constructor(value: string) {
        this.value = value;
    }

    /**
     * Parses an [Exemption] from its RWPM JSON representation.
     */
    public static deserialize(json: any): Exemption | undefined {
        if (!json || typeof json !== 'string') return;
        return new Exemption(json);
    }

    /**
     * Serializes an [Exemption] to its RWPM JSON representation.
     */
    public serialize(): any {
        return this.value;
    }

    /**
     * None exemption.
     */
    public static readonly NONE = new Exemption('none');
    
    /**
     * Documented exemption.
     */
    public static readonly DOCUMENTED = new Exemption('documented');
    
    /**
     * Legal exemption.
     */
    public static readonly LEGAL = new Exemption('legal');
    
    /**
     * Temporary exemption.
     */
    public static readonly TEMPORARY = new Exemption('temporary');
    
    /**
     * Technical exemption.
     */
    public static readonly TECHNICAL = new Exemption('technical');
    
    /**
     * EAA disproportionate burden exemption.
     */
    public static readonly EAA_DISPROPORTIONATE_BURDEN = new Exemption('eaa-disproportionate-burden');
    
    /**
     * EAA fundamental alteration exemption.
     */
    public static readonly EAA_FUNDAMENTAL_ALTERATION = new Exemption('eaa-fundamental-alteration');
    
    /**
     * EAA microenterprise exemption.
     */
    public static readonly EAA_MICROENTERPRISE = new Exemption('eaa-microenterprise');
    
    /**
     * EAA technical impossibility exemption.
     */
    public static readonly EAA_TECHNICAL_IMPOSSIBILITY = new Exemption('eaa-technical-impossibility');
    
    /**
     * EAA temporary exemption.
     */
    public static readonly EAA_TEMPORARY = new Exemption('eaa-temporary');
}
