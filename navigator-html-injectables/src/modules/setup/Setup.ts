import { Comms } from "../../comms/comms";
import { ReadiumWindow } from "../../helpers/dom";
import { Module } from "../Module";
import { ModuleName } from "../ModuleLibrary";

export abstract class Setup extends Module {
    static readonly moduleName: ModuleName = "setup";

    private comms!: Comms;
    private wnd!: Window;

    wndOnErr(event: ErrorEvent) {
        this.comms?.send("error", {
            message: event.message,
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno
        });
    }

    protected unblock(wnd: ReadiumWindow) {
        wnd._readium_blockEvents = false;
        while(wnd._readium_blockedEvents?.length > 0) {
            const x = wnd._readium_blockedEvents.shift()!;
            switch(x[0]) {
                case 0:
                    Reflect.apply(x[1], x[2], x[3]);
                    break;
                case 1:
                    const ev = x[1];
                    const evTarget = x[2];
                    wnd.removeEventListener(ev.type, wnd._readium_eventBlocker, true);
                    const evt = new Event(ev.type, {
                        bubbles: ev.bubbles,
                        cancelable: ev.cancelable
                    });
                    if(evTarget) evTarget.dispatchEvent(evt);
                    else wnd.dispatchEvent(evt);
                    break;
            }
        }
    }

    // <audio> & <video> playback handling
    private mediaPlayingCount = 0;

    private onMediaPlayEvent() {
        this.mediaPlayingCount++;
        this.comms?.send("media_play", this.mediaPlayingCount);
    }

    private onMediaPauseEvent() {
        if(this.mediaPlayingCount > 0) this.mediaPlayingCount--;
        this.comms?.send("media_pause", this.mediaPlayingCount);
    }

    private pauseAllMedia() {
        const avEls = this.wnd.document.querySelectorAll("audio,video");
        for (let i = 0; i < avEls.length; i++) {
            (avEls[i] as HTMLMediaElement).pause();
        }
    }

    mount(wnd: Window, comms: Comms): boolean {
        this.comms = comms;
        this.wnd = wnd;

        // Track all window errors
        wnd.addEventListener(
            "error",
            this.wndOnErr,
            false
        );

        comms.register("unfocus", Setup.moduleName, (_, ack) => {
            // When a document is unfocused, all media is paused
            this.pauseAllMedia();
            ack(true);
        });

        const avEls = wnd.document.querySelectorAll("audio,video");
        for (let i = 0; i < avEls.length; i++) {
            const e = avEls[i] as HTMLAudioElement | HTMLVideoElement;
            e.addEventListener("play", this.onMediaPlayEvent, {
                passive: true
            });
            e.addEventListener("pause", this.onMediaPauseEvent, {
                passive: true
            });
        }

        comms.log("Setup Mounted");
        return true;
    }

    unmount(wnd: Window, comms: Comms): boolean {
        wnd.removeEventListener("error", this.wndOnErr);
        wnd.removeEventListener("play", this.onMediaPlayEvent);
        wnd.removeEventListener("pause", this.onMediaPauseEvent);

        comms.log("Setup Unmounted");
        return true;
    }
}