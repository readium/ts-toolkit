import type { BuiltinDecorationStyle, Decoration, DecorationActivatedEvent, DecorationPointerEnterData, DecorationPointerLeaveData, HTMLDecorationTemplate } from "@readium/navigator-html-injectables";
import { DecorationStyleType } from "@readium/navigator-html-injectables";
import type { DirectCommsHost } from "../comms/direct.ts";
import type { DecorationObserver } from "../Decoration.ts";

const BUILTIN_DECORATION_TYPES = new Set<string>(Object.values(DecorationStyleType));

export interface DecorationControllerConfig {
    decorationTemplates?: Record<string, HTMLDecorationTemplate>;
}

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
        if (styleTypeId === DecorationStyleType.TextColor) return "Highlight" in window;
        if (BUILTIN_DECORATION_TYPES.has(styleTypeId)) return true;
        return !!this._config.decorationTemplates?.[styleTypeId];
    }

    applyDecorations(decorations: Decoration[], group: string): void {
        const previous = this._decorations.get(group) ?? [];
        const prevById = new Map(previous.map(d => [d.id, d]));
        const nextById = new Map(decorations.map(d => [d.id, d]));

        for (const [id, prev] of prevById) {
            if (!nextById.has(id)) {
                this.host.send("decorate", { group, action: "remove", decoration: { id } });
            } else if (!_decorationsEqual(prev, nextById.get(id)!)) {
                this.host.send("decorate", { group, action: "update", decoration: nextById.get(id)! });
            }
        }
        for (const [id, next] of nextById) {
            if (!prevById.has(id)) {
                this.host.send("decorate", { group, action: "add", decoration: next });
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
            if (set.size === 0) {
                this._activationState.delete(group);
                this.host.send("decoration_activatable", { group, activatable: false });
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

function _decorationsEqual(a: Decoration, b: Decoration): boolean {
    if (a.locator.href !== b.locator.href) return false;
    if (JSON.stringify(a.locator.locations.serialize()) !== JSON.stringify(b.locator.locations.serialize())) return false;
    if (JSON.stringify(a.locator.text ?? null) !== JSON.stringify(b.locator.text ?? null)) return false;
    if (a.style.type !== b.style.type) return false;
    if (a.style.type === "template") {
        const sa = a.style;
        const sb = b.style as HTMLDecorationTemplate;
        if (sa.layout !== sb.layout || sa.width !== sb.width) return false;
        if (sa.element !== sb.element || sa.stylesheet !== sb.stylesheet) return false;
    } else {
        const sa = a.style as BuiltinDecorationStyle;
        const sb = b.style as BuiltinDecorationStyle;
        if (sa.tint !== sb.tint || sa.layout !== sb.layout || sa.width !== sb.width) return false;
        if ((sa.enforceContrast ?? true) !== (sb.enforceContrast ?? true)) return false;
        if ((sa.expand ?? 0) !== (sb.expand ?? 0)) return false;
    }
    return JSON.stringify(a.extras ?? null) === JSON.stringify(b.extras ?? null);
}
