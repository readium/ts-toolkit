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
 * Only the objects of the resource are kept from a document covering the whole publication.
 */
export class PublicationGuidedNavigationSource implements GuidedNavigationSource {
    constructor(private readonly publication: Publication) {}

    async guideFor(link: Link): Promise<GuidedNavigationObject[] | undefined> {
        const href = link.href.split("#")[0];
        const document = await this.publication.guideForLink(link, { skipAudio: true }).catch(() => undefined);
        if (document) {
            const guided = this.objectsIn(document.guided, href);
            if (guided.length > 0 && this.isLocatable(guided)) return guided;
        }
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

    // Objects without a resource of their own belong to their parent's, and are kept when that is `href` or unknown.
    private objectsIn(objects: GuidedNavigationObject[], href: string, parentHref?: string): GuidedNavigationObject[] {
        return objects.flatMap(object => {
            const objectHref = this.resourceOf(object) ?? parentHref;
            const children = object.children ? this.objectsIn(object.children, href, objectHref) : [];
            if (objectHref !== undefined && objectHref !== href) return children;
            if (children.length === 0 && !object.text && !object.textref && !object.imgref) return [];
            return [new GuidedNavigationObject({ ...object, children: children.length > 0 ? children : undefined })];
        });
    }

    private resourceOf(object: GuidedNavigationObject): string | undefined {
        const textHref = object.textref?.split("#")[0];
        if (textHref) return textHref;
        return this.imageOf(object);
    }

    // An imgref only names a resource when it's an image of the reading order, as in Divina.
    private imageOf(object: GuidedNavigationObject): string | undefined {
        const href = object.imgref?.split("#")[0];
        return href && this.publication.readingOrder.findWithHref(href) ? href : undefined;
    }

    // Every object with text must be locatable by its own ref or an ancestor's, or following would miss it.
    private isLocatable(objects: GuidedNavigationObject[], ancestorLocatable = false): boolean {
        return objects.every(object => {
            const own = object.textref ? decodeTextref(object) !== undefined : this.imageOf(object) !== undefined;
            const locatable = ancestorLocatable || own;
            if (object.text && !locatable) return false;
            return !object.children || this.isLocatable(object.children, locatable);
        });
    }
}
