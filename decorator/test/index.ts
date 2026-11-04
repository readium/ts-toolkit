import {
    applyDocumentParams,
    createController,
    decorationFor,
    directions,
    fixturesFor,
    layouts,
    lineStyles,
    types,
    widths,
    writingModes,
    type BuiltinDecorationStyle,
    type BuiltinType,
} from "./harness.ts";

const params = new URLSearchParams(location.search);
applyDocumentParams(params);

const form = document.querySelector<HTMLFormElement>("#controls")!;

function fillSelect(name: string, values: readonly string[], fallback = "") {
    const select = form.elements.namedItem(name) as HTMLSelectElement;
    select.append(...[fallback, ...values].map(value => new Option(value || "(default)", value)));
    select.value = params.get(name) ?? "";
}
fillSelect("type", types);
fillSelect("layout", layouts);
fillSelect("width", widths);
fillSelect("lineStyle", lineStyles);
fillSelect("wm", writingModes);
fillSelect("dir", directions);
for (const name of ["thickness", "expand", "cols", "zoom", "tint"]) {
    const value = params.get(name);
    if (value) (form.elements.namedItem(name) as HTMLInputElement).value = value;
}

const article = document.querySelector("article")!;
const fixtures = fixturesFor(params);
fixtures.forEach((fixture, i) => {
    const p = document.createElement("p");
    p.id = `fixture-${i}`;
    p.innerHTML = fixture.html;
    article.append(p);
});

function currentStyle(): BuiltinDecorationStyle {
    const value = (name: string) => (form.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement).value || undefined;
    const number = (name: string) => value(name) === undefined ? undefined : Number(value(name));
    return {
        type: value("type") as BuiltinType | undefined,
        layout: value("layout") as BuiltinDecorationStyle["layout"],
        width: value("width") as BuiltinDecorationStyle["width"],
        lineStyle: value("lineStyle") as BuiltinDecorationStyle["lineStyle"],
        thickness: number("thickness"),
        expand: number("expand"),
        tint: params.has("tint") ? value("tint") : undefined,
    };
}

const controller = createController();

function render() {
    const style = currentStyle();
    controller.applyDecorations(fixtures.map((fixture, i) => decorationFor(`explore-${i}`, `#fixture-${i}`, fixture.highlight, style)), "explorer");
}

form.addEventListener("input", (event) => {
    const target = event.target as HTMLInputElement | HTMLSelectElement;
    if (target.value) params.set(target.name, target.value);
    else params.delete(target.name);
    history.replaceState(null, "", `?${params}`);
    // These apply to the whole document, so the page restarts from scratch.
    if (["wm", "dir", "cols", "zoom"].includes(target.name)) location.reload();
    else render();
});

const nav = document.querySelector("#grids")!;
nav.append("Grids: ");
const variants: [string, string][] = [
    ...writingModes.map(wm => [wm, `wm=${wm}`] as [string, string]),
    ["rtl", "dir=rtl"],
    ["2 columns, page", "cols=2&width=page"],
    ["2 columns, viewport", "cols=2&width=viewport"],
];
for (const [label, query] of variants) {
    const line = document.createElement("div");
    line.append(`${label}: `);
    for (const type of types) {
        const link = document.createElement("a");
        link.href = `grid.html?type=${type}&${query}`;
        link.textContent = type;
        line.append(link);
    }
    nav.append(line);
}

render();
