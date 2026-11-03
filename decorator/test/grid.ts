import {
    applyDocumentParams,
    createController,
    decorationFor,
    describeStyle,
    fixturesFor,
    layouts,
    linedTypes,
    lineStyles,
    widths,
    DecorationLayout,
    DecorationLineStyle,
    DecorationStyleType,
    DecorationWidth,
    type BuiltinDecorationStyle,
    type BuiltinType,
} from "./harness.ts";

const params = new URLSearchParams(location.search);
applyDocumentParams(params);

const type = (params.get("type") ?? DecorationStyleType.Underline) as BuiltinType;
// Columns only change how Page and Viewport widths snap, so their page shows a single case, in column 2.
const columns = params.has("cols");
document.title = `Decorations: ${type}`;

/** The variants drawn for every layout × width combination, which together form one group. */
function variantsFor(type: BuiltinType): BuiltinDecorationStyle[] {
    if (type === DecorationStyleType.TextColor) {
        return [{}, { thickness: 1.5 }];
    }
    if (linedTypes.includes(type)) {
        return [
            ...lineStyles.map(lineStyle => ({ lineStyle })),
            { expand: 4 },
            { thickness: 4 },
            { thickness: 4, lineStyle: DecorationLineStyle.Wavy },
        ];
    }
    return [{}, { expand: 4 }];
}

function stylesFor(type: BuiltinType): BuiltinDecorationStyle[] {
    if (columns) {
        return [{
            type,
            layout: (params.get("layout") ?? DecorationLayout.Boxes) as DecorationLayout,
            width: (params.get("width") ?? DecorationWidth.Page) as DecorationWidth,
        }];
    }
    return layouts.flatMap(layout => widths.flatMap(width => variantsFor(type).map(variant => ({ type, layout, width, ...variant }))));
}

const main = document.querySelector("main")!;
// A column break before the very first content is ignored, so it needs an empty element to break from.
if (columns) main.append(document.createElement("div"));
const fixtures = columns ? fixturesFor(params).slice(0, 1) : fixturesFor(params);
const decorations = stylesFor(type).flatMap((style, i) => {
    const section = document.createElement("section");
    section.dataset.group = `${style.layout}-${style.width}`;
    if (columns) section.style.breakBefore = "column";
    const heading = document.createElement("h2");
    heading.textContent = describeStyle(style);
    section.append(heading);
    main.append(section);
    return fixtures.map((fixture, j) => {
        const p = document.createElement("p");
        p.id = `case-${i}-${j}`;
        p.innerHTML = fixture.html;
        section.append(p);
        return decorationFor(p.id, `#${p.id}`, fixture.highlight, style);
    });
});

createController().applyDecorations(decorations, "grid");
