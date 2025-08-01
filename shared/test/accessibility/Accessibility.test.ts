import { Accessibility, AccessibilityProfile, AccessMode, Feature, Hazard, Exemption, PrimaryAccessMode, Certification } from '../../src/publication/accessibility/Accessibility';

describe('Accessibility Tests', () => {
    it('parse undefined JSON', () => {
        expect(Accessibility.deserialize(undefined as unknown as Record<string, any> | string)).toBeUndefined();
    });

    it('parse minimal JSON', () => {
        expect(Accessibility.deserialize({})).toEqual(
            new Accessibility({})
        );
    });

    it('parse full JSON', () => {
        const json = {
            conformsTo: [
                "https://www.w3.org/TR/epub-a11y-11#wcag-2.1-aa",
                "http://www.idpf.org/epub/a11y/accessibility-20170105.html#wcag-aa"
            ],
            certification: {
                certifiedBy: "certifier",
                credential: "Certification",
                report: "https://example.com/report"
            },
            summary: "This is the accessibility summary. This EPUB is for testing purposes, accessibility metadata presented are not true but only present to check how they would display into the reading system.",
            accessMode: [
                "textual",
                "visual"
            ],
            accessModeSufficient: [
                ['textual'],
                ['visual'],
                ['auditory']
            ],
            feature: [
                "tableOfContents",
                "readingOrder",
                "alternativeText",
                "captions",
                "braille",
                "ChemML",
                "describedMath",
                "displayTransformability",
                "highContrastAudio",
                "highContrastDisplay",
                "index",
                "largePrint",
                "latex",
                "longDescription",
                "MathML",
                "none",
                "pageNavigation",
                "printPageNumbers",
                "rubyAnnotations",
                "annotations",
                "signLanguage",
                "structuralNavigation",
                "synchronizedAudioText",
                "tableOfContents",
                "tactileGraphic",
                "tactileObject",
                "timingControl",
                "transcript",
                "ttsMarkup",
                "aria",
                "unlocked"
            ],
            hazard: [
                "none",
                "none",
                "flashing",
                "noFlashingHazard",
                "MotionSimulation",
                "noMotionSimulationHazard",
                "sound",
                "noSoundHazard",
                "unknown"
            ]
        };

        const expected = new Accessibility({
            conformsTo: [
                AccessibilityProfile.EPUB_A11Y_11_WCAG_21_AA,
                AccessibilityProfile.EPUB_A11Y_10_WCAG_20_AA
            ],
            certification: new Certification(
                "certifier",
                "Certification",
                "https://example.com/report"
            ),
            summary: "This is the accessibility summary. This EPUB is for testing purposes, accessibility metadata presented are not true but only present to check how they would display into the reading system.",
            accessMode: [
                new AccessMode("textual"),
                new AccessMode("visual")
            ],
            accessModeSufficient: [
                new PrimaryAccessMode(["textual"]),
                new PrimaryAccessMode(["visual"]),
                new PrimaryAccessMode(["auditory"])
            ],
            feature: [
                new Feature("tableOfContents"),
                new Feature("readingOrder"),
                new Feature("alternativeText"),
                new Feature("captions"),
                new Feature("braille"),
                new Feature("ChemML"),
                new Feature("describedMath"),
                new Feature("displayTransformability"),
                new Feature("highContrastAudio"),
                new Feature("highContrastDisplay"),
                new Feature("index"),
                new Feature("largePrint"),
                new Feature("latex"),
                new Feature("longDescription"),
                new Feature("MathML"),
                new Feature("none"),
                new Feature("pageNavigation"),
                new Feature("printPageNumbers"),
                new Feature("rubyAnnotations"),
                new Feature("annotations"),
                new Feature("signLanguage"),
                new Feature("structuralNavigation"),
                new Feature("synchronizedAudioText"),
                new Feature("tableOfContents"),
                new Feature("tactileGraphic"),
                new Feature("tactileObject"),
                new Feature("timingControl"),
                new Feature("transcript"),
                new Feature("ttsMarkup"),
                new Feature("aria"),
                new Feature("unlocked")
            ],
            hazard: [
                new Hazard("none"),
                new Hazard("none"),
                new Hazard("flashing"),
                new Hazard("noFlashingHazard"),
                new Hazard("MotionSimulation"),
                new Hazard("noMotionSimulationHazard"),
                new Hazard("sound"),
                new Hazard("noSoundHazard"),
                new Hazard("unknown")
            ]
        });

        expect(Accessibility.deserialize(json)).toEqual(expected);
    });

    it('parse JSON with multiple access modes', () => {
        const json = {
            accessMode: ['textual', 'visual', 'textual'],
            accessModeSufficient: [['textual'], ['visual']]
        };

        const expected = new Accessibility({
            accessMode: [new AccessMode('textual'), new AccessMode('visual'), new AccessMode('textual')],
            accessModeSufficient: [
                new PrimaryAccessMode(['textual']),
                new PrimaryAccessMode(['visual'])
            ]
        });

        expect(Accessibility.deserialize(json)).toEqual(expected);
    });

    it('parse PrimaryAccessMode with a single access mode', () => {
        const json = {
            accessModeSufficient: ['textual']
        };

        const expected = new Accessibility({
            accessModeSufficient: [new PrimaryAccessMode('textual')]
        });

        expect(Accessibility.deserialize(json)).toEqual(expected);
    });

    it('parse PrimaryAccessMode with multiple access modes', () => {
        const json = {
            accessModeSufficient: [['textual', 'visual']]
        };

        const expected = new Accessibility({
            accessModeSufficient: [new PrimaryAccessMode(['textual', 'visual'])]
        });

        expect(Accessibility.deserialize(json)).toEqual(expected);
    });

    it('parse PrimaryAccessMode with multiple arrays', () => {
        const json = {
            accessModeSufficient: [['textual', 'visual'], 'auditory']
        };

        const expected = new Accessibility({
            accessModeSufficient: [new PrimaryAccessMode(['textual', 'visual']), new PrimaryAccessMode('auditory')]
        });

        expect(Accessibility.deserialize(json)).toEqual(expected);
    });

    it('parse requires valid PrimaryAccessMode values', () => {
        const json = {
            accessModeSufficient: [['invalid'], ['textual']]
        };

        const expected = new Accessibility({
            accessModeSufficient: [new PrimaryAccessMode(['textual'])]
        });

        expect(Accessibility.deserialize(json)).toEqual(expected);

        const json2 = {
            accessModeSufficient: [['textual', 'visual']]
        };

        const expected2 = new Accessibility({
            accessModeSufficient: [new PrimaryAccessMode(['textual', 'visual'])]
        });

        expect(Accessibility.deserialize(json2)).toEqual(expected2);
    });

    it('parse PrimaryAccessMode with multiple arrays', () => {
        const json = {
            accessModeSufficient: [['textual', 'visual'], ['auditory']]
        };

        const expected = new Accessibility({
            accessModeSufficient: [new PrimaryAccessMode(['textual', 'visual']), new PrimaryAccessMode(['auditory'])]
        });

        expect(Accessibility.deserialize(json)).toEqual(expected);
    });

    it('parse requires valid PrimaryAccessMode values', () => {
        const json = {
            accessModeSufficient: [['invalid'], ['textual']]
        };

        const expected = new Accessibility({
            accessModeSufficient: [new PrimaryAccessMode(['textual'])]
        });

        expect(Accessibility.deserialize(json)).toEqual(expected);

        const json2 = {
            accessModeSufficient: [['textual', 'visual']]
        };

        const expected2 = new Accessibility({
            accessModeSufficient: [new PrimaryAccessMode(['textual', 'visual'])]
        });

        expect(Accessibility.deserialize(json2)).toEqual(expected2);
    });

    it('serialize Profile', () => {
        const accessibility = new Accessibility({
            conformsTo: [
                AccessibilityProfile.EPUB_A11Y_11_WCAG_21_AA,
                AccessibilityProfile.EPUB_A11Y_10_WCAG_20_AA
            ]
        });

        expect(accessibility.serialize()).toEqual({
            conformsTo: [
                "https://www.w3.org/TR/epub-a11y-11#wcag-2.1-aa",
                "http://www.idpf.org/epub/a11y/accessibility-20170105.html#wcag-aa"
            ]
        });
    });

    it('serialize Certification', () => {
        const accessibility = new Accessibility({
            certification: new Certification(
                'Certifier',
                'Certification',
                'https://example.com/report'
            )
        });

        expect(accessibility.serialize()).toEqual({
            certification: {
                certifiedBy: 'Certifier',
                credential: 'Certification',
                report: 'https://example.com/report'
            }
        });
    });

    it('serialize AccessMode', () => {
        const accessibility = new Accessibility({
            accessMode: [new AccessMode('textual'), new AccessMode('visual')]
        });

        expect(accessibility.serialize()).toEqual({
            accessMode: ['textual', 'visual']
        });
    });

    it('serialize Feature', () => {
        const accessibility = new Accessibility({
            feature: [new Feature('tableOfContents'), new Feature('ARIA')]
        });

        expect(accessibility.serialize()).toEqual({
            feature: ['tableOfContents', 'ARIA']
        });
    });

    it('serialize Hazard', () => {
        const accessibility = new Accessibility({
            hazard: [new Hazard('noFlashingHazard')]
        });

        expect(accessibility.serialize()).toEqual({
            hazard: ['noFlashingHazard']
        });
    });

    it('serialize Exemption', () => {
        const accessibility = new Accessibility({
            exemption: [new Exemption('eaa-disproportionate-burden')]
        });

        expect(accessibility.serialize()).toEqual({
            exemption: ['eaa-disproportionate-burden']
        });
    });

    it('serialize PrimaryAccessMode', () => {
        const accessibility = new Accessibility({
            accessModeSufficient: [
                new PrimaryAccessMode(['textual', 'visual']),
                new PrimaryAccessMode(['auditory'])
            ]
        });

        expect(accessibility.serialize()).toEqual({
            accessModeSufficient: [
                ["textual", "visual"],
                ["auditory"]
            ]
        });
    });

    it('serialize minimal JSON', () => {
        expect(new Accessibility().serialize()).toEqual({});
    });

    it('serialize full JSON', () => {
        const accessibility = new Accessibility({
            conformsTo: [AccessibilityProfile.EPUB_A11Y_10_WCAG_20_AA],
            certification: new Certification('Certifier', 'Certification', 'https://example.com/report'),
            summary: 'This publication is accessible with text-to-speech and screen reader support',
            accessMode: [new AccessMode('textual'), new AccessMode('visual')],
            accessModeSufficient: [
              new PrimaryAccessMode(['textual']), 
              new PrimaryAccessMode(['visual'])
            ],
            feature: [new Feature('alternativeText'), new Feature('ARIA')],
            hazard: [new Hazard('noFlashingHazard')],
            exemption: [new Exemption('eaa-disproportionate-burden')]
        });

        const expected = {
            conformsTo: ['http://www.idpf.org/epub/a11y/accessibility-20170105.html#wcag-aa'],
            accessMode: ['textual', 'visual'],
            accessModeSufficient: [
                ["textual"],
                ["visual"]
            ],
            feature: ['alternativeText', 'ARIA'],
            hazard: ['noFlashingHazard'],
            exemption: ['eaa-disproportionate-burden'],
            certification: {
                certifiedBy: 'Certifier',
                credential: 'Certification',
                report: 'https://example.com/report'
            },
            summary: 'This publication is accessible with text-to-speech and screen reader support'
        };

        expect(accessibility.serialize()).toEqual(expected);
    });

    it('serialize handles empty arrays', () => {
        const accessibility = new Accessibility({});

        expect(accessibility.serialize()).toEqual({});
    });

    it('serialize handles undefined values', () => {
        const accessibility = new Accessibility({
            conformsTo: [AccessibilityProfile.EPUB_A11Y_10_WCAG_20_AA]
        });

        expect(accessibility.serialize()).toEqual({
            conformsTo: ['http://www.idpf.org/epub/a11y/accessibility-20170105.html#wcag-aa']
        });
    });

    it('serialize handles undefined values', () => {
        const accessibility = new Accessibility({});

        expect(accessibility.serialize()).toEqual({});
    });
});
