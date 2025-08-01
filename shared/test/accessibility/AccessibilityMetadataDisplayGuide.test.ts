import { Publication } from '../../src/publication/Publication';
import { AccessibilityMetadataDisplayGuide } from '../../src/publication/accessibility/AccessibilityMetadataDisplayGuide';
import { Feature, Hazard, AccessibilityProfile, Exemption, AccessMode, Accessibility } from '../../src/publication/accessibility/Accessibility';
import { Manifest, Metadata, LocalizedString, Links, ReadingProgression, Layout } from '../../src/publication';

// Factory function to create test publications
function createPublication(values?: {
  title?: string;
  language?: string;
  layout?: Layout;
  readingProgression?: ReadingProgression;
  links?: Links;
  readingOrder?: Links;
  resources?: Links;
  accessibility?: Accessibility;
}): Publication {
  // Create fresh instances
  const links = values?.links || new Links([]);
  const readingOrder = values?.readingOrder || new Links([]);
  const resources = values?.resources || new Links([]);
  const metadata = new Metadata({
    title: new LocalizedString(values?.title || 'Title'),
    languages: [values?.language || 'en'],
    readingProgression: values?.readingProgression || ReadingProgression.auto,
    accessibility: values?.accessibility || new Accessibility({}),
    layout: values?.layout || Layout.reflowable,
  });
  
  return new Publication({
    manifest: new Manifest({
      metadata,
      links,
      readingOrder,
      resources
    }),
  });
}

