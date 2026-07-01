import type { Decoration, DecorationObserver } from "@readium/decorator";
import { DecorationStyleType } from "@readium/decorator";

export type {
    Decoration,
    DecorationStyle,
    HTMLDecorationTemplate,
    NamedDecorationStyle,
    BuiltinDecorationStyle,
    DecoratorConfig,
    OnDecorationActivatedEvent,
    OnDecorationPointerEnterEvent,
    OnDecorationPointerLeaveEvent,
    DecorationObserver,
} from "@readium/decorator";
export {
    DecorationStyleType,
    DecorationLayout,
    DecorationWidth,
    BUILTIN_DECORATION_TYPES,
    resolveDecorationForWire,
    decorationsEqual,
    supportsDecorationStyle,
} from "@readium/decorator";

export interface DecorableNavigator {
    /**
     * Replaces all decorations for the given group with the provided list.
     * The navigator diffs the new list against the current state and issues
     * add / update / remove / clear commands as needed.
     */
    applyDecorations(decorations: Decoration[], group: string): void;

    /**
     * Returns whether the given style type ID can be rendered by this navigator.
     * Returns true for all built-in types and any IDs registered in DecoratorConfig.
     */
    supportsDecorationStyle(styleTypeId: DecorationStyleType | string): boolean;

    /** Registers an observer for activation events on the given group. */
    registerDecorationObserver(group: string, observer: DecorationObserver): void;

    /** Unregisters a previously registered observer from all groups. */
    unregisterDecorationObserver(observer: DecorationObserver): void;
}
