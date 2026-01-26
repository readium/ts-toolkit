import { IInjectableRule, IInjectable, IInjector, IInjectablesConfig, IUrlInjectable, IBlobInjectable } from "./Injectable";
import { Link } from "@readium/shared";

const inferTypeFromResource = (resource: IUrlInjectable | IBlobInjectable): string | undefined => {
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

const scriptify = (doc: Document, resource: IUrlInjectable | IBlobInjectable, source: string): HTMLScriptElement => {
    const s = doc.createElement("script");
    s.dataset.readium = "true";
    
    // Create attributes object, explicitly excluding href and src
    const { href, src, type, ...safeAttributes } = resource.attributes || {};
    
    // Use provided type or infer it
    const finalType = type || inferTypeFromResource(resource);
    
    // Apply all safe attributes
    Object.entries(safeAttributes).forEach(([key, value]) => {
        if (value !== undefined) {
            s.setAttribute(key, value);
        }
    });
    
    // Set type if we have it
    if (finalType) {
        s.type = finalType;
    }
    
    // Always set src from the processed URL
    s.src = source;
    
    return s;
};

const linkify = (doc: Document, resource: IUrlInjectable | IBlobInjectable, source: string): HTMLLinkElement => {
    const s = doc.createElement("link");
    s.dataset.readium = "true";
    
    // Create attributes object, explicitly excluding href and src
    const { href, src, type, ...safeAttributes } = resource.attributes || {};
    
    // Use provided type or infer it
    const finalType = type || inferTypeFromResource(resource);
    
    // Apply all safe attributes
    Object.entries(safeAttributes).forEach(([key, value]) => {
        if (value !== undefined) {
            s.setAttribute(key, value);
        }
    });
    
    // Set type if we have it
    if (finalType) {
        s.type = finalType;
    }
    
    // Always set href from the processed URL
    s.href = source;
    
    return s;
};

export class Injector implements IInjector {
    private readonly blobStore: Map<string, { url: string; refCount: number }> = new Map();
    private readonly createdBlobUrls: Set<string> = new Set();
    private readonly rules: IInjectableRule[];
    private readonly allowedDomains: string[] = [];

    // Store the first chunk of each blob (16 bytes) for content-based identification
    private blobContentCache = new Map<string, string>();
    private blobCounter = 0;
    
    constructor(config: IInjectablesConfig) {
        this.rules = config.rules;
        this.allowedDomains = config.allowedDomains || [];
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

    private async getBlobKey(blob: Blob): Promise<string> {
        // For small blobs, we can use the entire content as a key
        if (blob.size <= 64) {
            const content = await blob.text();
            return `blob-${content.length}-${content}`;
        }

        // For larger blobs, use the first and last 32 bytes as a fingerprint
        const firstChunk = await blob.slice(0, 32).text();
        const lastChunk = blob.size > 32 ? await blob.slice(-32).text() : "";
        const contentKey = `${blob.size}-${firstChunk}-${lastChunk}`;
        
        // Check if we've seen this content before
        if (this.blobContentCache.has(contentKey)) {
            return this.blobContentCache.get(contentKey)!;
        }
        
        // If not, generate a new key and store it
        const key = `blob-${this.blobCounter++}`;
        this.blobContentCache.set(contentKey, key);
        return key;
    }

    private async getOrCreateBlobUrl(blob: Blob): Promise<string> {
        const key = await this.getBlobKey(blob);
        
        if (this.blobStore.has(key)) {
            const entry = this.blobStore.get(key)!;
            entry.refCount++;
            return entry.url;
        }

        const url = URL.createObjectURL(blob);
        this.blobStore.set(key, { url, refCount: 1 });
        this.createdBlobUrls.add(url);
        return url;
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
            return this.getOrCreateBlobUrl(resource.blob);
        }
    }

    private createPreloadLink(doc: Document, resource: IUrlInjectable, url: string): void {
        if (!resource.attributes?.rel?.includes("preload")) return;
        
        // Create a new resource object with preload attributes
        const preloadResource: IUrlInjectable = {
            ...resource,
            attributes: {
                ...resource.attributes,
                rel: "preload",
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
        throw new Error(`Unsupported element type: ${resource.as}`);
    }

    private async applyRule(doc: Document, rule: IInjectableRule): Promise<void> {
        const createdElements: { element: HTMLElement; url: string }[] = [];
        
        try {
            for (const resource of rule.injectables) {
                const target = resource.target === "head" ? doc.head : doc.body;
                if (!target) continue;

                let url: string | null = null;
                try {
                    url = await this.getResourceUrl(resource, doc);
                    
                    if (resource.attributes?.rel === "preload" && "url" in resource) {
                        this.createPreloadLink(doc, resource, url);
                    } else {
                        const element = this.createElement(doc, resource, url);
                        createdElements.push({ element, url });
                        
                        if (resource.insert === "prepend") {
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
                const domain = parsed.hostname;
                return this.allowedDomains.some(allowed => 
                    domain === allowed || 
                    (allowed.startsWith(".") && domain.endsWith(allowed))
                );
            }

            // Default to allowing https URLs if no allowed domains are specified
            if (parsed.protocol === "https:") return true;
            
            return false;
        } catch {
            return false;
        }
    }
}
