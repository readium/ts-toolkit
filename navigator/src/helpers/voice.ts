import { VoicePreference } from "@readium/speech";

// A voice for all content, or the same voice for each language
export const sameVoice = (a: VoicePreference | null, b: VoicePreference | null): boolean => {
    if (!a || !b || typeof a === "string" || typeof b === "string") return a === b;
    const entries = Object.entries(a);
    return entries.length === Object.keys(b).length && entries.every(([language, id]) => b[language] === id);
};
