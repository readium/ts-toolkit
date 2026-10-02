import { GuidedNavigationObject, Link, Publication } from "@readium/shared";
import { decodeTextref, makeGnd } from "@readium/guided-navigation";

export interface GuidedNavigationSource {
    /**
     * Guided Navigation objects of a resource, with every textref qualified by the resource's href.
     * Resolves to undefined when the resource has nothing to read.
     */
    guideFor(link: Link): Promise<GuidedNavigationObject[] | undefined>;
}

/**
 * Uses the publication's Guided Navigation document when its text can be located in the resource,
 * and generates one from the resource's markup otherwise.
 */
export class PublicationGuidedNavigationSource implements GuidedNavigationSource {
    private readonly guides = new Map<string, Promise<GuidedNavigationObject[] | undefined>>();

    constructor(private readonly publication: Publication) {}

    guideFor(link: Link): Promise<GuidedNavigationObject[] | undefined> {
        const href = link.href.split("#")[0];
        let guide = this.guides.get(href);
        if (!guide) {
            guide = this.load(link, href);
            this.guides.set(href, guide);
            guide.catch(() => this.guides.delete(href));
        }
        return guide;
    }

    private async load(link: Link, href: string): Promise<GuidedNavigationObject[] | undefined> {
        const document = await this.publication.guideForLink(link, { skipAudio: true }).catch(() => undefined);
        if (document && isLocatable(document.guided)) return document.guided;
        return this.generate(link, href);
    }

    private async generate(link: Link, href: string): Promise<GuidedNavigationObject[] | undefined> {
        const resource = this.publication.get(link);
        try {
            const resourceLink = await resource.link();
            if (!resourceLink.mediaType.isHTML) return undefined;
            const doc = await resource.readAsXML();
            if (!doc || doc.getElementsByTagNameNS("*", "parsererror").length > 0) return undefined;
            const body = doc.querySelector("body");
            if (!body) return undefined;
            const mediaType = resourceLink.mediaType.essence === "text/html" ? "text/html" : "application/xhtml+xml";
            return makeGnd(body, mediaType, { textrefs: { roles: true }, href })?.guided;
        } finally {
            resource.close();
        }
    }
}

// Every object with text must be locatable by its own textref or an ancestor's, or highlighting would miss it.
function isLocatable(objects: GuidedNavigationObject[], ancestorLocatable = false): boolean {
    return objects.every(object => {
        const locatable = ancestorLocatable || decodeTextref(object) !== undefined;
        if (object.text && !locatable) return false;
        return !object.children || isLocatable(object.children, locatable);
    });
}
