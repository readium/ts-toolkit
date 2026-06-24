import type { Decoration } from "@readium/navigator-html-injectables";

export interface DecorationActivatedEvent<D = Decoration> {
    group: string;
    decoration: D;
    rect?: { top: number; left: number; width: number; height: number };
    point?: { x: number; y: number };
}

export interface DecorationPointerEnterEvent<D = Decoration> {
    group: string;
    decoration: D;
    rect?: { top: number; left: number; width: number; height: number };
    point?: { x: number; y: number };
}

export interface DecorationObserver<D = Decoration> {
    onDecorationActivated(event: DecorationActivatedEvent<D>): boolean;
    onDecorationPointerEnter?(event: DecorationPointerEnterEvent<D>): void;
    onDecorationPointerLeave?(event: { decoration: D; group: string }): void;
}
