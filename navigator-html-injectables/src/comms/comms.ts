import { CommsEventKey, CommsCommandKey } from "./keys";
import { mid } from "./mid";

export const COMMS_VERSION = 1;

export interface CommsMessage {
    _readium: number; // Sanity/version-checking field
    _channel: string; // Channel ID
    id?: string; // Optional (but recommended!) unique identifier
    strict?: boolean; // Whether or not the event *must* be handled by the receiver
    key: CommsEventKey | CommsCommandKey; // The "key" for identification to the listener
    data: unknown; // The data to be sent to the module
}

export interface Registrant {
    module: string;
    cb: CommsCallback;
}
export type CommsAck = (ok: boolean) => void;
export type CommsCallback = (data: unknown, ack: CommsAck) => void; // TODO: maybe more than void?

/**
 * Comms is basically a wrapper around window.postMessage that 
 * adds structure to the messages and lets modules register callbacks.
 */
export class Comms {
    private readonly wnd: Window;
    private destination: Window | null = null;
    private registrar = new Map<CommsCommandKey, Registrant[]>();
    private origin: string = "";
    private channelId: string = "";

    constructor(wnd: Window) {
        this.wnd = wnd;
        wnd.addEventListener("message", this.receiver);
    }

    private receive(event: MessageEvent) {
        if(event.source === null) throw Error("Event source is null");
        if(typeof event.data !== "object") return;
        const data = event.data as CommsMessage; // Cast it as a CommsMessage
        if(!("_readium" in data) || !data._readium || data._readium <= 0) return; // Not for us
        if(data.key === "_ping") {
            // The "ping" gives us a destination we bind to for posting events
            if(!this.destination) {
                this.destination = event.source as Window;
                this.origin = event.origin;
                this.channelId = data._channel;

                // Make sure we're communicating with a host on the same comms version
                if(data._readium !== COMMS_VERSION) {
                    if(data._readium > COMMS_VERSION)
                        this.send("error", `received comms version ${data._readium} higher than ${COMMS_VERSION}`);
                    else
                        this.send("error", `received comms version ${data._readium} lower than ${COMMS_VERSION}`);

                    this.destination = null;
                    this.origin = "";
                    this.channelId = "";
                    return;
                }

                this.send("_pong", undefined);
                this.preLog.forEach(d => this.send("log", d));
                this.preLog = [];
            }
            return;
        } else if(this.channelId) {
            // Enforce matching channel ID and origin
            if(
                data._channel !== this.channelId ||
                event.origin !== this.origin
            ) return;
        } else {
            // Ignore any messages beside _ping if not initialized
            return;
        }
        this.handle(data);
    }
    private receiver = this.receive.bind(this);

    private handle(data: CommsMessage) {
        const listeners = this.registrar.get(data.key as CommsCommandKey);
        if(!listeners || listeners.length === 0) {
            if(data.strict) this.send("_unhandled", data); // Let the sender know the data was not handled by any listener
            return;
        }
        listeners.forEach(l => l.cb(data.data, (ok: boolean) => {
            this.send("_ack", ok, data.id); // Acknowledge handling of the event
        }));
    }

    public register(key: CommsCommandKey | CommsCommandKey[], module: string, callback: CommsCallback) {
        if(!Array.isArray(key)) key = [key];
        key.forEach(k => {
            const listeners = this.registrar.get(k);
            if(listeners && listeners.length >= 0) {
                const existing = listeners.find(l => l.module === module);
                if(existing) throw new Error(`Trying to register another callback for combination of event ${k} and module ${module}`);
                listeners.push({
                    cb: callback,
                    module
                })
                this.registrar.set(k, listeners);
            } else
                this.registrar.set(k, [{
                    cb: callback,
                    module
                }]);
        })
    }

    public unregister(key: CommsCommandKey | CommsCommandKey[], module: string) {
        if(!Array.isArray(key)) key = [key];
        key.forEach(k => {
            const listeners = this.registrar.get(k);
            if(!listeners || listeners.length === 0) return;
            listeners.splice(listeners.findIndex(l => l.module === module), 1);
        });
    }

    public unregisterAll(module: string) {
        this.registrar.forEach((v, k) => this.registrar.set(k, v.filter(r => r.module !== module)));
    }

    // Convenience function for logging data
    private preLog: any[] = [];
    public log(...data: any[]) {
        if(!this.destination) this.preLog.push(data);
        else this.send("log", data);
    }

    public get ready() {
        return !!this.destination;
    }

    public destroy() {
        this.destination = null;
        this.channelId = "";
        this.preLog = [];
        this.registrar.clear();
        this.wnd.removeEventListener("message", this.receiver);
    }

    public send(key: CommsEventKey, data: unknown, id: unknown = undefined, transfer: Transferable[] = []) {
        if(!this.destination) throw Error("Attempted to send comms message before destination has been initialized");
        const msg = {
            _readium: COMMS_VERSION,
            _channel: this.channelId,
            id: id ?? mid(),
            // scrict,
            key,
            data
        } as CommsMessage;
        try {
            this.destination.postMessage(msg, {
                targetOrigin: this.origin,
                transfer
            });
        } catch (error) {
            // Fallback for when browser doesn't support WindowPostMessageOptions
            // For example, older Safari versions
            if(transfer.length > 0) throw error;
            this.destination.postMessage(msg, this.origin, transfer);
        }
    }
}