import type { Decoration, DecorationActivatedEvent, DecorationPointerEnterData, DecorationPointerLeaveData } from "@readium/navigator-html-injectables";
import type { DirectCommsHost } from "../comms/direct.ts";
import type { DecorationObserver } from "../Decoration.ts";

export class DecorationController {
    private _decorations = new Map<string, Decoration[]>();
    private _activationState = new Map<string, boolean>();
    private _hoverState = new Map<string, boolean>();
    private _observers = new Map<string, Set<DecorationObserver>>();
    private _hoveredDecorations = new Map<string, Decoration>();

    constructor(private readonly host: DirectCommsHost) {
        host.on("decoration_activated", (raw) => {
            const ev = raw as DecorationActivatedEvent;
            const decoration = this._decorations.get(ev.group)?.find(d => d.id === ev.decorationId);
            if (!decoration) return;
            this._observers.get(ev.group)?.forEach(obs =>
                obs.onDecorationActivated({ group: ev.group, decoration, rect: ev.rect, point: ev.point })
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
        this._activationState.set(group, true);
        this.host.send("decoration_activatable", { group, activatable: true });
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const locA = typeof (a.locator.locations as any)?.serialize === "function"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ? (a.locator.locations as any).serialize() : a.locator.locations;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const locB = typeof (b.locator.locations as any)?.serialize === "function"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ? (b.locator.locations as any).serialize() : b.locator.locations;
    if (JSON.stringify(locA) !== JSON.stringify(locB)) return false;
    if (a.style.type !== b.style.type) return false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sa = a.style as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = b.style as any;
    if (sa.tint !== sb.tint || sa.layout !== sb.layout || sa.width !== sb.width) return false;
    if ((sa.enforceContrast ?? true) !== (sb.enforceContrast ?? true)) return false;
    if ((sa.expand ?? 0) !== (sb.expand ?? 0)) return false;

    if (sa.element !== sb.element || sa.stylesheet !== sb.stylesheet) return false;
    return JSON.stringify(a.extras ?? null) === JSON.stringify(b.extras ?? null);
}
