import './style.css'

import { BasicTextSelection, FrameClickEvent } from "@readium/navigator-html-injectables";
import { EpubNavigator, EpubNavigatorListeners, FrameManager, FXLFrameManager } from "@readium/navigator";
import { Locator, Manifest, Publication } from "@readium/shared";
import { Fetcher } from "@readium/shared";
import { HttpFetcher } from "@readium/shared";
import { Link } from "@readium/shared";

// Design
import '@material/web/all'; // TODO optimize for elements we use
import Peripherals from './peripherals';

async function load() {
    const currentURL = new URL(window.location.href);
    let book = "moby-dick";
    let publicationURL = "";
    if(currentURL.searchParams.has("book")) {
        book = currentURL.searchParams.get("book")!;
    }
    if(book.startsWith("http://") || book.startsWith("https://")) { // TODO: use URL.canParse()
        publicationURL = book;
        if(!book.endsWith("manifest.json") && !book.endsWith("/")) publicationURL += "/";
    } else
        publicationURL = `${currentURL.origin}/books/${book}/manifest.json`

    const container: HTMLElement = document.body.querySelector("#container") as HTMLElement;
    const manifestLink = new Link({ href: "manifest.json" });
    const fetcher: Fetcher = new HttpFetcher(undefined, publicationURL);
    const fetched = fetcher.get(manifestLink);
    const selfLink = (await fetched.link()).toURL(publicationURL)!;
    await fetched.readAsJSON()
        .then(async (response: unknown) => {
            const manifest = Manifest.deserialize(response as string)!;
            manifest.setSelfLink(selfLink);
            const publication = new Publication({ manifest: manifest, fetcher: fetcher });

            const topBar = document.getElementById("top-bar")!;
            const titleHeader = topBar.querySelector("h3")!;
            titleHeader.innerText = manifest.metadata.title.getTranslation("en");

            const p = new Peripherals({
                moveTo: (direction) => {
                    if (direction === "right") {
                        nav.goRight(true, () => {});
                    } else if(direction === "left") {
                        nav.goLeft(true, () => {});
                    }
                },
                menu: (_show) => {
                    // No UI that hides/shows at the moment
                },
                goProgression: (_shiftKey) => {
                    nav.goForward(true, () => {});
                }
            });

            const listeners: EpubNavigatorListeners = {
                frameLoaded: function (_wnd: Window): void {
                    /*nav._cframes.forEach((frameManager: FrameManager | FXLFrameManager) => {
                        frameManager.msg!.send(
                            "set_property",
                            ["--USER__colCount", 1],
                            (ok: boolean) => (ok ? {} : {})
                        );
                    })*/
                    nav._cframes.forEach((frameManager: FrameManager | FXLFrameManager | undefined) => {
                        if (frameManager) p.observe(frameManager.window);
                    });
                    p.observe(window);
                },
                positionChanged: function (_locator: Locator): void {
                    window.focus();
                },
                tap: function (_e: FrameClickEvent): boolean {
                    return false;
                },
                click: function (_e: FrameClickEvent): boolean {
                    return false;
                },
                zoom: function (_scale: number): void {
                },
                miscPointer: function (_amount: number): void {
                },

                customEvent: function (_key: string, _data: unknown): void {
                },
                handleLocator: function (locator: Locator): boolean {
                    const href = locator.href;
                    if (href.startsWith("http://") ||
                        href.startsWith("https://") ||
                        href.startsWith("mailto:") ||
                        href.startsWith("tel:")) {
                        if (confirm(`Open "${href}" ?`))
                            window.open(href, "_blank");
                    } else {
                        console.warn("Unhandled locator", locator);
                    }
                    return false;
                },
                textSelected: function (_selection: BasicTextSelection): void {
                    throw new Error('Function not implemented.');
                }
            }
            const nav = new EpubNavigator(container, publication, listeners);
            await nav.load();

            p.observe(window);

            window.addEventListener("reader-control", (ev) => {
                const detail = (ev as CustomEvent).detail as {
                    command: string;
                    data: unknown;
                };
                switch (detail.command) {
                    case "goRight":
                        nav.goRight(true, () => {});
                        break;
                    case "goLeft":
                        nav.goLeft(true, () => {});
                        break;
                    case "goTo":
                        const link = nav.publication.linkWithHref(detail.data as string);
                        if(!link) {
                            console.error("Link not found", detail.data);
                            return;
                        }
                        nav.goLink(link, true, (ok) => {
                            // Hide TOC dialog if navigation was a success
                            if(ok) (document.getElementById("toc-dialog") as HTMLDialogElement).close();
                        });
                        break;
                    case "settings":
                        (document.getElementById("settings-dialog") as HTMLDialogElement).show();
                        break;
                    case "toc":
                        // Seed TOC
                        const container = document.getElementById("toc-list") as HTMLElement;
                        container.querySelectorAll(":scope > md-list-item, :scope > md-divider").forEach(e => e.remove()); // Clear TOC

                        if (nav.publication.tableOfContents) {
                            const template = container.querySelector("template") as HTMLTemplateElement;
                            nav.publication.tableOfContents.items.forEach((item: Link) => {
                                const clone = template.content.cloneNode(true) as HTMLElement;

                                // Link
                                const element = clone.querySelector("md-list-item")!;
                                element.href = `javascript:control('goTo', '${item.href}')`;

                                // Title
                                const headlineSlot = element.querySelector("div[slot=headline]") as HTMLDivElement;
                                headlineSlot.innerText = item.title || "[Untitled]";

                                // Href for debugging
                                const supportingTextSlot = element.querySelector("div[slot=supporting-text]") as HTMLDivElement;
                                supportingTextSlot.innerText = item.href;

                                container.appendChild(clone);
                            })
                        } else {
                            container.innerText = "TOC is empty";
                        }

                        // Show the TOC dialog
                        (document.getElementById("toc-dialog") as HTMLDialogElement).show();
                        break;
                    default:
                        console.error("Unknown reader-control event", ev);
                }
            })
        }).catch((error) => {
            console.error("Error loading manifest", error);
            alert(`Failed loading manifest ${selfLink}`);
        });
}

document.addEventListener("DOMContentLoaded", () => {
    console.log("Document has been loaded");
    load();
});