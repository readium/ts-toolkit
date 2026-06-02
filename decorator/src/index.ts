export type { IComms } from "@readium/navigator-html-injectables";
export { Decorator } from "@readium/navigator-html-injectables";
export type {
    Decoration,
    DecoratorRequest,
    DecorationActivatedEvent as DecorationActivatedWireEvent,
    DecorationStyle,
    BuiltinDecorationStyle,
    HTMLDecorationTemplate,
} from "@readium/navigator-html-injectables";
export {
    DecorationStyleType,
    DecorationLayout,
    DecorationWidth,
} from "@readium/navigator-html-injectables";

export * from "./comms/direct.ts";
export * from "./controller/DecorationController.ts";
