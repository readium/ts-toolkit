import type { Decoration } from "@readium/navigator-html-injectables";

export interface DecorationActivatedEvent<D = Decoration> {
    group: string;
    decoration: D;
    rect?: { top: number; left: number; width: number; height: number };
    point?: { x: number; y: number };
}

export interface DecorationHoverEvent<D = Decoration> {
    group: string;
    decoration: D;
    rect?: { top: number; left: number; width: number; height: number };
    point?: { x: number; y: number };
}

export interface DecorationObserver<D = Decoration> {
    onDecorationActivated(event: DecorationActivatedEvent<D>): boolean;
    onDecorationHovered?(event: DecorationHoverEvent<D>): void;
    onDecorationUnhovered?(event: { decoration: D; group: string }): void;
}
