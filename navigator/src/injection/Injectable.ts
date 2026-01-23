import { Link } from "@readium/shared";

export interface IBaseInjectable {
    type: "script" | "link";
    target: "head" | "body";
    insertion: "prepend" | "append";
    attributes?: {
        [key: string]: string | undefined;
        type?: string;
        rel?: string;
        href?: string;
        src?: string;
        crossorigin?: string;
    };
}

export interface IUrlInjectable extends IBaseInjectable {
    url: string;  // Must be absolute HTTPS URL
}

export interface IBlobInjectable extends IBaseInjectable {
    blob: Blob;   // Raw Blob object
}

export type IInjectable = IUrlInjectable | IBlobInjectable;

/**
 * Defines a rule for resource injection, specifying which resources to inject into which documents.
 */
export interface IInjectableRule {
    /**
     * List of resource URLs or patterns that this rule applies to.
     * Can be exact URLs or patterns with wildcards.
     */
    resources: Array<string | RegExp>;
    
    /**
     * Resources to inject into matching documents.
     */
    injectables: IInjectable[];
}

export interface IInjectablesConfig {
    rules: IInjectableRule[];
    allowedDomains?: string[];
}

export interface IInjector {
    /**
     * Injects resources into a document based on matching rules
     * @param doc The document to inject resources into
     * @param link The link being loaded, used to match against injection rules
     */
    injectForDocument(doc: Document, link: Link): Promise<void>;
    
    /**
     * Cleans up any resources used by the injector
     */
    dispose(): void;

    /**
     * Get the list of allowed domains
     */
    getAllowedDomains(): string[]
}
