import { Locator, LocatorLocations, LocatorText } from "@readium/shared";
import {
    Decorator,
    DecorationController,
    DecorationLayout,
    DecorationLineStyle,
    DecorationStyleType,
    DecorationWidth,
    DirectCommsChannel,
    type BuiltinDecorationStyle,
    type Decoration,
} from "../src/index.ts";

export { DecorationLayout, DecorationLineStyle, DecorationStyleType, DecorationWidth };
export type { BuiltinDecorationStyle };

export type BuiltinType = Exclude<BuiltinDecorationStyle["type"], undefined>;

export const types: BuiltinType[] = [
    DecorationStyleType.Highlight,
    DecorationStyleType.HighlightUnderline,
    DecorationStyleType.Underline,
    DecorationStyleType.Strikethrough,
    DecorationStyleType.Outline,
    DecorationStyleType.TextColor,
    DecorationStyleType.Mask,
];
export const layouts = Object.values(DecorationLayout);
export const widths = Object.values(DecorationWidth);
export const lineStyles = Object.values(DecorationLineStyle);

export const linedTypes: BuiltinType[] = [
    DecorationStyleType.HighlightUnderline,
    DecorationStyleType.Underline,
    DecorationStyleType.Strikethrough,
    DecorationStyleType.Outline,
];

export const writingModes = ["horizontal-tb", "vertical-rl", "vertical-lr"] as const;

export const directions = ["ltr", "rtl"] as const;

/** A paragraph's HTML and the text, as found in its textContent, that gets decorated. */
export interface Fixture {
    html: string;
    highlight: string;
}

const ltrFixtures: Fixture[] = [
    {
        html: "The lighthouse keeper counted the ships as they passed, writing each name in a ledger whose pages had long since turned yellow, and when the fog rolled in he counted the horns instead, guessing at hulls he could not see.",
        highlight: "writing each name in a ledger whose pages had long since turned yellow, and when the fog rolled in he counted",
    },
    {
        html: "Each entry carried a date<sup>1</sup>, a <code>hull</code> type, a short <em>remark on the weather</em> and the <ruby>harbour<rp>(</rp><rt>port</rt><rp>)</rp></ruby> it had sailed from, so the ledger read like a very long letter.",
        highlight: "date1, a hull type, a short remark on the weather and the harbour(port) it had sailed from",
    },
];

const rtlFixtures: Fixture[] = [
    {
        html: "كان حارس المنارة يعدّ السفن وهي تمرّ، ويكتب اسم كل واحدة في دفتر اصفرّت صفحاته منذ زمن بعيد، وحين يزحف الضباب كان يعدّ الأبواق بدلاً منها، ويخمّن هياكل سفن لا يراها.",
        highlight: "ويكتب اسم كل واحدة في دفتر اصفرّت صفحاته منذ زمن بعيد، وحين يزحف الضباب كان يعدّ",
    },
    {
        html: "حمل كل سطر تاريخاً<sup>١</sup> ونوع <code>hull</code> وملاحظة <em>قصيرة عن الطقس</em> واسم الميناء الذي أبحرت منه السفينة، فصار الدفتر يشبه رسالة طويلة جداً.",
        highlight: "تاريخاً١ ونوع hull وملاحظة قصيرة عن الطقس واسم الميناء",
    },
];

const verticalFixtures: Fixture[] = [
    {
        html: "灯台守は通り過ぎる船を数え、ずっと前に黄ばんだ帳面の頁にひとつひとつの名を書き留めた。霧が立ちこめると、代わりに汽笛を数え、見えない船体を思い描いた。",
        highlight: "ずっと前に黄ばんだ帳面の頁にひとつひとつの名を書き留めた。霧が立ちこめると、代わりに汽笛を数え",
    },
    {
        html: "どの記録にも日付<sup>1</sup>、<code>船体</code>の種類、短い<em>天気の覚え書き</em>、そして船が出た<ruby>港<rp>(</rp><rt>みなと</rt><rp>)</rp></ruby>が記され、帳面はとても長い手紙のようになった。",
        highlight: "日付1、船体の種類、短い天気の覚え書き、そして船が出た港(みなと)",
    },
];

export function fixturesFor(params: URLSearchParams): Fixture[] {
    if (params.get("dir") === "rtl") return rtlFixtures;
    // vertical-lr is mainly used by Mongolian, which CI has no reliable font for.
    return params.get("wm") === "vertical-rl" ? verticalFixtures : ltrFixtures;
}

/** Applies the writing mode, direction, columns and zoom requested in the URL to the document. */
export function applyDocumentParams(params: URLSearchParams) {
    const root = document.documentElement;
    root.style.writingMode = params.get("wm") ?? "horizontal-tb";
    if (root.style.writingMode === "vertical-rl") root.lang = "ja";
    if (params.get("dir") === "rtl") {
        root.dir = "rtl";
        root.lang = "ar";
    }
    const cols = params.get("cols");
    if (cols) {
        // Paginated like the navigator: one viewport-high row of columns that overflows inline.
        root.style.setProperty("height", "100vh");
        root.style.setProperty("column-count", cols);
        root.style.setProperty("column-gap", "0");
        root.style.setProperty("column-fill", "auto");
    }
    const zoom = params.get("zoom");
    if (zoom) root.style.setProperty("zoom", zoom);
}

export function createController(): DecorationController {
    const channel = new DirectCommsChannel();
    new Decorator().mount(window, channel.frame);
    return new DecorationController(channel.host);
}

/** A decoration covering `highlight` inside the element matching `selector`. */
export function decorationFor(id: string, selector: string, highlight: string, style: BuiltinDecorationStyle): Decoration {
    return {
        id,
        locator: new Locator({
            href: location.pathname,
            type: "text/html",
            locations: new LocatorLocations({ otherLocations: new Map([["cssSelector", selector]]) }),
            text: new LocatorText({ highlight }),
        }),
        style,
    };
}

export function describeStyle(style: BuiltinDecorationStyle): string {
    return [
        style.layout ?? DecorationLayout.Boxes,
        style.width ?? DecorationWidth.Wrap,
        style.lineStyle,
        style.thickness !== undefined ? `thickness ${style.thickness}` : undefined,
        style.expand !== undefined ? `expand ${style.expand}` : undefined,
    ].filter(Boolean).join(" · ");
}

/** Resolves once fonts are loaded and the decorator's deferred messages and frames have run. */
export async function settle() {
    await document.fonts.ready;
    for (let i = 0; i < 3; i++) {
        await new Promise(resolve => setTimeout(resolve));
        await new Promise(resolve => requestAnimationFrame(resolve));
    }
}

declare global {
    interface Window {
        decorationsSettled?: () => Promise<void>;
    }
}
window.decorationsSettled = settle;
