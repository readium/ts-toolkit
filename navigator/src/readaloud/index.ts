export * from './GuidedNavigationProvider.ts';
export * from './ReadAloudNavigator.ts';
export * from './preferences/index.ts';
export {
    defaultContextualizations,
    extractLangRegionFromBCP47,
    interruptionRoles,
    skippableRoles,
    filterByLanguages,
    filterOutNoveltyVoices,
    filterOutVeryLowQualityVoices,
    getLanguageDisplayName,
    getQualityValue,
    getVoiceId,
    groupVoicesByLanguage,
    sortAlphabetically,
    sortByQuality,
    sortVoicesByRegions,
    valueForLanguage
} from "@readium/speech";
export type { ExtractionFormat, Interruption, LanguageMode, ReadiumSpeechPlaybackEngine, ReadiumSpeechPlaybackState, ReadiumSpeechVoice, Segmentation, SpeechSettings, VerbosityPreset, VoicePreference } from "@readium/speech";
export type {
    BooleanPreference as SpeechBooleanPreference,
    EnumPreference as SpeechEnumPreference,
    Preference as SpeechPreference,
    RangePreference as SpeechRangePreference,
    StringArrayPreference
} from "@readium/speech";
export type { GndRole } from "@readium/guided-navigation";
