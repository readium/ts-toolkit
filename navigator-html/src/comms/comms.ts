import { CommsSendKey, CommsReceiveKey } from "./keys";

export const COMMS_VERSION = 1;

export interface CommsMessage {
    _readium: number; // Sanity/version-checking field
    strict?: boolean; // Whether or not the event *must* be handled by the receiver
    key: CommsSendKey | CommsReceiveKey; // The "key" for identification to the listener
    data: unknown; // The data to be sent to the module
}

export interface Registrant {
    module: string;
    cb: CommsCallback;
}
export type CommsCallback = (data: unknown) => void; // TODO: maybe more than void?

/**
 * Comms is basically a wrapper around window.postMessage that 
 * adds structure to the messages and lets modules register callbacks.
 */
export class Comms {
    private destination: MessageEventSource | null = null;
    private registrar = new Map<CommsReceiveKey, Registrant[]>();

    constructor(wnd: Window) {
        wnd.addEventListener("message", (event) => {
            if(event.source === null) throw Error("Event source is null");
            if(typeof event.data !== "object") return; // Skip events whose data is not an object
            // console.log("Received message", event.data);
            const data = event.data as CommsMessage; // Cast it as a CommsMessage
            if(!("_readium" in data) || !data._readium || data._readium <= 0) return; // Not for us
            if(data.key === "_ping") {
                // The "ping" gives us a destination we bind to for posting events
                if(!this.destination) {
                    this.destination = event.source;
                    // TODO: should we lock down the target origin too?
                    this.send("_pong", undefined);
                }
                return;
            }
            this.handle(data);
        });
    }

    private handle(data: CommsMessage) {
        const listeners = this.registrar.get(data.key as CommsReceiveKey);
        if(!listeners || listeners.length === 0) {
            if(data.strict) this.send("_unhandled", data); // Let the sender know the data was not handled by any listener
            return;
        }
        listeners.forEach(l => l.cb(data.data));
    }

    public register(key: CommsReceiveKey, module: string, callback: CommsCallback) {
        const listeners = this.registrar.get(key);
        if(listeners && listeners.length >= 0) {
            const existing = listeners.find(l => l.module === module);
            if(existing) throw new Error(`Trying to register another callback for combination of event ${key} and module ${module}`);
            listeners.push({
                cb: callback,
                module
            })
            this.registrar.set(key, listeners);
        } else
            this.registrar.set(key, [{
                cb: callback,
                module
            }]);
    }

    public unregister(key: CommsReceiveKey, module: string) {
        const listeners = this.registrar.get(key);
        if(!listeners || listeners.length === 0) return;
        listeners.splice(listeners.findIndex(l => l.module === module), 1);
    }

    public send(key: CommsSendKey, data: unknown, strict: boolean = false, transfer: Transferable[] = []) {
        if(!this.destination) throw Error("Attempted to send comms message before destination has been initialized");
        this.destination.postMessage({
            _readium: COMMS_VERSION,
            strict,
            key,
            data
        } as CommsMessage, {
            // targetOrigin
            transfer
        });
    }
}