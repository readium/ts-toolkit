import type { DecorationActivatedEvent, DecorationPointerEnterData, DecorationPointerLeaveData } from "@readium/navigator-html-injectables";
import type { Decoration } from "./styles.ts";

export interface OnDecorationActivatedEvent<D = Decoration> extends Omit<DecorationActivatedEvent, "decorationId"> {
    decoration: D;
}

export type OnDecorationPointerEnterEvent<D = Decoration> = Omit<DecorationPointerEnterData, "decorationId"> & { decoration: D };

export type OnDecorationPointerLeaveEvent<D = Decoration> = Omit<DecorationPointerLeaveData, "decorationId"> & { decoration: D };

export interface DecorationObserver<D = Decoration> {
    onDecorationActivated?(event: OnDecorationActivatedEvent<D>): boolean;
    onDecorationPointerEnter?(event: OnDecorationPointerEnterEvent<D>): void;
    onDecorationPointerLeave?(event: OnDecorationPointerLeaveEvent<D>): void;
}
