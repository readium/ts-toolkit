import { IInjectableRule, IInjectable, IInjector, IInjectablesConfig } from "./Injectable.ts";
import { Link } from "@readium/shared";

const inferTypeFromResource = (resource: IInjectable): string | undefined => {
    // If blob has a type, use it
    if ("blob" in resource && resource.blob.type) {
        return resource.blob.type;
    }

    // For scripts, default to text/javascript
    if (resource.as === "script") {
        return "text/javascript";
    }

    // For links, try to infer from URL extension
    if (resource.as === "link" && "url" in resource) {
        const url = resource.url.toLowerCase();
        if (url.endsWith(".css")) return "text/css";
        if ([".js", ".mjs", ".cjs"].some(ext => url.endsWith(ext))) return "text/javascript";
    }

    return undefined;
};

const applyAttributes = (element: HTMLElement, resource: IInjectable): void => {
    // Apply extra attributes, filtering out root-level properties
    if (resource.attributes) {
        Object.entries(resource.attributes).forEach(([key, value]) => {
            // Skip root-level properties to prevent conflicts
            if (key === "type" || key === "rel" || key === "href" || key === "src") {
                return;
            }

            if (value !== undefined && value !== null) {
                // Convert boolean attributes to proper HTML format
                if (typeof value === "boolean") {
                    if (value) {
                        element.setAttribute(key, "");
                    }
                } else {
                    element.setAttribute(key, value);
                }
            }
        });
    }
};

const scriptify = (doc: Document, resource: IInjectable, source: string): HTMLScriptElement => {
    const s = doc.createElement("script");
    s.dataset.readium = "true";

    // Set the injectable ID if provided
    if (resource.id) {
        s.id = resource.id;
    }

    // Apply root-level type if provided
    const finalType = resource.type || inferTypeFromResource(resource);
    if (finalType) {
        s.type = finalType;
    }

    // Apply extra attributes
    applyAttributes(s, resource);

    // Always set src from the processed URL
    s.src = source;

    return s;
};

const linkify = (doc: Document, resource: IInjectable, source: string): HTMLLinkElement => {
    const s = doc.createElement("link");
    s.dataset.readium = "true";

    // Set the injectable ID if provided
    if (resource.id) {
        s.id = resource.id;
    }

    // Apply root-level rel if provided
    if (resource.rel) {
        s.rel = resource.rel;
    }

    const finalType = resource.type || inferTypeFromResource(resource);
    if (finalType) {
        s.type = finalType;
    }

    // Apply extra attributes
    applyAttributes(s, resource);

    // Always set href from the processed URL
    s.href = source;

    return s;
};

export class Injector implements IInjector {
    private readonly blobStore: Map<string, { url: string; refCount: number }> = new Map();
    private readonly createdBlobUrls: Set<string> = new Set();
    private readonly rules: IInjectableRule[];
    private readonly allowedDomains: string[] = [];
    private injectableIdCounter = 0;

    constructor(config: IInjectablesConfig) {
        // Validate allowed domains - they should be proper URLs for external resources
        this.allowedDomains = (config.allowedDomains || []).map(domain => {
            try {
                new URL(domain);
                return domain;
            } catch {
                throw new Error(`Invalid allowed domain: "${domain}". Must be a valid URL (e.g., "https://fonts.googleapis.com").`);
            }
        });

        // Assign IDs to injectables that don't have them
        this.rules = config.rules.map(rule => {
            const processedRule: IInjectableRule = { ...rule };

            // Process prepend injectables (reverse to preserve order when prepending)
            if (rule.prepend) {
                processedRule.prepend = rule.prepend.map(injectable => ({
                    ...injectable,
                    id: injectable.id || `injectable-${this.injectableIdCounter++}`
                })).reverse(); // Reverse here so we can process normally later
            }

            // Process append injectables (keep original order)
            if (rule.append) {
                processedRule.append = rule.append.map(injectable => ({
                    ...injectable,
                    id: injectable.id || `injectable-${this.injectableIdCounter++}`
                }));
            }

            return processedRule;
        });
    }

    public dispose(): void {
        // Cleanup any created blob URLs
        for (const url of this.createdBlobUrls) {
            try {
                URL.revokeObjectURL(url);
            } catch (error) {
                console.warn("Failed to revoke blob URL:", url, error);
            }
        }
        this.createdBlobUrls.clear();
    }

    public getAllowedDomains(): string[] {
        return [...this.allowedDomains]; // Return a copy to prevent external modification
    }

    public async injectForDocument(doc: Document, link: Link): Promise<void> {
        for (const rule of this.rules) {
            if (this.matchesRule(rule, link)) {
                await this.applyRule(doc, rule);
            }
        }
    }

    private matchesRule(rule: IInjectableRule, link: Link): boolean {
        // Use the original href from the publication, not the resolved blob URL
        const originalHref = link.href;

        return rule.resources.some(pattern => {
            if (pattern instanceof RegExp) {
                return pattern.test(originalHref);
            }
            return originalHref === pattern;
        });
    }

