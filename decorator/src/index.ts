export type { IComms } from "@readium/navigator-html-injectables";
export { Decorator } from "@readium/navigator-html-injectables";
export type {
    DecoratorRequest,
    DecorationActivatedEvent as DecorationActivatedWireEvent,
} from "@readium/navigator-html-injectables";
export {
    DecorationStyleType,
    DecorationLayout,
    DecorationWidth,
} from "@readium/navigator-html-injectables";

export * from "./styles.ts";
export * from "./comms/direct.ts";
export * from "./Decoration.ts";
export * from "./controller/DecorationController.ts";
