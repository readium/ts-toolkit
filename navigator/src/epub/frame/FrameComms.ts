import {
    COMMS_VERSION,
    CommsMessage,
    CommsCommandKey,
    CommsAck,
    mid,
    CommsEventKey,
} from "@readium/navigator-html-injectables/src";
import { ManagerEventKey } from "../EpubNavigator";

interface RegistryValue {
    time: number;
    cb: CommsAck;
}
const REGISTRY_EXPIRY = 10000; // 10 seconds max

export type FrameCommsListener = (key: CommsEventKey | ManagerEventKey, value: unknown) => void;

export class FrameComms {
    private readonly wnd: Window;
    private readonly registry = new Map<string, RegistryValue>();
    private readonly gc: number;
    // @ts-ignore
    private readonly origin: string;
    public readonly channelId: string;
    private _ready = false;
    private _listener: FrameCommsListener | undefined;
    private listenerBuffer: [key: CommsEventKey, value: unknown][] = [];

    public set listener(listener: FrameCommsListener) {
        if(this.listenerBuffer.length > 0)
        this.listenerBuffer.forEach(msg => listener(msg[0], msg[1]));
        this.listenerBuffer = [];
        this._listener = listener;
    }
    public clearListener() {
        if(typeof this._listener === "function") this._listener = undefined;
    }

    constructor(wnd: Window, origin: string) {
        this.wnd = wnd;
        this.origin = origin;
        try {
            this.channelId = window.crypto.randomUUID();
        } catch (error) {
            this.channelId = mid();
        }
        this.gc = setInterval(() => {
            this.registry.forEach((v, k) => {
                if (performance.now() - v.time > REGISTRY_EXPIRY) {
                    console.warn(k, "event was never handled!");
                    this.registry.delete(k);
                }
            });
        }, 5000);
        window.addEventListener("message", this.handler);
        this.send("_ping", undefined);
    }

    public halt() {
        this._ready = false;
        window.removeEventListener("message", this.handler);
        clearInterval(this.gc);
        this._listener = undefined;
        this.registry.clear();
    }

    public resume() {
        window.addEventListener("message", this.handler);
        this._ready = true;
    }

    private handle(e: MessageEvent) {
        const dt = e.data as CommsMessage;
        if (!dt._readium) {
            console.warn("Ignoring", dt);
            return;
        }
        if(dt._channel !== this.channelId) return; // Not meant for us
        switch (dt.key) {
            case "_ack": {
                if (!dt.id) return;
                const v = this.registry.get(dt.id);
                if (!v) return;
                this.registry.delete(dt.id);
                v.cb(!!dt.data);
                return;
            }
            // @ts-ignore
            case "_pong": {
                this._ready = true;
            }
            default: {
                if(!this.ready) return;
                if(typeof this._listener === "function")
                    this._listener(dt.key as CommsEventKey, dt.data);
                else
                    this.listenerBuffer.push([dt.key as CommsEventKey, dt.data]);
            }
        }
    }
    private handler = this.handle.bind(this);

    public get ready() {
        return this._ready;
    }

    /**
     * Send a message to the window using postMessage-based comms communication
     * @returns Identifier associated with the message
     */
    public send(
        key: CommsCommandKey,
        data: unknown,
        callback?: CommsAck,
        strict = false,
        transfer: Transferable[] = []
    ): string {
        const id = mid(); // Generate reasonably unique identifier
        if (callback)
            this.registry.set(id, {
                // Add callback to the registry
                cb: callback,
                time: performance.now(),
            });
        this.wnd.postMessage(
            {
                _readium: COMMS_VERSION,
                _channel: this.channelId,
                id,
                data,
                key,
                strict,
            } as CommsMessage,
            "/", // Same origin
            transfer
        );
        return id;
    }
}