describe('AccessibilityMetadataDisplayGuide', () => {

    describe('WaysOfReading', () => {
        describe('Visual Adjustments', () => {
            it('should handle display transformability (modifiable)', () => {
                // Given
                const publication = createPublication({
                    accessibility: new Accessibility({
                        feature: [Feature.DISPLAY_TRANSFORMABILITY]
                    })
                });
                
                // When
                const guide = new AccessibilityMetadataDisplayGuide(publication);
                const waysOfReading = guide.waysOfReading;
                
                // Then
                expect(waysOfReading.shouldDisplay).toBe(true);
                expect(waysOfReading.statements.some(s => s.id === "ways-of-reading.visual-adjustments.modifiable")).toBe(true);
            });

            it('should handle fixed layout (unmodifiable)', () => {
                // Given
                const publication = createPublication({
                    layout: Layout.fixed,
                    accessibility: new Accessibility({
                        feature: []
                    })
                });
                
                // When
                const guide = new AccessibilityMetadataDisplayGuide(publication);
                const waysOfReading = guide.waysOfReading;
                
                // Then
                expect(waysOfReading.shouldDisplay).toBe(true);
                expect(waysOfReading.statements.some(s => s.id === "ways-of-reading.visual-adjustments.unmodifiable")).toBe(true);
            });

            it('should handle unknown visual adjustments', () => {
                // Given
                const publication = createPublication({
                    accessibility: new Accessibility({
                        feature: []
                    })
                });
                
                // When
                const guide = new AccessibilityMetadataDisplayGuide(publication);
                const waysOfReading = guide.waysOfReading;
                
                // Then
                expect(waysOfReading.shouldDisplay).toBe(true);
                expect(waysOfReading.statements.some(s => s.id === "ways-of-reading.visual-adjustments.unknown")).toBe(true);
            });
        });

        describe('Non-visual Reading', () => {
            it('should handle all text content (readable)', () => {
                // Given
                const publication = createPublication({
                    accessibility: new Accessibility({
                        accessMode: [AccessMode.TEXTUAL]
                    })
                });
                
                // When
                const guide = new AccessibilityMetadataDisplayGuide(publication);
                const waysOfReading = guide.waysOfReading;
                
                // Then
                expect(waysOfReading.shouldDisplay).toBe(true);
                expect(waysOfReading.statements.some(s => s.id === "ways-of-reading.nonvisual-reading.readable")).toBe(true);
            });

            it('should handle some text content with alt text (not fully readable)', () => {
                // Given
                const publication = createPublication({
                    accessibility: new Accessibility({
                        accessMode: [AccessMode.TEXTUAL, AccessMode.AUDITORY],
                        feature: [Feature.ALTERNATIVE_TEXT]
                    })
                });
                
                // When
                const guide = new AccessibilityMetadataDisplayGuide(publication);
                const waysOfReading = guide.waysOfReading;
                
                // Then
                expect(waysOfReading.shouldDisplay).toBe(true);
                expect(waysOfReading.statements.some(s => s.id === "ways-of-reading.nonvisual-reading.not-fully")).toBe(true);
                expect(waysOfReading.statements.some(s => s.id === "ways-of-reading.nonvisual-reading.alt-text")).toBe(true);
            });

            it('should handle no text content (unreadable)', () => {
                // Given
                const publication = createPublication({
                    accessibility: new Accessibility({
                        accessMode: [AccessMode.AUDITORY]
                    })
                });
                
                // When
                const guide = new AccessibilityMetadataDisplayGuide(publication);
                const waysOfReading = guide.waysOfReading;
                
                // Then
                expect(waysOfReading.shouldDisplay).toBe(true);
                expect(waysOfReading.statements.some(s => s.id === "ways-of-reading.nonvisual-reading.none")).toBe(true);
            });

            it('should handle no metadata', () => {
                // Given
                const publication = createPublication({
                    accessibility: new Accessibility({})
                });
                
                // When
                const guide = new AccessibilityMetadataDisplayGuide(publication);
                const waysOfReading = guide.waysOfReading;
                
                // Then
                expect(waysOfReading.shouldDisplay).toBe(true);
                expect(waysOfReading.statements.some(s => s.id === "ways-of-reading.nonvisual-reading.no-metadata")).toBe(true);
            });
        });

        describe('Prerecorded Audio', () => {
            it('should handle synchronized audio text', () => {
                // Given
                const publication = createPublication({
                    accessibility: new Accessibility({
                        feature: [Feature.SYNCHRONIZED_AUDIO_TEXT]
                    })
                });
                
                // When
                const guide = new AccessibilityMetadataDisplayGuide(publication);
                const waysOfReading = guide.waysOfReading;
                
                // Then
                expect(waysOfReading.shouldDisplay).toBe(true);
                expect(waysOfReading.statements.some(s => s.id === "ways-of-reading.prerecorded-audio.synchronized")).toBe(true);
            });

            it('should handle audio only', () => {
                // Given
                const publication = createPublication({
                    accessibility: new Accessibility({
                        accessModeSufficient: [{
                            value: AccessMode.AUDITORY.value,
                            serialize: () => AccessMode.AUDITORY.value
                        }]
                    })
                });
                
                // When
                const guide = new AccessibilityMetadataDisplayGuide(publication);
                const waysOfReading = guide.waysOfReading;
                
                // Then
                expect(waysOfReading.shouldDisplay).toBe(true);
                expect(waysOfReading.statements.some(s => s.id === "ways-of-reading.prerecorded-audio.only")).toBe(true);
            });

            it('should handle audio complementary', () => {
                // Given
                const publication = createPublication({
                    accessibility: new Accessibility({
                        accessMode: [AccessMode.AUDITORY]
                    })
                });
                
                // When
                const guide = new AccessibilityMetadataDisplayGuide(publication);
                const waysOfReading = guide.waysOfReading;
                
                // Then
                expect(waysOfReading.shouldDisplay).toBe(true);
                expect(waysOfReading.statements.some(s => s.id === "ways-of-reading.prerecorded-audio.complementary")).toBe(true);
            });

            it('should handle no metadata', () => {
                // Given
                const publication = createPublication({
                    accessibility: new Accessibility({
                        accessMode: []
                    })
                });
                
                // When
                const guide = new AccessibilityMetadataDisplayGuide(publication);
                const waysOfReading = guide.waysOfReading;
                
                // Then
                expect(waysOfReading.shouldDisplay).toBe(true);
                expect(waysOfReading.statements.some(s => s.id === "ways-of-reading.prerecorded-audio.no-metadata")).toBe(true);
            });
        });
    });

    describe('Navigation', () => {
        describe('Navigation Features', () => {
            it('should detect table of contents', () => {
                // Given
                const publication = createPublication({
                    accessibility: new Accessibility({
                        feature: [Feature.TABLE_OF_CONTENTS]
                    })
                });
                
                // When
                const guide = new AccessibilityMetadataDisplayGuide(publication);
                const navigation = guide.navigation;
                
                // Then
                expect(navigation.shouldDisplay).toBe(true);
                expect(navigation.statements.length).toBe(1);
                expect(navigation.statements[0].id).toBe("navigation.toc");
            });

            it('should detect index', () => {
                // Given
                const publication = createPublication({
                    accessibility: new Accessibility({
                        feature: [Feature.INDEX]
                    })
                });
                
                // When
                const guide = new AccessibilityMetadataDisplayGuide(publication);
                const navigation = guide.navigation;
                
                // Then
                expect(navigation.shouldDisplay).toBe(true);
                expect(navigation.statements.length).toBe(1);
                expect(navigation.statements[0].id).toBe("navigation.index");
            });

            it('should detect headings (structural navigation)', () => {
                // Given
                const publication = createPublication({
                    accessibility: new Accessibility({
                        feature: [Feature.STRUCTURAL_NAVIGATION]
                    })
                });
                
                // When
                const guide = new AccessibilityMetadataDisplayGuide(publication);
                const navigation = guide.navigation;
                
                // Then
                expect(navigation.shouldDisplay).toBe(true);
                expect(navigation.statements.length).toBe(1);
                expect(navigation.statements[0].id).toBe("navigation.structural");
            });

            it('should detect page navigation', () => {
                // Given
                const publication = createPublication({
                    accessibility: new Accessibility({
                        feature: [Feature.PAGE_NAVIGATION]
                    })
                });
                
                // When
                const guide = new AccessibilityMetadataDisplayGuide(publication);
                const navigation = guide.navigation;
                
                // Then
                expect(navigation.shouldDisplay).toBe(true);
                expect(navigation.statements.length).toBe(1);
                expect(navigation.statements[0].id).toBe("navigation.page-navigation");
            });

            it('should combine multiple navigation features', () => {
                // Given
                const publication = createPublication({
                    accessibility: new Accessibility({
                        feature: [
                            Feature.TABLE_OF_CONTENTS,
                            Feature.INDEX,
                            Feature.STRUCTURAL_NAVIGATION,
                            Feature.PAGE_NAVIGATION
                        ]
                    })
                });
                
                // When
                const guide = new AccessibilityMetadataDisplayGuide(publication);
                const navigation = guide.navigation;
                
                // Then
                expect(navigation.shouldDisplay).toBe(true);
                expect(navigation.statements.length).toBe(4);
                expect(navigation.statements[0].id).toBe("navigation.toc");
                expect(navigation.statements[1].id).toBe("navigation.index");
                expect(navigation.statements[2].id).toBe("navigation.structural");
                expect(navigation.statements[3].id).toBe("navigation.page-navigation");
            });
        });

        describe('No Metadata', () => {
            it('should show no metadata when no navigation features', () => {
                // Given
                const publication = createPublication({
                    accessibility: new Accessibility({
                        feature: []
                    })
                });
                
                // When
                const guide = new AccessibilityMetadataDisplayGuide(publication);
                const navigation = guide.navigation;
                
                // Then
                expect(navigation.shouldDisplay).toBe(false);
                expect(navigation.statements.length).toBe(1);
                expect(navigation.statements[0].id).toBe("navigation.no-metadata");
            });

            it('should show no metadata when no accessibility metadata', () => {
                // Given
                const publication = createPublication({
                    accessibility: undefined
                });
                
                // When
                const guide = new AccessibilityMetadataDisplayGuide(publication);
                const navigation = guide.navigation;
                
                // Then
                expect(navigation.shouldDisplay).toBe(false);
                expect(navigation.statements.length).toBe(1);
                expect(navigation.statements[0].id).toBe("navigation.no-metadata");
            });
        });

        it('should show no metadata when no navigation features', () => {
            // Given
            const publication = createPublication({
                accessibility: new Accessibility({
                    feature: []
                })
            });
            
            // When
            const guide = new AccessibilityMetadataDisplayGuide(publication);
            const navigation = guide.navigation;
            
            // Then
            expect(navigation.shouldDisplay).toBe(false);
            expect(navigation.statements.length).toBe(1);
            expect(navigation.statements[0].id).toBe("navigation.no-metadata");
        });
    });

    describe('RichContent', () => {
        describe('Content Features', () => {
            it('should detect extended alt text descriptions', () => {
                // Given
                const publication = createPublication({
                    accessibility: new Accessibility({
                        feature: [Feature.LONG_DESCRIPTION]
                    })
                });
                
                // When
                const guide = new AccessibilityMetadataDisplayGuide(publication);
                const richContent = guide.richContent;
                
                // Then
                expect(richContent.shouldDisplay).toBe(true);
                expect(richContent.statements.length).toBe(1);
                expect(richContent.statements[0].id).toBe("rich-content.extended-descriptions");
            });

            describe('Math Content', () => {
                it('should detect described math', () => {
                    // Given
                    const publication = createPublication({
                        accessibility: new Accessibility({
                            feature: [Feature.DESCRIBED_MATH]
                        })
                    });
                    
                    // When
                    const guide = new AccessibilityMetadataDisplayGuide(publication);
                    const richContent = guide.richContent;
                    
                    // Then
                    expect(richContent.shouldDisplay).toBe(true);
                    expect(richContent.statements.length).toBe(1);
                    expect(richContent.statements[0].id).toBe("rich-content.accessible-math-described");
                });

                it('should detect math as MathML', () => {
                    // Given
                    const publication = createPublication({
                        accessibility: new Accessibility({
                            feature: [Feature.MATH_ML]
                        })
                    });
                    
                    // When
                    const guide = new AccessibilityMetadataDisplayGuide(publication);
                    const richContent = guide.richContent;
                    
                    // Then
                    expect(richContent.shouldDisplay).toBe(true);
                    expect(richContent.statements.length).toBe(1);
                    expect(richContent.statements[0].id).toBe("rich-content.math-as-mathml");
                });

                it('should detect math as LaTeX', () => {
                    // Given
                    const publication = createPublication({
                        accessibility: new Accessibility({
                            feature: [Feature.LATEX]
                        })
                    });
                    
                    // When
                    const guide = new AccessibilityMetadataDisplayGuide(publication);
                    const richContent = guide.richContent;
                    
                    // Then
                    expect(richContent.shouldDisplay).toBe(true);
                    expect(richContent.statements.length).toBe(1);
                    expect(richContent.statements[0].id).toBe("rich-content.accessible-math-as-latex");
                });

                it('should combine math features', () => {
                    // Given
                    const publication = createPublication({
                        accessibility: new Accessibility({
                            feature: [
                                Feature.DESCRIBED_MATH,
                                Feature.MATH_ML,
                                Feature.LATEX
                            ]
                        })
                    });
                    
                    // When
                    const guide = new AccessibilityMetadataDisplayGuide(publication);
                    const richContent = guide.richContent;
                    
                    // Then
                    expect(richContent.shouldDisplay).toBe(true);
                    expect(richContent.statements.length).toBe(3);
                    expect(richContent.statements[0].id).toBe("rich-content.accessible-math-described");
                    expect(richContent.statements[1].id).toBe("rich-content.math-as-mathml");
                    expect(richContent.statements[2].id).toBe("rich-content.accessible-math-as-latex");
                });
            });

            describe('Chemical Content', () => {
                it('should detect chemical formulas as MathML', () => {
                    // Given
                    const publication = createPublication({
                        accessibility: new Accessibility({
                            feature: [Feature.MATH_ML_CHEMISTRY]
                        })
                    });
                    
                    // When
                    const guide = new AccessibilityMetadataDisplayGuide(publication);
                    const richContent = guide.richContent;
                    
                    // Then
                    expect(richContent.shouldDisplay).toBe(true);
                    expect(richContent.statements.length).toBe(1);
                    expect(richContent.statements[0].id).toBe("rich-content.accessible-chemistry-as-mathml");
                });

                it('should detect chemical formulas as LaTeX', () => {
                    // Given
                    const publication = createPublication({
                        accessibility: new Accessibility({
                            feature: [Feature.LATEX_CHEMISTRY]
                        })
                    });
                    
                    // When
                    const guide = new AccessibilityMetadataDisplayGuide(publication);
                    const richContent = guide.richContent;
                    
                    // Then
                    expect(richContent.shouldDisplay).toBe(true);
                    expect(richContent.statements.length).toBe(1);
                    expect(richContent.statements[0].id).toBe("rich-content.accessible-chemistry-as-latex");
                });
            });

            describe('Captions', () => {
                it('should detect closed captions', () => {
                    // Given
                    const publication = createPublication({
                        accessibility: new Accessibility({
                            feature: [Feature.CLOSED_CAPTIONS]
                        })
                    });
                    
                    // When
                    const guide = new AccessibilityMetadataDisplayGuide(publication);
                    const richContent = guide.richContent;
                    
                    // Then
                    expect(richContent.shouldDisplay).toBe(true);
                    expect(richContent.statements.length).toBe(1);
                    expect(richContent.statements[0].id).toBe("rich-content.closed-captions");
                });

                it('should detect open captions', () => {
                    // Given
                    const publication = createPublication({
                        accessibility: new Accessibility({
                            feature: [Feature.OPEN_CAPTIONS]
                        })
                    });
                    
                    // When
                    const guide = new AccessibilityMetadataDisplayGuide(publication);
                    const richContent = guide.richContent;
                    
                    // Then
                    expect(richContent.shouldDisplay).toBe(true);
                    expect(richContent.statements.length).toBe(1);
                    expect(richContent.statements[0].id).toBe("rich-content.open-captions");
                });
            });

            it('should detect transcripts', () => {
                // Given
                const publication = createPublication({
                    accessibility: new Accessibility({
                        feature: [Feature.TRANSCRIPT]
                    })
                });
                
                // When
                const guide = new AccessibilityMetadataDisplayGuide(publication);
                const richContent = guide.richContent;
                
                // Then
                expect(richContent.shouldDisplay).toBe(true);
                expect(richContent.statements.length).toBe(1);
                expect(richContent.statements[0].id).toBe("rich-content.transcript");
            });

            it('should combine multiple rich content features', () => {
                // Given
                const publication = createPublication({
                    accessibility: new Accessibility({
                        feature: [
                            Feature.LONG_DESCRIPTION,
                            Feature.DESCRIBED_MATH,
                            Feature.MATH_ML,
                            Feature.LATEX,
                            Feature.MATH_ML_CHEMISTRY,
                            Feature.LATEX_CHEMISTRY,
                            Feature.CLOSED_CAPTIONS,
                            Feature.OPEN_CAPTIONS,
                            Feature.TRANSCRIPT
                        ]
                    })
                });
                
                // When
                const guide = new AccessibilityMetadataDisplayGuide(publication);
                const richContent = guide.richContent;
                
                // Then
                expect(richContent.shouldDisplay).toBe(true);
                expect(richContent.statements.length).toBe(9);
                expect(richContent.statements[0].id).toBe("rich-content.extended-descriptions");
                expect(richContent.statements[1].id).toBe("rich-content.accessible-math-described");
                expect(richContent.statements[2].id).toBe("rich-content.math-as-mathml");
                expect(richContent.statements[3].id).toBe("rich-content.accessible-math-as-latex");
                expect(richContent.statements[4].id).toBe("rich-content.accessible-chemistry-as-mathml");
                expect(richContent.statements[5].id).toBe("rich-content.accessible-chemistry-as-latex");
                expect(richContent.statements[6].id).toBe("rich-content.closed-captions");
                expect(richContent.statements[7].id).toBe("rich-content.open-captions");
                expect(richContent.statements[8].id).toBe("rich-content.transcript");
            });
        });

        describe('No Metadata', () => {
            it('should show unknown when no rich content features', () => {
                // Given
                const publication = createPublication({
                    accessibility: new Accessibility({
                        feature: []
                    })
                });
                
                // When
                const guide = new AccessibilityMetadataDisplayGuide(publication);
                const richContent = guide.richContent;
                
                // Then
                expect(richContent.shouldDisplay).toBe(false);
                expect(richContent.statements.length).toBe(1);
                expect(richContent.statements[0].id).toBe("rich-content.unknown");
            });

            it('should show unknown when no accessibility metadata', () => {
                // Given
                const publication = createPublication({
                    accessibility: undefined
                });
                
                // When
                const guide = new AccessibilityMetadataDisplayGuide(publication);
                const richContent = guide.richContent;
                
                // Then
                expect(richContent.shouldDisplay).toBe(false);
                expect(richContent.statements.length).toBe(1);
                expect(richContent.statements[0].id).toBe("rich-content.unknown");
            });
        });
    });

    describe('AdditionalInformation', () => {
        describe('Content Features', () => {
            it('should detect page breaks and print page numbers', () => {
                // Given
                const publication = createPublication({
                    accessibility: new Accessibility({
                        feature: [Feature.PAGE_BREAK_MARKERS, Feature.PRINT_PAGE_NUMBERS]
                    })
                });
                
                // When
                const guide = new AccessibilityMetadataDisplayGuide(publication);
                const additionalInformation = guide.additionalInformation;
                
                // Then
                expect(additionalInformation.shouldDisplay).toBe(true);
                expect(additionalInformation.statements.length).toBe(1);
                expect(additionalInformation.statements[0].id).toBe("additional-accessibility-information.page-breaks");
            });

            it('should detect ARIA', () => {
                // Given
                const publication = createPublication({
                    accessibility: new Accessibility({
                        feature: [Feature.ARIA]
                    })
                });
                
                // When
                const guide = new AccessibilityMetadataDisplayGuide(publication);
                const additionalInformation = guide.additionalInformation;
                
                // Then
                expect(additionalInformation.shouldDisplay).toBe(true);
                expect(additionalInformation.statements.length).toBe(1);
                expect(additionalInformation.statements[0].id).toBe("additional-accessibility-information.aria");
            });

            it('should detect audio descriptions', () => {
                // Given
                const publication = createPublication({
                    accessibility: new Accessibility({
                        feature: [Feature.AUDIO_DESCRIPTION]
                    })
                });
                
                // When
                const guide = new AccessibilityMetadataDisplayGuide(publication);
                const additionalInformation = guide.additionalInformation;
                
                // Then
                expect(additionalInformation.shouldDisplay).toBe(true);
                expect(additionalInformation.statements.length).toBe(1);
                expect(additionalInformation.statements[0].id).toBe("additional-accessibility-information.audio-descriptions");
            });

            it('should detect braille', () => {
                // Given
                const publication = createPublication({
                    accessibility: new Accessibility({
                        feature: [Feature.BRAILLE]
                    })
                });
                
                // When
                const guide = new AccessibilityMetadataDisplayGuide(publication);
                const additionalInformation = guide.additionalInformation;
                
                // Then
                expect(additionalInformation.shouldDisplay).toBe(true);
                expect(additionalInformation.statements.length).toBe(1);
                expect(additionalInformation.statements[0].id).toBe("additional-accessibility-information.braille");
            });

            describe('Ruby Annotations', () => {
                it('should detect regular ruby annotations', () => {
                    // Given
                    const publication = createPublication({
                        accessibility: new Accessibility({
                            feature: [Feature.RUBY_ANNOTATIONS]
                        })
                    });
                    
                    // When
                    const guide = new AccessibilityMetadataDisplayGuide(publication);
                    const additionalInformation = guide.additionalInformation;
                    
                    // Then
                    expect(additionalInformation.shouldDisplay).toBe(true);
                    expect(additionalInformation.statements.length).toBe(1);
                    expect(additionalInformation.statements[0].id).toBe("additional-accessibility-information.ruby-annotations");
                });

                it('should detect full ruby annotations', () => {
                    // Given
                    const publication = createPublication({
                        accessibility: new Accessibility({
                            feature: [Feature.FULL_RUBY_ANNOTATIONS]
                        })
                    });
                    
                    // When
                    const guide = new AccessibilityMetadataDisplayGuide(publication);
                    const additionalInformation = guide.additionalInformation;
                    
                    // Then
                    expect(additionalInformation.shouldDisplay).toBe(true);
                    expect(additionalInformation.statements.length).toBe(1);
                    expect(additionalInformation.statements[0].id).toBe("additional-accessibility-information.full-ruby-annotations");
                });
            });

            describe('High Contrast', () => {
                it('should detect high contrast audio', () => {
                    // Given
                    const publication = createPublication({
                        accessibility: new Accessibility({
                            feature: [Feature.HIGH_CONTRAST_AUDIO]
                        })
                    });
                    
                    // When
                    const guide = new AccessibilityMetadataDisplayGuide(publication);
                    const additionalInformation = guide.additionalInformation;
                    
                    // Then
                    expect(additionalInformation.shouldDisplay).toBe(true);
                    expect(additionalInformation.statements.length).toBe(1);
                    expect(additionalInformation.statements[0].id).toBe("additional-accessibility-information.high-contrast-between-foreground-and-background-audio");
                });

                it('should detect high contrast display', () => {
                    // Given
                    const publication = createPublication({
                        accessibility: new Accessibility({
                            feature: [Feature.HIGH_CONTRAST_DISPLAY]
                        })
                    });
                    
                    // When
                    const guide = new AccessibilityMetadataDisplayGuide(publication);
                    const additionalInformation = guide.additionalInformation;
                    
                    // Then
                    expect(additionalInformation.shouldDisplay).toBe(true);
                    expect(additionalInformation.statements.length).toBe(1);
                    expect(additionalInformation.statements[0].id).toBe("additional-accessibility-information.high-contrast-between-text-and-background");
                });
            });

            it('should detect large print', () => {
                // Given
                const publication = createPublication({
                    accessibility: new Accessibility({
                        feature: [Feature.LARGE_PRINT]
                    })
                });
                
                // When
                const guide = new AccessibilityMetadataDisplayGuide(publication);
                const additionalInformation = guide.additionalInformation;
                
                // Then
                expect(additionalInformation.shouldDisplay).toBe(true);
                expect(additionalInformation.statements.length).toBe(1);
                expect(additionalInformation.statements[0].id).toBe("additional-accessibility-information.large-print");
            });

            it('should detect sign language', () => {
                // Given
                const publication = createPublication({
                    accessibility: new Accessibility({
                        feature: [Feature.SIGN_LANGUAGE]
                    })
                });
                
                // When
                const guide = new AccessibilityMetadataDisplayGuide(publication);
                const additionalInformation = guide.additionalInformation;
                
                // Then
                expect(additionalInformation.shouldDisplay).toBe(true);
                expect(additionalInformation.statements.length).toBe(1);
                expect(additionalInformation.statements[0].id).toBe("additional-accessibility-information.sign-language");
            });

            describe('Tactile Features', () => {
                it('should detect tactile graphics', () => {
                    // Given
                    const publication = createPublication({
                        accessibility: new Accessibility({
                            feature: [Feature.TACTILE_GRAPHIC]
                        })
                    });
                    
                    // When
                    const guide = new AccessibilityMetadataDisplayGuide(publication);
                    const additionalInformation = guide.additionalInformation;
                    
                    // Then
                    expect(additionalInformation.shouldDisplay).toBe(true);
                    expect(additionalInformation.statements.length).toBe(1);
                    expect(additionalInformation.statements[0].id).toBe("additional-accessibility-information.tactile-graphics");
                });

                it('should detect tactile objects', () => {
                    // Given
                    const publication = createPublication({
                        accessibility: new Accessibility({
                            feature: [Feature.TACTILE_OBJECT]
                        })
                    });
                    
                    // When
                    const guide = new AccessibilityMetadataDisplayGuide(publication);
                    const additionalInformation = guide.additionalInformation;
                    
                    // Then
                    expect(additionalInformation.shouldDisplay).toBe(true);
                    expect(additionalInformation.statements.length).toBe(1);
                    expect(additionalInformation.statements[0].id).toBe("additional-accessibility-information.tactile-objects");
                });
            });

            it('should detect text-to-speech hinting', () => {
                // Given
                const publication = createPublication({
                    accessibility: new Accessibility({
                        feature: [Feature.TTS_MARKUP]
                    })
                });
                
                // When
                const guide = new AccessibilityMetadataDisplayGuide(publication);
                const additionalInformation = guide.additionalInformation;
                
                // Then
                expect(additionalInformation.shouldDisplay).toBe(true);
                expect(additionalInformation.statements.length).toBe(1);
                expect(additionalInformation.statements[0].id).toBe("additional-accessibility-information.text-to-speech-hinting");
            });

            it('should combine multiple additional information features', () => {
                // Given
                const publication = createPublication({
                    accessibility: new Accessibility({
                        feature: [
                            Feature.PAGE_BREAK_MARKERS,
                            Feature.ARIA,
                            Feature.AUDIO_DESCRIPTION,
                            Feature.BRAILLE,
                            Feature.RUBY_ANNOTATIONS,
                            Feature.FULL_RUBY_ANNOTATIONS,
                            Feature.HIGH_CONTRAST_AUDIO,
                            Feature.HIGH_CONTRAST_DISPLAY,
                            Feature.LARGE_PRINT,
                            Feature.SIGN_LANGUAGE,
                            Feature.TACTILE_GRAPHIC,
                            Feature.TACTILE_OBJECT,
                            Feature.TTS_MARKUP
                        ]
                    })
                });
                
                // When
                const guide = new AccessibilityMetadataDisplayGuide(publication);
                const additionalInformation = guide.additionalInformation;
                
                // Then
                expect(additionalInformation.shouldDisplay).toBe(true);
                expect(additionalInformation.statements.length).toBe(13);
                expect(additionalInformation.statements[0].id).toBe("additional-accessibility-information.page-breaks");
                expect(additionalInformation.statements[1].id).toBe("additional-accessibility-information.aria");
                expect(additionalInformation.statements[2].id).toBe("additional-accessibility-information.audio-descriptions");
                expect(additionalInformation.statements[3].id).toBe("additional-accessibility-information.braille");
                expect(additionalInformation.statements[4].id).toBe("additional-accessibility-information.ruby-annotations");
                expect(additionalInformation.statements[5].id).toBe("additional-accessibility-information.full-ruby-annotations");
                expect(additionalInformation.statements[6].id).toBe("additional-accessibility-information.high-contrast-between-foreground-and-background-audio");
                expect(additionalInformation.statements[7].id).toBe("additional-accessibility-information.high-contrast-between-text-and-background");
                expect(additionalInformation.statements[8].id).toBe("additional-accessibility-information.large-print");
                expect(additionalInformation.statements[9].id).toBe("additional-accessibility-information.sign-language");
                expect(additionalInformation.statements[10].id).toBe("additional-accessibility-information.tactile-graphics");
                expect(additionalInformation.statements[11].id).toBe("additional-accessibility-information.tactile-objects");
                expect(additionalInformation.statements[12].id).toBe("additional-accessibility-information.text-to-speech-hinting");
            });
        });

        describe('No Metadata', () => {
            it('should show no metadata when no additional information features', () => {
                // Given
                const publication = createPublication({
                    accessibility: new Accessibility({
                        feature: []
                    })
                });
                
                // When
                const guide = new AccessibilityMetadataDisplayGuide(publication);
                const additionalInformation = guide.additionalInformation;
                
                // Then
                expect(additionalInformation.shouldDisplay).toBe(false);
                expect(additionalInformation.statements.length).toBe(0);
            });

            it('should show no metadata when no accessibility metadata', () => {
                // Given
                const publication = createPublication({
                    accessibility: undefined
                });
                
                // When
                const guide = new AccessibilityMetadataDisplayGuide(publication);
                const additionalInformation = guide.additionalInformation;
                
                // Then
                expect(additionalInformation.shouldDisplay).toBe(false);
                expect(additionalInformation.statements.length).toBe(0);
            });
        });
    });

    describe('Hazards', () => {
        it('should detect flashing hazard', () => {
            // Given
            const publication = createPublication({
                accessibility: new Accessibility({
                    hazard: [Hazard.FLASHING]
                })
            });
            
            // When
            const guide = new AccessibilityMetadataDisplayGuide(publication);
            const hazards = guide.hazards;
            
            // Then
            expect(hazards.shouldDisplay).toBe(true);
            expect(hazards.statements.some(s => s.id === "hazards.flashing")).toBe(true);
            expect(hazards.flashing).toBe('yes');
        });

        it('should detect motion simulation hazard', () => {
            // Given
            const publication = createPublication({
                accessibility: new Accessibility({
                    hazard: [Hazard.MOTION_SIMULATION]
                })
            });
            
            // When
            const guide = new AccessibilityMetadataDisplayGuide(publication);
            const hazards = guide.hazards;
            
            // Then
            expect(hazards.shouldDisplay).toBe(true);
            expect(hazards.statements.some(s => s.id === "hazards.motion")).toBe(true);
            expect(hazards.motion).toBe('yes');
        });

        it('should detect sound hazard', () => {
            // Given
            const publication = createPublication({
                accessibility: new Accessibility({
                    hazard: [Hazard.SOUND]
                })
            });
            
            // When
            const guide = new AccessibilityMetadataDisplayGuide(publication);
            const hazards = guide.hazards;
            
            // Then
            expect(hazards.shouldDisplay).toBe(true);
            expect(hazards.statements.some(s => s.id === "hazards.sound")).toBe(true);
            expect(hazards.sound).toBe('yes');
        });

        it('should handle no hazards', () => {
            // Given
            const publication = createPublication({
                accessibility: new Accessibility({
                    hazard: [Hazard.NONE]
                })
            });
            
            // When
            const guide = new AccessibilityMetadataDisplayGuide(publication);
            const hazards = guide.hazards;
            
            // Then
            expect(hazards.shouldDisplay).toBe(true);
            expect(hazards.statements.some(s => s.id === "hazards.none")).toBe(true);
            expect(hazards.noHazards).toBe(true);
        });

        it('should handle unknown hazards', () => {
            // Given
            const publication = createPublication({
                accessibility: new Accessibility({
                    hazard: [Hazard.UNKNOWN]
                })
            });
            
            // When
            const guide = new AccessibilityMetadataDisplayGuide(publication);
            const hazards = guide.hazards;
            
            // Then
            expect(hazards.shouldDisplay).toBe(true);
            expect(hazards.statements.some(s => s.id === "hazards.unknown")).toBe(true);
            expect(hazards.unknown).toBe(true);
        });

        it('should handle multiple hazards', () => {
            // Given
            const publication = createPublication({
                accessibility: new Accessibility({
                    hazard: [
                        Hazard.FLASHING,
                        Hazard.MOTION_SIMULATION,
                        Hazard.SOUND
                    ]
                })
            });
            
            // When
            const guide = new AccessibilityMetadataDisplayGuide(publication);
            const hazards = guide.hazards;
            
            // Then
            expect(hazards.shouldDisplay).toBe(true);
            expect(hazards.statements.length).toBe(3);
        });

        it('should handle no metadata', () => {
            // Given
            const publication = createPublication({
                accessibility: undefined
            });
            
            // When
            const guide = new AccessibilityMetadataDisplayGuide(publication);
            const hazards = guide.hazards;
            
            // Then
            expect(hazards.shouldDisplay).toBe(false);
            expect(hazards.statements.some(s => s.id === "hazards.no-metadata")).toBe(true);
            expect(hazards.noMetadata).toBe(true);
        });
    });

    describe('Conformance', () => {
        it('should detect WCAG AAA conformance', () => {
            // Given
            const publication = createPublication({
                accessibility: new Accessibility({
                    conformsTo: [AccessibilityProfile.EPUB_A11Y_11_WCAG_21_AAA]
                })
            });
            
            // When
            const guide = new AccessibilityMetadataDisplayGuide(publication);
            const conformance = guide.conformance;
            
            // Then
            expect(conformance.shouldDisplay).toBe(true);
            expect(conformance.statements.length).toBe(1);
            expect(conformance.statements[0].id).toBe("conformance.aaa");
        });

        it('should detect WCAG AA conformance', () => {
            // Given
            const publication = createPublication({
                accessibility: new Accessibility({
                    conformsTo: [AccessibilityProfile.EPUB_A11Y_11_WCAG_21_AA]
                })
            });
            
            // When
            const guide = new AccessibilityMetadataDisplayGuide(publication);
            const conformance = guide.conformance;
            
            // Then
            expect(conformance.shouldDisplay).toBe(true);
            expect(conformance.statements.length).toBe(1);
            expect(conformance.statements[0].id).toBe("conformance.aa");
        });

        it('should detect WCAG A conformance', () => {
                // Given
                const publication = createPublication({
                    accessibility: new Accessibility({
                    conformsTo: [AccessibilityProfile.EPUB_A11Y_11_WCAG_21_A]
                    })
                });
                
                // When
                const guide = new AccessibilityMetadataDisplayGuide(publication);
            const conformance = guide.conformance;
                
                // Then
            expect(conformance.shouldDisplay).toBe(true);
            expect(conformance.statements.length).toBe(1);
            expect(conformance.statements[0].id).toBe("conformance.a");
            });

        it('should show no conformance when no profiles', () => {
                // Given
                const publication = createPublication({
                    accessibility: new Accessibility({
                    conformsTo: []
                    })
                });
                
                // When
                const guide = new AccessibilityMetadataDisplayGuide(publication);
            const conformance = guide.conformance;
                
                // Then
            expect(conformance.shouldDisplay).toBe(true);
            expect(conformance.statements.length).toBe(1);
            expect(conformance.statements[0].id).toBe("conformance.no");
            });

        it('should handle multiple conformance profiles', () => {
                // Given
                const publication = createPublication({
                accessibility: new Accessibility({
                    conformsTo: [
                        AccessibilityProfile.EPUB_A11Y_11_WCAG_21_AAA,
                        AccessibilityProfile.EPUB_A11Y_11_WCAG_21_AA
                    ]
                })
            });
            
            // When
            const guide = new AccessibilityMetadataDisplayGuide(publication);
            const conformance = guide.conformance;
            
            // Then
            expect(conformance.shouldDisplay).toBe(true);
            expect(conformance.statements.length).toBe(1);
            expect(conformance.statements[0].id).toBe("conformance.aaa");
        });
    });

    describe('Legal', () => {
        it('should handle no metadata case', () => {
            // Given
            const publication = createPublication({
                accessibility: new Accessibility()
            });
            
            // When
            const guide = new AccessibilityMetadataDisplayGuide(publication);
            const legal = guide.legal;
            
            // Then
            expect(legal.shouldDisplay).toBe(false);
            expect(legal.statements.length).toBe(1);
            expect(legal.statements[0].id).toBe("legal-considerations.no-metadata");
        });

        it('should handle no exemptions case', () => {
            // Given
            const publication = createPublication({
                accessibility: new Accessibility({
                    exemption: []
                })
            });
            
            // When
            const guide = new AccessibilityMetadataDisplayGuide(publication);
            const legal = guide.legal;
            
            // Then
            expect(legal.shouldDisplay).toBe(false);
            expect(legal.statements.length).toBe(1);
            expect(legal.statements[0].id).toBe("legal-considerations.no-metadata");
        });

        it('should handle NONE exemption', () => {
            // Given
            const publication = createPublication({
                accessibility: new Accessibility({
                    exemption: [Exemption.NONE]
                })
            });
            
            // When
            const guide = new AccessibilityMetadataDisplayGuide(publication);
            const legal = guide.legal;
            
            // Then
            expect(legal.shouldDisplay).toBe(true);
            expect(legal.statements.length).toBe(1);
            expect(legal.statements[0].id).toBe("legal-considerations.exempt");
        });

        it('should handle DOCUMENTED exemption', () => {
            // Given
            const publication = createPublication({
                accessibility: new Accessibility({
                    exemption: [Exemption.DOCUMENTED]
                })
            });
            
            // When
            const guide = new AccessibilityMetadataDisplayGuide(publication);
            const legal = guide.legal;
            
            // Then
            expect(legal.shouldDisplay).toBe(true);
            expect(legal.statements.length).toBe(1);
            expect(legal.statements[0].id).toBe("legal-considerations.exempt");
        });

        it('should handle LEGAL exemption', () => {
            // Given
            const publication = createPublication({
                accessibility: new Accessibility({
                    exemption: [Exemption.LEGAL]
                })
            });
            
            // When
            const guide = new AccessibilityMetadataDisplayGuide(publication);
            const legal = guide.legal;
            
            // Then
            expect(legal.shouldDisplay).toBe(true);
            expect(legal.statements.length).toBe(1);
            expect(legal.statements[0].id).toBe("legal-considerations.exempt");
        });

        it('should handle TEMPORARY exemption', () => {
            // Given
            const publication = createPublication({
                accessibility: new Accessibility({
                    exemption: [Exemption.TEMPORARY]
                })
            });
            
            // When
            const guide = new AccessibilityMetadataDisplayGuide(publication);
            const legal = guide.legal;
            
            // Then
            expect(legal.shouldDisplay).toBe(true);
            expect(legal.statements.length).toBe(1);
            expect(legal.statements[0].id).toBe("legal-considerations.exempt");
        });

        it('should handle TECHNICAL exemption', () => {
            // Given
            const publication = createPublication({
                accessibility: new Accessibility({
                    exemption: [Exemption.TECHNICAL]
                })
            });
            
            // When
            const guide = new AccessibilityMetadataDisplayGuide(publication);
            const legal = guide.legal;
            
            // Then
            expect(legal.shouldDisplay).toBe(true);
            expect(legal.statements.length).toBe(1);
            expect(legal.statements[0].id).toBe("legal-considerations.exempt");
        });

        it('should handle EU Accessibility Act exemptions', () => {
            // Given
            const publication = createPublication({
                accessibility: new Accessibility({
                    exemption: [
                        Exemption.EAA_DISPROPORTIONATE_BURDEN,
                        Exemption.EAA_FUNDAMENTAL_ALTERATION,
                        Exemption.EAA_MICROENTERPRISE,
                        Exemption.EAA_TECHNICAL_IMPOSSIBILITY,
                        Exemption.EAA_TEMPORARY
                    ]
                })
            });
            
            // When
            const guide = new AccessibilityMetadataDisplayGuide(publication);
            const legal = guide.legal;
            
            // Then
            expect(legal.shouldDisplay).toBe(true);
            expect(legal.statements.length).toBe(1);
            expect(legal.statements[0].id).toBe("legal-considerations.exempt");
        });

        it('should handle multiple exemptions', () => {
            // Given
            const publication = createPublication({
                accessibility: new Accessibility({
                    exemption: [
                        Exemption.DOCUMENTED,
                        Exemption.LEGAL,
                        Exemption.TEMPORARY
                    ]
                })
            });
            
            // When
            const guide = new AccessibilityMetadataDisplayGuide(publication);
            const legal = guide.legal;
            
            // Then
            expect(legal.shouldDisplay).toBe(true);
            expect(legal.statements.length).toBe(1);
            expect(legal.statements[0].id).toBe("legal-considerations.exempt");
        });

        it('should show no metadata when no exemptions', () => {
            // Given
            const publication = createPublication({
                accessibility: new Accessibility({
                    exemption: []
                })
            });
            
            // When
            const guide = new AccessibilityMetadataDisplayGuide(publication);
            const legal = guide.legal;
            
            // Then
            expect(legal.shouldDisplay).toBe(false);
            expect(legal.statements.length).toBe(1);
            expect(legal.statements[0].id).toBe("legal-considerations.no-metadata");
        });
    });

    describe('AccessibilitySummary', () => {
        it('should handle no summary case', () => {
            // Given
            const publication = createPublication({
                accessibility: new Accessibility()
            });
            
            // When
            const guide = new AccessibilityMetadataDisplayGuide(publication);
            const summary = guide.accessibilitySummary;
            
            // Then
            expect(summary.shouldDisplay).toBe(true);
            expect(summary.statements.length).toBe(1);
            expect(summary.statements[0].id).toBe("accessibility-summary.no-metadata");
        });

        it('should handle empty summary case', () => {
            // Given
            const publication = createPublication({
                accessibility: new Accessibility({
                    summary: ''
                })
            });
            
            // When
            const guide = new AccessibilityMetadataDisplayGuide(publication);
            const summary = guide.accessibilitySummary;
            
            // Then
            expect(summary.shouldDisplay).toBe(true);
            expect(summary.statements.length).toBe(1);
            expect(summary.statements[0].id).toBe("accessibility-summary.no-metadata");
        });

        it('should handle valid summary', () => {
            // Given
            const publication = createPublication({
                accessibility: new Accessibility({
                    summary: 'Some summary text'
                })
            });
            
            // When
            const guide = new AccessibilityMetadataDisplayGuide(publication);
            const summary = guide.accessibilitySummary;
            
            // Then
            expect(summary.shouldDisplay).toBe(true);
            expect(summary.statements.length).toBe(1);
            expect(summary.statements[0].compactString).toBe('Some summary text');
        });
    });
});