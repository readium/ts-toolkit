import type { DecorationActivatedEvent, DecorationPointerEnterData, DecorationPointerLeaveData } from "@readium/navigator-html-injectables";
import type { DirectCommsHost } from "../comms/direct.ts";
import type { DecorationObserver } from "../Decoration.ts";
import type { Decoration, DecoratorConfig } from "../styles.ts";
import { decorationsEqual, resolveDecorationForWire, supportsDecorationStyle } from "../styles.ts";

export type DecorationControllerConfig = DecoratorConfig;

export class DecorationController {
    private _decorations = new Map<string, Decoration[]>();
    private _activationState = new Map<string, boolean>();
    private _hoverState = new Map<string, boolean>();
    private _observers = new Map<string, Set<DecorationObserver>>();
    private _hoveredDecorations = new Map<string, Decoration>();
    private readonly _config: DecorationControllerConfig;

    constructor(private readonly host: DirectCommsHost, config: DecorationControllerConfig = {}) {
        this._config = config;
        host.on("decoration_activated", (raw) => {
            const ev = raw as DecorationActivatedEvent;
            const decoration = this._decorations.get(ev.group)?.find(d => d.id === ev.decorationId);
            if (!decoration) return;
            this._observers.get(ev.group)?.forEach(obs =>
                obs.onDecorationActivated?.({ group: ev.group, decoration, rect: ev.rect, point: ev.point })
            );
        });

        host.on("decoration_pointer_enter", (raw) => {
            const ev = raw as DecorationPointerEnterData;
            const decoration = this._decorations.get(ev.group)?.find(d => d.id === ev.decorationId);
            if (!decoration) return;
            this._hoveredDecorations.set(ev.group, decoration);
            this._observers.get(ev.group)?.forEach(obs =>
                obs.onDecorationPointerEnter?.({ group: ev.group, decoration, rect: ev.rect, point: ev.point })
            );
        });

        host.on("decoration_pointer_leave", (raw) => {
            const ev = raw as DecorationPointerLeaveData;
            const decoration = this._decorations.get(ev.group)?.find(d => d.id === ev.decorationId)
                ?? this._hoveredDecorations.get(ev.group);
            this._hoveredDecorations.delete(ev.group);
            if (!decoration) return;
            this._observers.get(ev.group)?.forEach(obs =>
                obs.onDecorationPointerLeave?.({ group: ev.group, decoration, rect: ev.rect, point: ev.point })
            );
        });
    }

    supportsDecorationStyle(styleTypeId: string): boolean {
        return supportsDecorationStyle(styleTypeId, this._config.decorationTemplates);
    }

    applyDecorations(decorations: Decoration[], group: string): void {
        const previous = this._decorations.get(group) ?? [];
        const prevById = new Map(previous.map(d => [d.id, d]));
        const nextById = new Map(decorations.map(d => [d.id, d]));

        for (const [id, prev] of prevById) {
            const next = nextById.get(id);
            if (!next) {
                this.host.send("decorate", { group, action: "remove", decoration: { id } });
            } else if (!decorationsEqual(prev, next)) {
                this.host.send("decorate", { group, action: "update", decoration: resolveDecorationForWire(next, this._config.decorationTemplates) });
            }
        }
        for (const [id, next] of nextById) {
            if (!prevById.has(id)) {
                this.host.send("decorate", { group, action: "add", decoration: resolveDecorationForWire(next, this._config.decorationTemplates) });
            }
        }

        this._decorations.set(group, decorations);
        const activatable = this._activationState.get(group);
        if (activatable !== undefined) {
            this.host.send("decoration_activatable", { group, activatable });
        }
        const hoverable = this._hoverState.get(group);
        if (hoverable !== undefined) {
            this.host.send("decoration_hoverable", { group, hoverable });
        }
    }

    registerDecorationObserver(group: string, observer: DecorationObserver): void {
        if (!this._observers.has(group)) this._observers.set(group, new Set());
        this._observers.get(group)!.add(observer);
        if (observer.onDecorationActivated) {
            this._activationState.set(group, true);
            this.host.send("decoration_activatable", { group, activatable: true });
        }
        if (observer.onDecorationPointerEnter || observer.onDecorationPointerLeave) {
            this._hoverState.set(group, true);
            this.host.send("decoration_hoverable", { group, hoverable: true });
        }
    }

    unregisterDecorationObserver(observer: DecorationObserver): void {
        this._observers.forEach((set, group) => {
            if (!set.has(observer)) return;
            set.delete(observer);

            const stillActivatable = [...set].some(o => o.onDecorationActivated);
            if (this._activationState.has(group) && !stillActivatable) {
                this._activationState.delete(group);
                this.host.send("decoration_activatable", { group, activatable: false });
            }

            const stillHoverable = [...set].some(o => o.onDecorationPointerEnter || o.onDecorationPointerLeave);
            if (this._hoverState.has(group) && !stillHoverable) {
                this._hoverState.delete(group);
                this.host.send("decoration_hoverable", { group, hoverable: false });
            }
        });
    }

    destroy(): void {
        this._decorations.clear();
        this._activationState.clear();
        this._hoverState.clear();
        this._observers.clear();
        this._hoveredDecorations.clear();
    }
}
