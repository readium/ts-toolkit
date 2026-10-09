export * from './GuidedNavigationProvider.ts';
export * from './ReadAloudNavigator.ts';
export * from './preferences/index.ts';
export {
    defaultContextualizations,
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
export type { ExtractionFormat, LanguageMode, ReadiumSpeechPlaybackEngine, ReadiumSpeechPlaybackState, ReadiumSpeechVoice, Segmentation, SpeechSettings, VerbosityPreset } from "@readium/speech";
export type {
    BooleanPreference as SpeechBooleanPreference,
    EnumPreference as SpeechEnumPreference,
    RangePreference as SpeechRangePreference,
    StringArrayPreference
} from "@readium/speech";
export type { GndRole } from "@readium/guided-navigation";
