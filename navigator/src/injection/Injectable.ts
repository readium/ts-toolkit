import { Link } from "@readium/shared";

type ForbiddenAttributes = "type" | "rel" | "href" | "src";
type AllowedAttributes = {
    [K in string]: K extends ForbiddenAttributes 
        ? never 
        : (string | boolean | undefined);
} & {
    [K in ForbiddenAttributes]?: never;
};

export interface IBaseInjectable {
    id?: string;
    as: "script" | "link";
    target?: "head" | "body";
    type?: string;
    rel?: string;
    condition?: (doc: Document) => boolean;
        
    // Extra attributes - type and rel are forbidden here since they are at root
    attributes?: AllowedAttributes;
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
     * Resources to inject at the beginning of the target (in array order)
     */
    prepend?: IInjectable[];
    
    /**
     * Resources to inject at the end of the target (in array order)
     */
    append?: IInjectable[];
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
