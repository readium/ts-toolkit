import { Metadata, ReadingProgression, RTL_LANGUAGES } from "@readium/shared";

export type ScriptMode = 'ltr' | 'rtl' | 'cjk-horizontal' | 'cjk-vertical' | 'mongolian-vertical';

/**
 * Derives the script mode from publication metadata.
 *
 * Rules:
 * - Only the first language in the array is used. A Latin book containing
 *   some Japanese is still Latin.
 * - For CJK (zh/ja/ko): CJK vertical = CJK language + effective rtl
 *   progression, either declared or inferred (e.g. zh-Hant). CJK horizontal
 *   otherwise.
 * - For RTL (primary subtag in `RTL_LANGUAGES`): language wins. RTL mode is
 *   applied regardless of the explicit progression direction declared in the OPF.
 * - For Mongolian (mn): Traditional Mongolian script (mn-Mong) uses
 *   writing-mode: vertical-lr. Cyrillic Mongolian (mn-Cyrl) is standard LTR.
 *   An explicit script subtag is required; bare `mn` defaults to LTR.
 */
export function getScriptMode(metadata: Metadata): ScriptMode {
    const primaryLang = metadata.languages?.[0]?.toLowerCase();

    if (primaryLang) {
        const subtag = primaryLang.split('-')[0];
        if (subtag === 'zh' || subtag === 'ja' || subtag === 'ko') {
            return metadata.effectiveReadingProgression === ReadingProgression.rtl
                ? 'cjk-vertical'
                : 'cjk-horizontal';
        }

        // Traditional Mongolian script (mn-Mong): writing-mode vertical-lr.
        // Requires an explicit Mong script subtag; mn-Cyrl and bare mn stay LTR.
        if (primaryLang.startsWith('mn-mong')) return 'mongolian-vertical';

        // RTL: language is authoritative, regardless of
        // what the OPF says about page-progression-direction.
        if (RTL_LANGUAGES.has(subtag)) return 'rtl';
    }

    return 'ltr';
}
