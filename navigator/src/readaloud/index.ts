export * from './GuidedNavigationProvider.ts';
export * from './ReadAloudNavigator.ts';
export * from './preferences/index.ts';
export {
    defaultContextualizations,
    inlineContextualizationRoles,
    skippableRoles,
    filterByLanguages,
    filterOutNoveltyVoices,
    filterOutVeryLowQualityVoices,
    getQualityValue,
    groupVoicesByLanguage,
    sortAlphabetically,
    sortByQuality,
    sortVoicesByRegions
} from "@readium/speech";
export type { ExtractionFormat, LanguageMode, ReadiumSpeechPlaybackEngine, ReadiumSpeechPlaybackState, ReadiumSpeechVoice, Segmentation, SpeechSettings, VerbosityPreset, VoicePreference } from "@readium/speech";
export type {
    BooleanPreference as SpeechBooleanPreference,
    EnumPreference as SpeechEnumPreference,
    Preference as SpeechPreference,
    RangePreference as SpeechRangePreference,
    StringArrayPreference
} from "@readium/speech";
export type { GndRole } from "@readium/guided-navigation";
