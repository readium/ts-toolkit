import {
    applyDocumentParams,
    createController,
    decorationFor,
    DecorationLayout,
    DecorationStyleType,
    DecorationWidth,
    type BuiltinType,
} from "./harness.ts";

const params = new URLSearchParams(location.search);
applyDocumentParams(params);

const en = "The keeper counted the ships as they passed, writing each name in a ledger whose pages had long since turned yellow, and when the fog rolled in he counted the horns instead, guessing at hulls he could not see.";
const ar = "كان حارس المنارة يعدّ السفن وهي تمرّ، ويكتب اسم كل واحدة في دفتر اصفرّت صفحاته منذ زمن بعيد، وحين يزحف الضباب كان يعدّ الأبواق بدلاً منها.";
const ja = "灯台守は通り過ぎる船を数え、ずっと前に黄ばんだ帳面の頁にひとつひとつの名を書き留めた。霧が立ちこめると、代わりに汽笛を数え、見えない船体を思い描いた。";

const table = `<table><tr><td>${en}</td><td>${en.slice(0, 90)}</td></tr></table>`;
const flex = `<div class="flex"><p>${en}</p><p>${en.slice(0, 90)}</p></div>`;
const float = `<div class="float"><p><img alt="">${en} ${en}</p></div>`;

// With `cols`, the root is paginated in columns, as in the navigator: everything is laid out in its child, body.
// A case with a selector decorates that element whole, as a locator without text does.
const cases: [string, string, string?][] = params.has("cols")
    ? [
        ["Table in a column", table],
        ["Flex row in a column", flex],
        ["Float in a column", float],
        ["Across columns", `<p>${Array(6).fill(en).join(" ")}</p>`],
    ]
    : [
        ["Table, no columns", table],
        ["Across the columns of an element", `<div class="columns short"><p>${en} ${en}</p></div>`],
        ["Into an element's columns", `<p>${en}</p><div class="columns short"><p>${en} ${en}</p></div>`],
        ["Through an element's columns", `<p>${en}</p><div class="columns short"><p>${en} ${en}</p></div><p>${en}</p>`],
        ["An element's columns, whole", `<div class="columns short"><p>${en} ${en}</p></div>`, ".columns"],
        ["An element's columns with an image, whole", `<div class="columns short"><img alt=""><p>${en}</p></div>`, ".columns"],
        ["An element's columns with an empty block, whole", `<div class="columns short"><div class="block"></div><p>${en}</p></div>`, ".columns"],
        ["Across a spanning element", `<div class="columns"><p>${en}</p><p class="spanner">Spanning all columns</p><p>${en}</p></div>`],
        ["Table in a column of an element", `<div class="columns">${table}<p>${en}</p></div>`],
        ["Text directly in an element's columns", `<div class="columns short">${en} ${en}</div>`],
        ["Right-to-left columns", `<div class="columns short" dir="rtl" lang="ar">${ar} ${ar}</div>`],
        ["Vertical columns", `<div class="vertical" lang="ja"><p>${ja}${ja}</p></div>`],
    ];

const type = (params.get("type") ?? DecorationStyleType.Outline) as BuiltinType;
const style = {
    type,
    layout: (params.get("layout") ?? DecorationLayout.Bounds) as DecorationLayout,
    width: (params.get("width") ?? DecorationWidth.Wrap) as DecorationWidth,
};
document.title = `Decorations across layouts: ${type}`;

const main = document.querySelector("main")!;
const decorations = cases.map(([label, html, selector], i) => {
    const section = document.createElement("section");
    const heading = document.createElement("h2");
    heading.textContent = label;
    const content = document.createElement("div");
    content.id = `case-${i}`;
    content.innerHTML = html;
    section.append(heading, content);
    main.append(section);
    if (selector) return decorationFor(content.id, `#${content.id} ${selector}`, "", style);
    // Leaving out a few characters at both ends starts and ends the decoration mid-line.
    const text = content.textContent!;
    return decorationFor(content.id, `#${content.id}`, text.slice(12, -12), style);
});

createController().applyDecorations(decorations, "layouts");
