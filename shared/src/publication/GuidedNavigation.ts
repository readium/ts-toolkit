import {
  arrayfromJSONorString,
  setToArray,
} from '../util/JSONParse';
import { Links } from "./Link";

export interface Clip {
    audioResource: string;
    fragmentId?: string;
    start?: number;
    end?: number;
}

/**
 * Guided Navigation Document
 * https://readium.org/guided-navigation/schema/document.schema.json
 */
export class GuidedNavigationDocument {
    public readonly links?: Links;
    public readonly guided?: GuidedNavigationObject[];

    constructor(values: {
        links?: Links;
        guided?: GuidedNavigationObject[];
    }) {
        this.links = values.links;
        this.guided = values.guided;
    }

    public static deserialize(json: any): GuidedNavigationDocument | undefined {
        if (!json) return;
        return new GuidedNavigationDocument({
            links: Links.deserialize(json.links),
            guided: GuidedNavigationObject.deserializeArray(json.guided),
        });
    }

    public serialize(): any {
        const json: any = {};
        if (this.links !== undefined) json.links = this.links.serialize();
        if (this.guided !== undefined) json.guided = this.guided.map(x => x.serialize());
        return json;
    }
}

/**
 * Represents a text value containing plain text, SSML, and language information.
 */
export class GuidedNavigationText {
    /** Plain text content */
    public readonly plain?: string;
    
    /** SSML (Speech Synthesis Markup Language) content */
    public readonly ssml?: string;
    
    /** 
     * BCP 47 language tag
     * @pattern ^((?<grandfathered>(en-GB-oed|i-ami|i-bnn|i-default|i-enochian|i-hak|i-klingon|i-lux|i-mingo|i-navajo|i-pwn|i-tao|i-tay|i-tsu|sgn-BE-FR|sgn-BE-NL|sgn-CH-DE)|(art-lojban|cel-gaulish|no-bok|no-nyn|zh-guoyu|zh-hakka|zh-min|zh-min-nan|zh-xiang))|((?<language>([A-Za-z]{2,3}(-(?<extlang>[A-Za-z]{3}(-[A-Za-z]{3}){0,2}))?)|[A-Za-z]{4}|[A-Za-z]{5,8})(-(?<script>[A-Za-z]{4}))?(-(?<region>[A-Za-z]{2}|[0-9]{3}))?(-(?<variant>[A-Za-z0-9]{5,8}|[0-9][A-Za-z0-9]{3}))*(-(?<extension>[0-9A-WY-Za-wy-z](-[A-Za-z0-9]{2,8})+))*(-(?<privateUse>x(-[A-Za-z0-9]{1,8})+))?)|(?<privateUse2>x(-[A-Za-z0-9]{1,8})+))$
     */
    public readonly language?: string;

    constructor(values: {
        plain?: string;
        ssml?: string;
        language?: string;
    }) {
        this.plain = values.plain;
        this.ssml = values.ssml;
        this.language = values.language;
    }

    /**
     * Deserializes a GuidedNavigationText from JSON
     */
    public static deserialize(json: any): GuidedNavigationText | undefined {
        if (json === undefined || json === null) return undefined;
        
        if (typeof json === 'string') {
            return new GuidedNavigationText({ plain: json });
        }
        
        // Only create if there are actual values
        if (json.plain || json.ssml || json.language) {
            return new GuidedNavigationText({
                plain: json.plain,
                ssml: json.ssml,
                language: json.language
            });
        }
        
        return undefined;
    }

    /**
     * Serializes the text to a plain object
     */
    public serialize(): any {
        const result: any = {};
        if (this.plain !== undefined) result.plain = this.plain;
        if (this.ssml !== undefined) result.ssml = this.ssml;
        if (this.language !== undefined) result.language = this.language;
        return Object.keys(result).length > 0 ? result : undefined;
    }
}

/**
 * Guided Navigation Object
 * https://github.com/readium/guided-navigation/blob/main/schema/object.schema.json
 */

export class GuidedNavigationObject {
  /** References an audio resource or a fragment of it. */
  public readonly audioref?: string;
    
  /** Items that are children of the containing Guided Navigation Object. */
  public readonly children?: GuidedNavigationObject[];
  
  /** References an image or a fragment of it. */
  public readonly imgref?: string;
  
  /** Convey the structural semantics of a publication. */
  public readonly role?: Set<string>;
  
  /** 
   * Indicates the heading level (1-6) for the navigation object.
   * @minimum 1
   * @maximum 6
   */
  public readonly level?: number;
  
  /** 
   * Textual equivalent of the resources or fragment of the resources referenced by the current Guided Navigation Object.
   */
  public readonly text?: GuidedNavigationText;
  
