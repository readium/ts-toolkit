import type { IComms, CommsCallback } from "@readium/navigator-html-injectables";

type AckFn = (ok: boolean) => void;
type EventListener = (data: unknown) => void;

export class DirectCommsChannel {
    readonly frame: DirectCommsFrame;
    readonly host: DirectCommsHost;

    constructor() {
        this.frame = new DirectCommsFrame(this);
        this.host = new DirectCommsHost(this);
    }
}

export class DirectCommsFrame implements IComms {
    private registrar = new Map<string, { module: string; cb: CommsCallback }[]>();

    constructor(private readonly channel: DirectCommsChannel) {}

    register(key: string | string[], module: string, callback: CommsCallback): void {
        const keys = Array.isArray(key) ? key : [key];
        keys.forEach(k => {
            const listeners = this.registrar.get(k) ?? [];
            const existing = listeners.find(l => l.module === module);
            if (existing) throw new Error(`Duplicate callback for "${k}" in module "${module}"`);
            listeners.push({ module, cb: callback });
            this.registrar.set(k, listeners);
        });
    }

    unregister(key: string | string[], module: string): void {
        const keys = Array.isArray(key) ? key : [key];
        keys.forEach(k => {
            const ls = this.registrar.get(k);
            if (!ls) return;
            this.registrar.set(k, ls.filter(l => l.module !== module));
        });
    }

    unregisterAll(module: string): void {
        this.registrar.forEach((ls, k) => {
            this.registrar.set(k, ls.filter(l => l.module !== module));
        });
    }

    _dispatch(key: string, data: unknown, ack: AckFn): void {
        const ls = this.registrar.get(key);
        if (!ls?.length) { ack(false); return; }
        ls.forEach(l => l.cb(data, ack));
    }

    send(key: string, data: unknown): void {
        this.channel.host._receive(key, data);
    }

    log(...data: unknown[]): void {
        this.channel.host._receive("log", data);
    }

    readonly ready = true;

    destroy(): void {
        this.registrar.clear();
    }
}

export class DirectCommsHost {
    private listeners = new Map<string, EventListener[]>();

    constructor(private readonly channel: DirectCommsChannel) {}

    send(key: string, data: unknown, callback?: AckFn): void {
        this.channel.frame._dispatch(key, data, callback ?? (() => {}));
    }

    on(key: string, cb: EventListener): void {
        const ls = this.listeners.get(key) ?? [];
        ls.push(cb);
        this.listeners.set(key, ls);
    }

    off(key: string, cb: EventListener): void {
        const ls = this.listeners.get(key);
        if (ls) this.listeners.set(key, ls.filter(l => l !== cb));
    }

    _receive(key: string, data: unknown): void {
        this.listeners.get(key)?.forEach(cb => cb(data));
    }

    readonly ready = true;
}
