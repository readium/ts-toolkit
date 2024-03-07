import './style.css'

import { FrameClickEvent } from "@readium/navigator-html-injectables/src/modules/ReflowablePeripherals";
import { EpubNavigator, EpubNavigatorListeners } from "@readium/navigator/src/"
import { Locator, Manifest, Publication } from "@readium/shared/src";
import { Fetcher } from "@readium/shared/src/fetcher";
import { HttpFetcher } from "@readium/shared/src/fetcher/HttpFetcher";
import { Link } from "@readium/shared/src";

async function load() {
    const currentURL = new URL(window.location.href);
    let book = "moby-dick";
    if(currentURL.searchParams.has("book")) {
        book = currentURL.searchParams.get("book")!;
    }
    const manifestURL = `${currentURL.origin}/books/${book}/manifest.json`

    const container: HTMLElement = document.body.querySelector("#container") as HTMLElement;
    const manifestLink = new Link({ href: "manifest.json" });
    const fetcher: Fetcher = new HttpFetcher(undefined, manifestURL);
    await fetcher.get(manifestLink).readAsJSON()
        .then(async (response: unknown) => {
            const manifest = Manifest.deserialize(response as string)!;
            manifest.setSelfLink(manifestURL);
            const publication = new Publication({ manifest: manifest, fetcher: fetcher })
            const listeners: EpubNavigatorListeners = {
                frameLoaded: function (wnd: Window): void {
                    /*nav._cframes.forEach((frameManager: FrameManager | FXLFrameManager) => {
                        frameManager.msg!.send(
                            "set_property",
                            ["--USER__colCount", 1],
                            (ok: boolean) => (ok ? {} : {})
                        );
                    })*/
                },
                positionChanged: function (locator: Locator): void {
                },
                tap: function (e: FrameClickEvent): boolean {
                    return false;
                },
                click: function (e: FrameClickEvent): boolean {
                    return false;
                },
                zoom: function (scale: number): void {
                },
                miscPointer: function (amount: number): void {
                },
                customEvent: function (key: string, data: unknown): void {
                },
                handleLocator: function (locator: Locator): boolean {
                    return false;
                }
            }
            const nav = new EpubNavigator(container, publication, listeners);
            await nav.load();

            window.addEventListener("reader-control", (ev) => {
                switch ((ev as CustomEvent).detail) {
                    case "goRight":
                        nav.goRight(true, () => {});
                        break;
                    case "goLeft":
                        nav.goLeft(true, () => {});
                        break;
                    default:
                        console.error("Unknown reader-control event", ev);
                }
            })
        })
}

document.addEventListener("DOMContentLoaded", () => {
    console.log("Document has been loaded");
    load();
});