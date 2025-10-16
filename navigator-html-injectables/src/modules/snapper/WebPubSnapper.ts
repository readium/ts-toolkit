import { Locator, LocatorLocations, LocatorText } from "@readium/shared";
import { Comms } from "../../comms/comms";
import { ReadiumWindow, deselect, findFirstVisibleLocator } from "../../helpers/dom";
import { ModuleName } from "../ModuleLibrary";
import { Snapper } from "./Snapper";
import { rangeFromLocator } from "../../helpers/locator";
import { forceWebkitRecalc } from "../../helpers/document";

export class WebPubSnapper extends Snapper {
    static readonly moduleName: ModuleName = "webpub_snapper";

    private wnd!: ReadiumWindow;
    private comms!: Comms;
    private resizeObserver!: ResizeObserver;

    private initialScrollHandled = false;
    private isScrolling = false;
    private lastScrollTop = 0;
    private isResizing = false;
    private resizeDebounce: number | null = null;

    private doc() {
        return this.wnd.document.scrollingElement as HTMLElement;
    }

    private reportProgress() {
        if (!this.comms.ready) return;

        const scrollTop = Math.ceil(this.doc().scrollTop);
        const scrollHeight = this.doc().scrollHeight;
        const viewportHeight = this.wnd.innerHeight;
        const progress = Math.max(0, Math.min(1, scrollTop / scrollHeight));
        const viewportEnd = Math.max(0, Math.min(1, (scrollTop + viewportHeight) / scrollHeight));

        this.comms.send("progress", {
            start: progress,
            end: viewportEnd
        });
    }

    private handleScroll = () => {
        if (!this.comms.ready) return;

        // Filter resize events
        if (this.isResizing) {
            return;
        }

        // Filter initial scroll event
        if (!this.initialScrollHandled) {
            this.lastScrollTop = this.doc().scrollTop;
            this.initialScrollHandled = true;
            this.reportProgress();
            return;
        }

        if (!this.isScrolling) {
            this.isScrolling = true;
            this.wnd.requestAnimationFrame(() => {
                this.reportProgress();

                const currentScrollTop = this.doc().scrollTop;
                const deltaY = currentScrollTop - this.lastScrollTop;
                this.lastScrollTop = currentScrollTop;

                this.comms.send("scroll", deltaY);

                this.isScrolling = false;
            });
        }
    };

    mount(wnd: ReadiumWindow, comms: Comms): boolean {
        this.wnd = wnd;
        this.comms = comms;

        this.initialScrollHandled = false;
        this.lastScrollTop = 0;
        this.isResizing = false;
        if (this.resizeDebounce) {
            this.wnd.clearTimeout(this.resizeDebounce);
            this.resizeDebounce = null;
        }

        // Set up resize handling
        this.resizeObserver = new ResizeObserver(() => {
            if (this.resizeDebounce) {
                this.wnd.clearTimeout(this.resizeDebounce);
            }

            this.isResizing = true;
            this.resizeDebounce = this.wnd.setTimeout(() => {
                this.isResizing = false;
                this.resizeDebounce = null;
                this.reportProgress();
            }, 50);
        });
        this.resizeObserver.observe(wnd.document.body);

        wnd.addEventListener("scroll", this.handleScroll, { passive: true });

        comms.register("force_webkit_recalc", WebPubSnapper.moduleName, () => {
            forceWebkitRecalc(this.wnd);

            // We absolutely must do this because overflown content
            // won’t be rendered if we do not trigger scroll… 
            // Only the content at the start of the document, 
            // whose height is the viewport height, will be rendered.
            const currentScroll = this.doc().scrollTop;
            if (currentScroll > 1) {
                this.doc().scrollTop = currentScroll - 1;
            } else {
                this.doc().scrollTop = currentScroll + 1;
            }
            this.doc().scrollTop = currentScroll;
        });

        comms.register("go_progression", WebPubSnapper.moduleName, (data, ack) => {
            const position = data as number;

            if (position < 0 || position > 1) {
                comms.send("error", {
                    message: "go_progression must be given a position from 0.0 to 1.0"
                });
                ack(false);
                return;
            }

            this.wnd.requestAnimationFrame(() => {
                this.doc().scrollTop = this.doc().offsetHeight * position;
                this.reportProgress();
                deselect(this.wnd);
                ack(true);
            });
        });

        this.comms.register("go_id", WebPubSnapper.moduleName, (data, ack) => {
            const element = wnd.document.getElementById(data as string);
            if(!element) {
                ack(false);
                return;
            }
            this.wnd.requestAnimationFrame(() => {
                this.doc().scrollTop = element.getBoundingClientRect().top + wnd.scrollY - wnd.innerHeight / 2;
                this.reportProgress();
                deselect(this.wnd);
                ack(true);
            });
        });

        comms.register("go_text", WebPubSnapper.moduleName, (data, ack) => {
            let cssSelector = undefined;
            if(Array.isArray(data)) {
                if(data.length > 1)
                    cssSelector = (data as unknown[])[1] as string;
                data = data[0];
            }
            const text = LocatorText.deserialize(data);
            const r = rangeFromLocator(this.wnd.document, new Locator({
                href: wnd.location.href,
                type: "text/html",
                text,
                locations: cssSelector ? new LocatorLocations({
                    otherLocations: new Map([
                        ["cssSelector", cssSelector]
                    ])
                }) : undefined
            }));
            if(!r) {
                ack(false);
                return;
            }
            this.wnd.requestAnimationFrame(() => {
                this.doc().scrollTop = r.getBoundingClientRect().top + wnd.scrollY - wnd.innerHeight / 2;
                this.reportProgress();
                deselect(this.wnd);
                ack(true);
            });
        });

        comms.register("go_start", WebPubSnapper.moduleName, (_, ack) => {
            if (this.doc().scrollTop === 0) return ack(false);
            this.doc().scrollTop = 0;
            this.reportProgress();
            ack(true);
        });

        comms.register("go_end", WebPubSnapper.moduleName, (_, ack) => {
            if (this.doc().scrollTop === this.doc().scrollHeight - this.doc().offsetHeight) return ack(false);
            this.doc().scrollTop = this.doc().scrollHeight - this.doc().offsetHeight;
            this.reportProgress();
            ack(true);
        });

        comms.register("unfocus", WebPubSnapper.moduleName, (_, ack) => {
            deselect(this.wnd);
            ack(true);
        });

        comms.register([
            "go_next",
            "go_prev",
        ], WebPubSnapper.moduleName, (_, ack) => ack(false));
        comms.register("focus", WebPubSnapper.moduleName, (_, ack) => {
            this.reportProgress();
            ack(true);
        });

        comms.register("first_visible_locator", WebPubSnapper.moduleName, (_, ack) => {
            const locator = findFirstVisibleLocator(wnd, true);
            comms.send("first_visible_locator", locator.serialize());
            ack(true);
        });

        comms.log("WebPubSnapper Mounted");
        return true;
    }

    unmount(wnd: ReadiumWindow, comms: Comms): boolean {
        comms.unregisterAll(WebPubSnapper.moduleName);
        this.resizeObserver.disconnect();
        if (this.handleScroll) wnd.removeEventListener("scroll", this.handleScroll);
        comms.log("WebPubSnapper Unmounted");
        return true;
    }
}
