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
    public conformsTo: Profile[];

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
        conformsTo?: Profile[],
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
                ? accessibilityJson.conformsTo.map(uri => Profile.deserialize(uri))
                .filter((profile): profile is Profile => profile !== undefined)
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

export class Profile {
    public readonly uri: string;

    constructor(uri: string) {
        this.uri = uri;
    }

    public static deserialize(json: any): Profile | undefined {
        if (!json || typeof json !== 'string') return;
        return new Profile(json);
    }

    public serialize(): any {
        return this.uri;
    }

    public static readonly EPUB_A11Y_10_WCAG_20_A = new Profile("http://www.idpf.org/epub/a11y/accessibility-20170105.html#wcag-a");
    public static readonly EPUB_A11Y_10_WCAG_20_AA = new Profile("http://www.idpf.org/epub/a11y/accessibility-20170105.html#wcag-aa");
    public static readonly EPUB_A11Y_10_WCAG_20_AAA = new Profile("http://www.idpf.org/epub/a11y/accessibility-20170105.html#wcag-aaa");
    public static readonly EPUB_A11Y_11_WCAG_20_A = new Profile("https://www.w3.org/TR/epub-a11y-11#wcag-2.0-a");
    public static readonly EPUB_A11Y_11_WCAG_20_AA = new Profile("https://www.w3.org/TR/epub-a11y-11#wcag-2.0-aa");
    public static readonly EPUB_A11Y_11_WCAG_20_AAA = new Profile("https://www.w3.org/TR/epub-a11y-11#wcag-2.0-aaa");
    public static readonly EPUB_A11Y_11_WCAG_21_A = new Profile("https://www.w3.org/TR/epub-a11y-11#wcag-2.1-a");
    public static readonly EPUB_A11Y_11_WCAG_21_AA = new Profile("https://www.w3.org/TR/epub-a11y-11#wcag-2.1-aa");
    public static readonly EPUB_A11Y_11_WCAG_21_AAA = new Profile("https://www.w3.org/TR/epub-a11y-11#wcag-2.1-aaa");
    public static readonly EPUB_A11Y_11_WCAG_22_A = new Profile("https://www.w3.org/TR/epub-a11y-11#wcag-2.2-a");
    public static readonly EPUB_A11Y_11_WCAG_22_AA = new Profile("https://www.w3.org/TR/epub-a11y-11#wcag-2.2-aa");
    public static readonly EPUB_A11Y_11_WCAG_22_AAA = new Profile("https://www.w3.org/TR/epub-a11y-11#wcag-2.2-aaa");

    public get isWCAGLevelA(): boolean {
        return this === Profile.EPUB_A11Y_10_WCAG_20_A ||
               this === Profile.EPUB_A11Y_11_WCAG_20_A ||
               this === Profile.EPUB_A11Y_11_WCAG_21_A ||
               this === Profile.EPUB_A11Y_11_WCAG_22_A;
    }

    public get isWCAGLevelAA(): boolean {
        return this === Profile.EPUB_A11Y_10_WCAG_20_AA ||
               this === Profile.EPUB_A11Y_11_WCAG_20_AA ||
               this === Profile.EPUB_A11Y_11_WCAG_21_AA ||
               this === Profile.EPUB_A11Y_11_WCAG_22_AA;
    }

    public get isWCAGLevelAAA(): boolean {
        return this === Profile.EPUB_A11Y_10_WCAG_20_AAA ||
               this === Profile.EPUB_A11Y_11_WCAG_20_AAA ||
               this === Profile.EPUB_A11Y_11_WCAG_21_AAA ||
               this === Profile.EPUB_A11Y_11_WCAG_22_AAA;
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

    public static deserialize(json: any): Certification | undefined {
        if (!json || typeof json !== 'object') return;
        return new Certification(
            json.certifiedBy,
            json.credential,
            json.report
        );
    }

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

    public static deserialize(json: any): AccessMode | undefined {
        if (!json || typeof json !== 'string') return;
        return new AccessMode(json);
    }

    public serialize(): any {
        return this.value;
    }

    public static readonly AUDITORY = new AccessMode("auditory");
    public static readonly CHART_ON_VISUAL = new AccessMode("chartOnVisual");
    public static readonly CHEM_ON_VISUAL = new AccessMode("chemOnVisual");
    public static readonly COLOR_DEPENDENT = new AccessMode("colorDependent");
    public static readonly DIAGRAM_ON_VISUAL = new AccessMode("diagramOnVisual");
    public static readonly MATH_ON_VISUAL = new AccessMode("mathOnVisual");
    public static readonly MUSIC_ON_VISUAL = new AccessMode("musicOnVisual");
    public static readonly TACTILE = new AccessMode("tactile");
    public static readonly TEXT_ON_VISUAL = new AccessMode("textOnVisual");
    public static readonly TEXTUAL = new AccessMode("textual");
    public static readonly VISUAL = new AccessMode("visual");
}

export class PrimaryAccessMode {
    public readonly value!: string | string[];
    private static readonly VALID_MODES = new Set(["auditory", "tactile", "textual", "visual"]);

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

    public serialize(): string | string[] {
        return this.value;
    }

    public static readonly AUDITORY = new PrimaryAccessMode("auditory");
    public static readonly TACTILE = new PrimaryAccessMode("tactile");
    public static readonly TEXTUAL = new PrimaryAccessMode("textual");
    public static readonly VISUAL = new PrimaryAccessMode("visual");
}

export class Feature {
    public readonly value: string;

    constructor(value: string) {
        this.value = value;
    }

    public static deserialize(json: any): Feature | undefined {
        if (!json || typeof json !== 'string') return;
        return new Feature(json);
    }

    public serialize(): any {
        return this.value;
    }

