import { Metadata, ReadingProgression } from "@readium/shared";

export type ScriptMode = 'ltr' | 'rtl' | 'cjk-horizontal' | 'cjk-vertical';

/**
 * Derives the script mode from publication metadata.
 *
 * Rules:
 * - Only the first language in the array is used. A Latin book containing
 *   some Japanese is still Latin.
 * - For CJK (zh/ja/ko): both language AND explicit reading progression are
 *   required. CJK vertical = explicit rtl + CJK language. CJK horizontal =
 *   CJK language with ltr or unset progression.
 * - For RTL (ar/fa/he): language wins. If the primary language is a RTL
 *   script, RTL mode is applied regardless of the explicit progression
 *   direction declared in the OPF.
 */
export function getScriptMode(metadata: Metadata): ScriptMode {
    const primaryLang = metadata.languages?.[0]?.toLowerCase();
    // Use explicit readingProgression only — effectiveReadingProgression
    // auto-detects from language, which would create circular logic here.
    const progression = metadata.readingProgression;

    if (primaryLang) {
        const isCJK = primaryLang.startsWith('zh') ||
                      primaryLang.startsWith('ja') ||
                      primaryLang.startsWith('ko');
        if (isCJK) {
            // Vertical requires explicit rtl progression. If progression
            // conflicts (e.g. ltr) we fall back to horizontal.
            return progression === ReadingProgression.rtl
                ? 'cjk-vertical'
                : 'cjk-horizontal';
        }

        // RTL: language is authoritative. ar/fa/he → rtl regardless of
        // what the OPF says about page-progression-direction.
        const isRTLScript = primaryLang.startsWith('ar') ||
                            primaryLang.startsWith('fa') ||
                            primaryLang.startsWith('he');
        if (isRTLScript) return 'rtl';
    }

    return 'ltr';
}
