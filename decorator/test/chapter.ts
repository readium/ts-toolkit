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
if (!params.has("cols")) params.set("cols", "2");
applyDocumentParams(params);

const type = (params.get("type") ?? DecorationStyleType.Highlight) as BuiltinType;
document.title = `Decorations across columns: ${type}`;

// Where columns break depends on each browser's fonts, so the decorated paragraph is the first one split across columns.
document.fonts.ready.then(() => {
    const paragraphs = Array.from(document.querySelectorAll("p"));
    const split = paragraphs.find(p => {
        const rects = p.getClientRects();
        return rects.length > 1 && rects[rects.length - 1].left > rects[0].right;
    }) ?? paragraphs[0];
    split.id = "split";

    // Leaving out a few words at both ends starts and ends the decoration mid-line.
    const words = split.textContent!.split(" ");
    const highlight = words.slice(5, -5).join(" ");
    split.dataset.highlight = highlight;

    const controller = createController();
    controller.applyDecorations([
        decorationFor("split", "#split", highlight, {
            type,
            layout: (params.get("layout") ?? DecorationLayout.Boxes) as DecorationLayout,
            width: (params.get("width") ?? DecorationWidth.Wrap) as DecorationWidth,
        }),
    ], "chapter");

    if (params.has("events")) {
        const events: DecorationEvent[] = window.decorationEvents = [];
        controller.registerDecorationObserver("chapter", {
            onDecorationActivated: ({ rect }) => (events.push({ type: "activated", rect }), true),
            onDecorationPointerEnter: ({ rect }) => { events.push({ type: "enter", rect }); },
            onDecorationPointerLeave: ({ rect }) => { events.push({ type: "leave", rect }); },
        });
    }
});

interface DecorationEvent {
    type: "activated" | "enter" | "leave";
    rect?: { top: number; left: number; width: number; height: number };
}

declare global {
    interface Window {
        decorationEvents?: DecorationEvent[];
    }
}