    public static readonly NONE = new Feature("none");
    public static readonly ANNOTATIONS = new Feature("annotations");
    public static readonly ARIA = new Feature("ARIA");
    public static readonly INDEX = new Feature("index");
    public static readonly PAGE_BREAK_MARKERS = new Feature("pageBreakMarkers");
    public static readonly PAGE_NAVIGATION = new Feature("pageNavigation");
    public static readonly PRINT_PAGE_NUMBERS = new Feature("printPageNumbers");
    public static readonly READING_ORDER = new Feature("readingOrder");
    public static readonly STRUCTURAL_NAVIGATION = new Feature("structuralNavigation");
    public static readonly TABLE_OF_CONTENTS = new Feature("tableOfContents");
    public static readonly TAGGED_PDF = new Feature("taggedPDF");
    public static readonly ALTERNATIVE_TEXT = new Feature("alternativeText");
    public static readonly AUDIO_DESCRIPTION = new Feature("audioDescription");
    public static readonly CAPTIONS = new Feature("captions");
    public static readonly CLOSED_CAPTIONS = new Feature("closedCaptions");
    public static readonly DESCRIBED_MATH = new Feature("describedMath");
    public static readonly LONG_DESCRIPTION = new Feature("longDescription");
    public static readonly OPEN_CAPTIONS = new Feature("openCaptions");
    public static readonly SIGN_LANGUAGE = new Feature("signLanguage");
    public static readonly TRANSCRIPT = new Feature("transcript");
    public static readonly DISPLAY_TRANSFORMABILITY = new Feature("displayTransformability");
    public static readonly SYNCHRONIZED_AUDIO_TEXT = new Feature("synchronizedAudioText");
    public static readonly TIMING_CONTROL = new Feature("timingControl");
    public static readonly UNLOCKED = new Feature("unlocked");
    public static readonly CHEM_ML = new Feature("ChemML");
    public static readonly LATEX = new Feature("latex");
    public static readonly LATEX_CHEMISTRY = new Feature("latex-chemistry");
    public static readonly MATH_ML = new Feature("MathML");
    public static readonly MATH_ML_CHEMISTRY = new Feature("MathML-chemistry");
    public static readonly TTS_MARKUP = new Feature("ttsMarkup");
    public static readonly HIGH_CONTRAST_AUDIO = new Feature("highContrastAudio");
    public static readonly HIGH_CONTRAST_DISPLAY = new Feature("highContrastDisplay");
    public static readonly LARGE_PRINT = new Feature("largePrint");
    public static readonly BRAILLE = new Feature("braille");
    public static readonly TACTILE_GRAPHIC = new Feature("tactileGraphic");
    public static readonly TACTILE_OBJECT = new Feature("tactileObject");
    public static readonly FULL_RUBY_ANNOTATIONS = new Feature("fullRubyAnnotations");
    public static readonly HORIZONTAL_WRITING = new Feature("horizontalWriting");
    public static readonly RUBY_ANNOTATIONS = new Feature("rubyAnnotations");
    public static readonly VERTICAL_WRITING = new Feature("verticalWriting");
    public static readonly WITH_ADDITIONAL_WORD_SEGMENTATION = new Feature("withAdditionalWordSegmentation");
    public static readonly WITHOUT_ADDITIONAL_WORD_SEGMENTATION = new Feature("withoutAdditionalWordSegmentation");
}

export class Hazard {
    public readonly value: string;

    constructor(value: string) {
        this.value = value;
    }

    public static deserialize(json: any): Hazard | undefined {
        if (!json || typeof json !== 'string') return;
        return new Hazard(json);
    }

    public serialize(): any {
        return this.value;
    }

    public static readonly FLASHING = new Hazard("flashing");
    public static readonly NO_FLASHING_HAZARD = new Hazard("noFlashingHazard");
    public static readonly UNKNOWN_FLASHING_HAZARD = new Hazard("unknownFlashingHazard");
    public static readonly MOTION_SIMULATION = new Hazard("motionSimulation");
    public static readonly NO_MOTION_SIMULATION_HAZARD = new Hazard("noMotionSimulationHazard");
    public static readonly UNKNOWN_MOTION_SIMULATION_HAZARD = new Hazard("unknownMotionSimulationHazard");
    public static readonly SOUND = new Hazard("sound");
    public static readonly NO_SOUND_HAZARD = new Hazard("noSoundHazard");
    public static readonly UNKNOWN_SOUND_HAZARD = new Hazard("unknownSoundHazard");
    public static readonly UNKNOWN = new Hazard("unknown");
    public static readonly NONE = new Hazard("none");
}

export class Exemption {
    public readonly value: string;

    constructor(value: string) {
        this.value = value;
    }

    public static deserialize(json: any): Exemption | undefined {
        if (!json || typeof json !== 'string') return;
        return new Exemption(json);
    }

    public serialize(): any {
        return this.value;
    }

    public static readonly NONE = new Exemption("none");
    public static readonly DOCUMENTED = new Exemption("documented");
    public static readonly LEGAL = new Exemption("legal");
    public static readonly TEMPORARY = new Exemption("temporary");
    public static readonly TECHNICAL = new Exemption("technical");

    public static readonly EAA_DISPROPORTIONATE_BURDEN = new Exemption("eaa-disproportionate-burden");
    public static readonly EAA_FUNDAMENTAL_ALTERATION = new Exemption("eaa-fundamental-alteration");
    public static readonly EAA_MICROENTERPRISE = new Exemption("eaa-microenterprise");
    public static readonly EAA_TECHNICAL_IMPOSSIBILITY = new Exemption("eaa-technical-impossibility");
    public static readonly EAA_TEMPORARY = new Exemption("eaa-temporary");
}