    private async getOrCreateBlobUrl(resource: IInjectable): Promise<string> {
        // Use the injectable ID as the cache key
        const cacheKey = resource.id!; // ID is guaranteed to exist after constructor

        if (this.blobStore.has(cacheKey)) {
            const entry = this.blobStore.get(cacheKey)!;
            entry.refCount++;
            return entry.url;
        }

        if ("blob" in resource) {
            const url = URL.createObjectURL(resource.blob);
            this.blobStore.set(cacheKey, { url, refCount: 1 });
            this.createdBlobUrls.add(url);
            return url;
        }

        throw new Error("Resource must have a blob property");
    }

    public async releaseBlobUrl(url: string): Promise<void> {
        if (!this.createdBlobUrls.has(url)) return;

        const entry = Array.from(this.blobStore.values())
            .find(entry => entry.url === url);

        if (entry) {
            entry.refCount--;
            if (entry.refCount <= 0) {
                URL.revokeObjectURL(url);
                this.createdBlobUrls.delete(url);
                // Remove from blobStore
                for (const [key, value] of this.blobStore.entries()) {
                    if (value.url === url) {
                        this.blobStore.delete(key);
                        break;
                    }
                }
            }
        }
    }

    private async getResourceUrl(resource: IInjectable, doc: Document): Promise<string> {
        if ("url" in resource) {
            const resolvedUrl = new URL(resource.url, doc.baseURI).toString();
            if (!this.isValidUrl(resolvedUrl, doc)) {
                throw new Error(`Invalid URL: Only HTTPS, data:, blob:, or localhost HTTP URLs are allowed. Got: ${resource.url}`);
            }
            return resolvedUrl;
        } else {
            return this.getOrCreateBlobUrl(resource);
        }
    }

    private createPreloadLink(doc: Document, resource: IInjectable, url: string): void {
        if (resource.as !== "link" || resource.rel !== "preload") return;

        // Create a new resource object with preload attributes
        const preloadResource: IInjectable = {
            ...resource,
            rel: "preload",
            attributes: {
                ...resource.attributes,
                as: resource.as
            }
        };

        const preloadLink = linkify(doc, preloadResource, url);
        doc.head.appendChild(preloadLink);
    }

    private createElement(doc: Document, resource: IInjectable, source: string): HTMLElement {
        if (resource.as === "script") {
            return scriptify(doc, resource, source);
        }
        if (resource.as === "link") {
            return linkify(doc, resource, source);
        }
        throw new Error(`Unsupported element type: ${(resource as any).as}`);
    }

    private async applyRule(doc: Document, rule: IInjectableRule): Promise<void> {
        const createdElements: { element: HTMLElement; url: string }[] = [];

        // Collect all injectables that pass their conditions before modifying the document
        const prependInjectables = rule.prepend ? rule.prepend.filter(resource =>
            !resource.condition || resource.condition(doc)
        ) : [];

        const appendInjectables = rule.append ? rule.append.filter(resource =>
            !resource.condition || resource.condition(doc)
        ) : [];

        try {
            // Process prepend injectables first (already reversed in constructor)
            for (const resource of prependInjectables) {
                await this.processInjectable(resource, doc, createdElements, "prepend");
            }

            // Process append injectables next (in order)
            for (const resource of appendInjectables) {
                await this.processInjectable(resource, doc, createdElements, "append");
            }
        } catch (error) {
            // Clean up any created elements on error
            for (const { element, url } of createdElements) {
                try {
                    element.remove();
                    await this.releaseBlobUrl(url);
                } catch (cleanupError) {
                    console.error("Error during cleanup:", cleanupError);
                }
            }
            throw error;
        }
    }

    private async processInjectable(
        resource: IInjectable,
        doc: Document,
        createdElements: { element: HTMLElement; url: string }[],
        position: "prepend" | "append"
    ): Promise<void> {
        const target = resource.target === "body" ? doc.body : doc.head;
        if (!target) return;

        let url: string | null = null;
        try {
            url = await this.getResourceUrl(resource, doc);

            if (resource.rel === "preload" && "url" in resource) {
                this.createPreloadLink(doc, resource, url);
            } else {
                const element = this.createElement(doc, resource, url);
                createdElements.push({ element, url });

                if (position === "prepend") {
                    target.prepend(element);
                } else {
                    target.append(element);
                }
            }
        } catch (error) {
            console.error("Failed to process resource:", error);
            if (url && "blob" in resource) {
                await this.releaseBlobUrl(url);
            }
            throw error;
        }
    }

    private isValidUrl(url: string, doc: Document): boolean {
        try {
            const parsed = new URL(url, doc.baseURI);

            // Allow data URLs
            if (parsed.protocol === "data:") return true;

            // Allow blob URLs that we created
            if (parsed.protocol === "blob:" && this.createdBlobUrls.has(url)) {
                return true;
            }

            // Check against allowed domains if any are specified
            if (this.allowedDomains.length > 0) {
                const origin = parsed.origin;
                return this.allowedDomains.some(allowed => {
                    const allowedOrigin = new URL(allowed).origin;
                    return origin === allowedOrigin;
                });
            }

            // No allowed domains specified - deny external URLs
            return false;
        } catch {
            return false;
        }
    }
}
