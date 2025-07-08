import { Publication } from '../../src/publication/Publication';
import { AccessibilityMetadataDisplayGuide } from '../../src/publication/accessibility/AccessibilityMetadataDisplayGuide';
import { AccessibilityDisplayString } from '../../src/publication/accessibility/AccessibilityDisplayString';
import { Feature, Hazard, Profile, Exemption, AccessMode, Accessibility } from '../../src/publication/accessibility/Accessibility';
import { Manifest, Metadata, LocalizedString, Links, ReadingProgression, Presentation } from '../../src/publication';
import { EPUBLayout } from '../../src/publication/epub';

// Factory function to create test publications
function createPublication(values?: {
  title?: string;
  language?: string;
  readingProgression?: ReadingProgression;
  links?: Links;
  readingOrder?: Links;
  resources?: Links;
  accessibility?: Accessibility;
  presentation?: Presentation;
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
    otherMetadata: {
      presentation: values?.presentation || new Presentation({})
    }
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
                expect(waysOfReading.statements.some(s => s.displayId === AccessibilityDisplayString.WaysOfReadingVisualAdjustmentsModifiable)).toBe(true);
            });

            it('should handle fixed layout (unmodifiable)', () => {
                // Given
                const publication = createPublication({
                    presentation: new Presentation({
                        layout: EPUBLayout.fixed
                    }),
                    accessibility: new Accessibility({
                        feature: []
                    })
                });
                
                // When
                const guide = new AccessibilityMetadataDisplayGuide(publication);
                const waysOfReading = guide.waysOfReading;
                
                // Then
                expect(waysOfReading.shouldDisplay).toBe(true);
                expect(waysOfReading.statements.some(s => s.displayId === AccessibilityDisplayString.WaysOfReadingVisualAdjustmentsUnmodifiable)).toBe(true);
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
                expect(waysOfReading.statements.some(s => s.displayId === AccessibilityDisplayString.WaysOfReadingVisualAdjustmentsUnknown)).toBe(true);
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
                expect(waysOfReading.statements.some(s => s.displayId === AccessibilityDisplayString.WaysOfReadingNonvisualReadingReadable)).toBe(true);
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
                expect(waysOfReading.statements.some(s => s.displayId === AccessibilityDisplayString.WaysOfReadingNonvisualReadingNotFully)).toBe(true);
                expect(waysOfReading.statements.some(s => s.displayId === AccessibilityDisplayString.WaysOfReadingNonvisualReadingAltText)).toBe(true);
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
                expect(waysOfReading.statements.some(s => s.displayId === AccessibilityDisplayString.WaysOfReadingNonvisualReadingNone)).toBe(true);
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
                expect(waysOfReading.statements.some(s => s.displayId === AccessibilityDisplayString.WaysOfReadingNonvisualReadingNoMetadata)).toBe(true);
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
                expect(waysOfReading.statements.some(s => s.displayId === AccessibilityDisplayString.WaysOfReadingPrerecordedAudioSynchronized)).toBe(true);
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
                expect(waysOfReading.statements.some(s => s.displayId === AccessibilityDisplayString.WaysOfReadingPrerecordedAudioOnly)).toBe(true);
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
                expect(waysOfReading.statements.some(s => s.displayId === AccessibilityDisplayString.WaysOfReadingPrerecordedAudioComplementary)).toBe(true);
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
                expect(waysOfReading.statements.some(s => s.displayId === AccessibilityDisplayString.WaysOfReadingPrerecordedAudioNoMetadata)).toBe(true);
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
                expect(navigation.statements[0].displayId).toBe(AccessibilityDisplayString.NavigationToc);
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
                expect(navigation.statements[0].displayId).toBe(AccessibilityDisplayString.NavigationIndex);
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
                expect(navigation.statements[0].displayId).toBe(AccessibilityDisplayString.NavigationStructural);
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
                expect(navigation.statements[0].displayId).toBe(AccessibilityDisplayString.NavigationPageNavigation);
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
                expect(navigation.statements[0].displayId).toBe(AccessibilityDisplayString.NavigationToc);
                expect(navigation.statements[1].displayId).toBe(AccessibilityDisplayString.NavigationIndex);
                expect(navigation.statements[2].displayId).toBe(AccessibilityDisplayString.NavigationStructural);
                expect(navigation.statements[3].displayId).toBe(AccessibilityDisplayString.NavigationPageNavigation);
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
                expect(navigation.statements[0].displayId).toBe(AccessibilityDisplayString.NavigationNoMetadata);
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
                expect(navigation.statements[0].displayId).toBe(AccessibilityDisplayString.NavigationNoMetadata);
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
            expect(navigation.statements[0].displayId).toBe(AccessibilityDisplayString.NavigationNoMetadata);
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
                expect(richContent.statements[0].displayId).toBe(AccessibilityDisplayString.RichContentExtended);
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
                    expect(richContent.statements[0].displayId).toBe(AccessibilityDisplayString.RichContentAccessibleMathDescribed);
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
                    expect(richContent.statements[0].displayId).toBe(AccessibilityDisplayString.RichContentAccessibleMathAsMathml);
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
                    expect(richContent.statements[0].displayId).toBe(AccessibilityDisplayString.RichContentAccessibleMathAsLatex);
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
                    expect(richContent.statements[0].displayId).toBe(AccessibilityDisplayString.RichContentAccessibleMathDescribed);
                    expect(richContent.statements[1].displayId).toBe(AccessibilityDisplayString.RichContentAccessibleMathAsMathml);
                    expect(richContent.statements[2].displayId).toBe(AccessibilityDisplayString.RichContentAccessibleMathAsLatex);
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
                    expect(richContent.statements[0].displayId).toBe(AccessibilityDisplayString.RichContentAccessibleChemistryAsMathml);
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
                    expect(richContent.statements[0].displayId).toBe(AccessibilityDisplayString.RichContentAccessibleChemistryAsLatex);
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
                    expect(richContent.statements[0].displayId).toBe(AccessibilityDisplayString.RichContentClosedCaptions);
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
                    expect(richContent.statements[0].displayId).toBe(AccessibilityDisplayString.RichContentOpenCaptions);
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
                expect(richContent.statements[0].displayId).toBe(AccessibilityDisplayString.RichContentTranscript);
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
                expect(richContent.statements[0].displayId).toBe(AccessibilityDisplayString.RichContentExtended);
                expect(richContent.statements[1].displayId).toBe(AccessibilityDisplayString.RichContentAccessibleMathDescribed);
                expect(richContent.statements[2].displayId).toBe(AccessibilityDisplayString.RichContentAccessibleMathAsMathml);
                expect(richContent.statements[3].displayId).toBe(AccessibilityDisplayString.RichContentAccessibleMathAsLatex);
                expect(richContent.statements[4].displayId).toBe(AccessibilityDisplayString.RichContentAccessibleChemistryAsMathml);
                expect(richContent.statements[5].displayId).toBe(AccessibilityDisplayString.RichContentAccessibleChemistryAsLatex);
                expect(richContent.statements[6].displayId).toBe(AccessibilityDisplayString.RichContentClosedCaptions);
                expect(richContent.statements[7].displayId).toBe(AccessibilityDisplayString.RichContentOpenCaptions);
                expect(richContent.statements[8].displayId).toBe(AccessibilityDisplayString.RichContentTranscript);
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
                expect(richContent.statements[0].displayId).toBe(AccessibilityDisplayString.RichContentUnknown);
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
                expect(richContent.statements[0].displayId).toBe(AccessibilityDisplayString.RichContentUnknown);
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
                expect(additionalInformation.statements[0].displayId).toBe(AccessibilityDisplayString.AdditionalInformationPageBreaks);
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
                expect(additionalInformation.statements[0].displayId).toBe(AccessibilityDisplayString.AdditionalInformationAria);
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
                expect(additionalInformation.statements[0].displayId).toBe(AccessibilityDisplayString.AdditionalInformationAudioDescriptions);
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
                expect(additionalInformation.statements[0].displayId).toBe(AccessibilityDisplayString.AdditionalInformationBraille);
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
                    expect(additionalInformation.statements[0].displayId).toBe(AccessibilityDisplayString.AdditionalInformationRubyAnnotations);
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
                    expect(additionalInformation.statements[0].displayId).toBe(AccessibilityDisplayString.AdditionalInformationFullRubyAnnotations);
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
                    expect(additionalInformation.statements[0].displayId).toBe(AccessibilityDisplayString.AdditionalInformationHighContrastBetweenForegroundAndBackgroundAudio);
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
                    expect(additionalInformation.statements[0].displayId).toBe(AccessibilityDisplayString.AdditionalInformationHighContrastBetweenTextAndBackground);
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
                expect(additionalInformation.statements[0].displayId).toBe(AccessibilityDisplayString.AdditionalInformationLargePrint);
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
                expect(additionalInformation.statements[0].displayId).toBe(AccessibilityDisplayString.AdditionalInformationSignLanguage);
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
                    expect(additionalInformation.statements[0].displayId).toBe(AccessibilityDisplayString.AdditionalInformationTactileGraphics);
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
                    expect(additionalInformation.statements[0].displayId).toBe(AccessibilityDisplayString.AdditionalInformationTactileObjects);
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
                expect(additionalInformation.statements[0].displayId).toBe(AccessibilityDisplayString.AdditionalInformationTextToSpeechHinting);
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
                expect(additionalInformation.statements[0].displayId).toBe(AccessibilityDisplayString.AdditionalInformationPageBreaks);
                expect(additionalInformation.statements[1].displayId).toBe(AccessibilityDisplayString.AdditionalInformationAria);
                expect(additionalInformation.statements[2].displayId).toBe(AccessibilityDisplayString.AdditionalInformationAudioDescriptions);
                expect(additionalInformation.statements[3].displayId).toBe(AccessibilityDisplayString.AdditionalInformationBraille);
                expect(additionalInformation.statements[4].displayId).toBe(AccessibilityDisplayString.AdditionalInformationRubyAnnotations);
                expect(additionalInformation.statements[5].displayId).toBe(AccessibilityDisplayString.AdditionalInformationFullRubyAnnotations);
                expect(additionalInformation.statements[6].displayId).toBe(AccessibilityDisplayString.AdditionalInformationHighContrastBetweenForegroundAndBackgroundAudio);
                expect(additionalInformation.statements[7].displayId).toBe(AccessibilityDisplayString.AdditionalInformationHighContrastBetweenTextAndBackground);
                expect(additionalInformation.statements[8].displayId).toBe(AccessibilityDisplayString.AdditionalInformationLargePrint);
                expect(additionalInformation.statements[9].displayId).toBe(AccessibilityDisplayString.AdditionalInformationSignLanguage);
                expect(additionalInformation.statements[10].displayId).toBe(AccessibilityDisplayString.AdditionalInformationTactileGraphics);
                expect(additionalInformation.statements[11].displayId).toBe(AccessibilityDisplayString.AdditionalInformationTactileObjects);
                expect(additionalInformation.statements[12].displayId).toBe(AccessibilityDisplayString.AdditionalInformationTextToSpeechHinting);
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
            expect(hazards.statements.some(s => s.displayId === AccessibilityDisplayString.HazardsFlashing)).toBe(true);
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
            expect(hazards.statements.some(s => s.displayId === AccessibilityDisplayString.HazardsMotion)).toBe(true);
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
            expect(hazards.statements.some(s => s.displayId === AccessibilityDisplayString.HazardsSound)).toBe(true);
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
            expect(hazards.statements.some(s => s.displayId === AccessibilityDisplayString.HazardsNone)).toBe(true);
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
            expect(hazards.statements.some(s => s.displayId === AccessibilityDisplayString.HazardsUnknown)).toBe(true);
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
            expect(hazards.statements.some(s => s.displayId === AccessibilityDisplayString.HazardsNoMetadata)).toBe(true);
            expect(hazards.noMetadata).toBe(true);
        });
    });

    describe('Conformance', () => {
        it('should detect WCAG AAA conformance', () => {
            // Given
            const publication = createPublication({
                accessibility: new Accessibility({
                    conformsTo: [Profile.EPUB_A11Y_11_WCAG_21_AAA]
                })
            });
            
            // When
            const guide = new AccessibilityMetadataDisplayGuide(publication);
            const conformance = guide.conformance;
            
            // Then
            expect(conformance.shouldDisplay).toBe(true);
            expect(conformance.statements.length).toBe(1);
            expect(conformance.statements[0].displayId).toBe(AccessibilityDisplayString.ConformanceAaa);
        });

        it('should detect WCAG AA conformance', () => {
            // Given
            const publication = createPublication({
                accessibility: new Accessibility({
                    conformsTo: [Profile.EPUB_A11Y_11_WCAG_21_AA]
                })
            });
            
            // When
            const guide = new AccessibilityMetadataDisplayGuide(publication);
            const conformance = guide.conformance;
            
            // Then
            expect(conformance.shouldDisplay).toBe(true);
            expect(conformance.statements.length).toBe(1);
            expect(conformance.statements[0].displayId).toBe(AccessibilityDisplayString.ConformanceAa);
        });

        it('should detect WCAG A conformance', () => {
            // Given
            const publication = createPublication({
                accessibility: new Accessibility({
                    conformsTo: [Profile.EPUB_A11Y_11_WCAG_21_A]
                })
            });
            
            // When
            const guide = new AccessibilityMetadataDisplayGuide(publication);
            const conformance = guide.conformance;
            
            // Then
            expect(conformance.shouldDisplay).toBe(true);
            expect(conformance.statements.length).toBe(1);
            expect(conformance.statements[0].displayId).toBe(AccessibilityDisplayString.ConformanceA);
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
            expect(conformance.statements[0].displayId).toBe(AccessibilityDisplayString.ConformanceNo);
        });

        it('should handle multiple conformance profiles', () => {
            // Given
            const publication = createPublication({
                accessibility: new Accessibility({
                    conformsTo: [
                        Profile.EPUB_A11Y_11_WCAG_21_AAA,
                        Profile.EPUB_A11Y_11_WCAG_21_AA
                    ]
                })
            });
            
            // When
            const guide = new AccessibilityMetadataDisplayGuide(publication);
            const conformance = guide.conformance;
            
            // Then
            expect(conformance.shouldDisplay).toBe(true);
            expect(conformance.statements.length).toBe(1);
            expect(conformance.statements[0].displayId).toBe(AccessibilityDisplayString.ConformanceAaa);
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
            expect(legal.statements[0].displayId).toBe(AccessibilityDisplayString.LegalConsiderationsNoMetadata);
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
            expect(legal.statements[0].displayId).toBe(AccessibilityDisplayString.LegalConsiderationsNoMetadata);
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
            expect(legal.statements[0].displayId).toBe(AccessibilityDisplayString.LegalConsiderationsExempt);
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
            expect(legal.statements[0].displayId).toBe(AccessibilityDisplayString.LegalConsiderationsExempt);
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
            expect(legal.statements[0].displayId).toBe(AccessibilityDisplayString.LegalConsiderationsExempt);
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
            expect(legal.statements[0].displayId).toBe(AccessibilityDisplayString.LegalConsiderationsExempt);
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
            expect(legal.statements[0].displayId).toBe(AccessibilityDisplayString.LegalConsiderationsExempt);
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
            expect(legal.statements[0].displayId).toBe(AccessibilityDisplayString.LegalConsiderationsExempt);
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
            expect(legal.statements[0].displayId).toBe(AccessibilityDisplayString.LegalConsiderationsExempt);
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
            expect(legal.statements[0].displayId).toBe(AccessibilityDisplayString.LegalConsiderationsNoMetadata);
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
            expect(summary.shouldDisplay).toBe(false);
            expect(summary.statements.length).toBe(1);
            expect(summary.statements[0].displayId).toBe(AccessibilityDisplayString.AccessibilitySummaryNoMetadata);
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
            expect(summary.shouldDisplay).toBe(false);
            expect(summary.statements.length).toBe(1);
            expect(summary.statements[0].displayId).toBe(AccessibilityDisplayString.AccessibilitySummaryNoMetadata);
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
            expect(summary.statements[0].values).toContain('Some summary text');
        });
    });
});