  /** References a textual resource or a fragment of it. */
  public readonly textref?: string;

  /** 
   * Describes the image referenced by the current Guided Navigation Object.
   * This is a GuidedNavigationObject that should not contain 'level' or 'children' properties.
   */
  public readonly description?: Omit<GuidedNavigationObject, 'level' | 'children'>;

    /**
     * Creates a [GuidedNavigation] object.
    */
    constructor(values: {
        audioref?: string;
        children?: GuidedNavigationObject[];
        imgref?: string;
        role?: Set<string>;
        level?: number;
        text?: GuidedNavigationText;
        textref?: string;
        description?: Omit<GuidedNavigationObject, 'level' | 'children'>;
    }) {
        this.audioref = values.audioref;
        this.children = values.children;
        this.imgref = values.imgref;
        this.role = values.role;
        this.level = values.level !== undefined ? Math.min(6, Math.max(1, values.level)) : undefined;
        this.text = values.text;
        this.textref = values.textref;
        this.description = values.description;
    }

    /**
     * Gets the plain text content.
     * Returns undefined if no text is available.
     */
    public get plainText(): string | undefined {
        return this.text?.plain;
    }

    /**
     * Gets the SSML content if available.
     */
    public get ssmlText(): string | undefined {
        return this.text?.ssml;
    }

    /**
     * Gets the language of the text if available.
     */
    public get textLanguage(): string | undefined {
        return this.text?.language;
    }

    /**
     * Deserializes a GuidedNavigationObject from JSON
     */
    public static deserialize(json: any): GuidedNavigationObject | undefined {
        if (!json) return undefined;
        
        return new GuidedNavigationObject({
            audioref: json.audioref,
            children: GuidedNavigationObject.deserializeArray(json.children),
            imgref: json.imgref,
            role: json.role
                ? new Set<string>(arrayfromJSONorString(json.role))
                : undefined,
            level: typeof json.level === 'number' ? json.level : undefined,
            text: GuidedNavigationText.deserialize(json.text),
            textref: json.textref,
            description: GuidedNavigationObject.deserialize(json.description)
        });
    }

    /** 
     * Parses a [GuidedNavigationObject] array from its RWPM JSON representation.
     */
    public static deserializeArray(json: any): GuidedNavigationObject[] | undefined {
        if (!(Array.isArray(json))) return undefined;
        return json
            .map<GuidedNavigationObject>((item) => GuidedNavigationObject.deserialize(item) as GuidedNavigationObject)
            .filter((x) => x !== undefined);
    }

    /**
     * Serializes a [GuidedNavigationObject] to its RWPM JSON representation.
     */
    public serialize(): any {
        const json: any = {};
        if (this.audioref !== undefined) json.audioref = this.audioref;
        if (this.children !== undefined) json.children = this.children.map(x => x.serialize());
        if (this.imgref !== undefined) json.imgref = this.imgref;
        if (this.role !== undefined) json.role = setToArray(this.role);
        if (this.level !== undefined) json.level = this.level;
        if (this.text !== undefined) {
            const serializedText = this.text.serialize();
            if (serializedText !== undefined) {
                json.text = serializedText;
            }
        }
        if (this.textref !== undefined) json.textref = this.textref;
        if (this.description) {
            json.description = this.description.serialize();
        }
        return json;
    }

    public get audioFile(): string | undefined {
        return this.audioref?.split('#')[0];
    }

    public get audioTime(): string | undefined {
        if(this.audioref?.includes('#')) {
            return this.audioref.split('#', 2)[1];
        }
        return undefined;
    }

    public get textFile(): string | undefined {
        return this.textref?.split('#')[0];
    }

    public get fragmentId(): string | undefined {
        if(this.textref?.includes('#')) {
            return this.textref.split('#', 2)[1];
        }
        return undefined;
    }

    public get clip(): Clip | undefined {
        const audio = this.audioFile;
        if(!audio) return undefined;
        const time = this.audioTime;
        const result = {
            audioResource: audio,
            fragmentId: this.fragmentId,
        } as Clip;
        if(!time) return result;
        const times = this.parseTimer(time);
        result.start = times[0];
        result.end = times[1];
        return result;
    }

    private parseTimer(times: string): [number?, number?] {
        if(!times || !times.startsWith("t=")) return [undefined, undefined];
        const ts = times.substring(2).split(',').map(t => parseFloat(t));
        if(ts.length === 1) return [isNaN(ts[0]) ? undefined : ts[0], undefined];
        if(ts.length > 2) return [undefined, undefined];
        return [isNaN(ts[0]) ? undefined : ts[0], isNaN(ts[1]) ? undefined : ts[1]];
    }
}
