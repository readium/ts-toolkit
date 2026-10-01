import {
  arrayfromJSONorString,
  setToArray,
} from '../util/JSONParse.ts';

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
    /** Non-empty sequence of objects meant to be presented sequentially to the user. */
    public readonly guided: GuidedNavigationObject[];

    constructor(values: {
        guided: GuidedNavigationObject[];
    }) {
        this.guided = values.guided;
    }

    /**
     * Deserializes a GuidedNavigationDocument from JSON.
     * Returns undefined if `guided` is missing or has no valid object.
     */
    public static deserialize(json: any): GuidedNavigationDocument | undefined {
        if (!json) return;
        const guided = GuidedNavigationObject.deserializeArray(json.guided);
        if (!guided || guided.length === 0) return;
        return new GuidedNavigationDocument({ guided });
    }

    public serialize(): any {
        return { guided: this.guided.map(x => x.serialize()) };
    }
}

/**
 * Represents a text value containing plain text, SSML, and language information.
 * https://readium.org/guided-navigation/schema/text.schema.json
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
            return json.length > 0 ? new GuidedNavigationText({ plain: json }) : undefined;
        }

        // The schema requires a non-empty `plain` or `ssml`
        if (json.plain || json.ssml) {
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
 * Text, audio, image or video description of a Guided Navigation Object.
 * https://readium.org/guided-navigation/schema/description.schema.json
 */
export class GuidedNavigationDescription {
    /** References an audio resource or a fragment of it. */
    public readonly audioref?: string;

    /** References an image or a fragment of it. */
    public readonly imgref?: string;

    /** References a textual resource or a fragment of it. */
    public readonly textref?: string;

    /** References a video resource or a fragment of it. */
    public readonly videoref?: string;

    /** Textual description. */
    public readonly text?: GuidedNavigationText;

    constructor(values: {
        audioref?: string;
        imgref?: string;
        textref?: string;
        videoref?: string;
        text?: GuidedNavigationText;
    }) {
        this.audioref = values.audioref;
        this.imgref = values.imgref;
        this.textref = values.textref;
        this.videoref = values.videoref;
        this.text = values.text;
    }

    /**
     * Deserializes a GuidedNavigationDescription from JSON.
     * Returns undefined if it has none of the refs nor text.
     */
    public static deserialize(json: any): GuidedNavigationDescription | undefined {
        if (!json) return undefined;
        const description = new GuidedNavigationDescription({
            audioref: json.audioref,
            imgref: json.imgref,
            textref: json.textref,
            videoref: json.videoref,
            text: GuidedNavigationText.deserialize(json.text)
        });
        if (
            description.audioref === undefined &&
            description.imgref === undefined &&
            description.textref === undefined &&
            description.videoref === undefined &&
            description.text === undefined
        ) return undefined;
        return description;
    }

    public serialize(): any {
        const json: any = {};
        if (this.audioref !== undefined) json.audioref = this.audioref;
        if (this.imgref !== undefined) json.imgref = this.imgref;
        if (this.textref !== undefined) json.textref = this.textref;
        if (this.videoref !== undefined) json.videoref = this.videoref;
        const text = this.text?.serialize();
        if (text !== undefined) json.text = text;
        return json;
    }
}

/**
 * Guided Navigation Object
 * https://readium.org/guided-navigation/schema/document.schema.json
 */
export class GuidedNavigationObject {
  /** Identifier of the object. */
  public readonly id?: string;

  /** References an audio resource or a fragment of it. */
  public readonly audioref?: string;

  /** Items that are children of the containing Guided Navigation Object. */
  public readonly children?: GuidedNavigationObject[];

  /** References an image or a fragment of it. */
  public readonly imgref?: string;

  /** Convey the structural semantics of a publication. */
  public readonly role?: Set<string>;

  /**
   * Textual equivalent of the resources or fragment of the resources referenced by the current Guided Navigation Object.
   */
  public readonly text?: GuidedNavigationText;

  /** References a textual resource or a fragment of it. */
  public readonly textref?: string;

  /** References a video resource or a fragment of it. */
  public readonly videoref?: string;

  /** Text, audio, image or video description of the current Guided Navigation Object. */
  public readonly description?: GuidedNavigationDescription;

    /**
     * Creates a [GuidedNavigation] object.
    */
    constructor(values: {
        id?: string;
        audioref?: string;
        children?: GuidedNavigationObject[];
        imgref?: string;
        role?: Set<string>;
        text?: GuidedNavigationText;
        textref?: string;
        videoref?: string;
        description?: GuidedNavigationDescription;
    }) {
        this.id = values.id;
        this.audioref = values.audioref;
        this.children = values.children;
        this.imgref = values.imgref;
        this.role = values.role;
        this.text = values.text;
        this.textref = values.textref;
        this.videoref = values.videoref;
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
     * Deserializes a GuidedNavigationObject from JSON.
     * Returns undefined if it has none of the refs, text, nor children.
     */
    public static deserialize(json: any): GuidedNavigationObject | undefined {
        if (!json) return undefined;

        const children = GuidedNavigationObject.deserializeArray(json.children);
        const obj = new GuidedNavigationObject({
            id: typeof json.id === 'string' ? json.id : undefined,
            audioref: json.audioref,
            children: children && children.length > 0 ? children : undefined,
            imgref: json.imgref,
            role: json.role
                ? new Set<string>(arrayfromJSONorString(json.role))
                : undefined,
            text: GuidedNavigationText.deserialize(json.text),
            textref: json.textref,
            videoref: json.videoref,
            description: GuidedNavigationDescription.deserialize(json.description)
        });
        if (
            obj.audioref === undefined &&
            obj.imgref === undefined &&
            obj.textref === undefined &&
            obj.videoref === undefined &&
            obj.text === undefined &&
            obj.children === undefined
        ) return undefined;
        return obj;
    }

    /**
     * Parses a [GuidedNavigationObject] array from its RWPM JSON representation.
     */
    public static deserializeArray(json: any): GuidedNavigationObject[] | undefined {
        if (!(Array.isArray(json))) return undefined;
        return json
            .map((item) => GuidedNavigationObject.deserialize(item))
            .filter((x): x is GuidedNavigationObject => x !== undefined);
    }

    /**
     * Serializes a [GuidedNavigationObject] to its RWPM JSON representation.
     */
    public serialize(): any {
        const json: any = {};
        if (this.id !== undefined) json.id = this.id;
        if (this.audioref !== undefined) json.audioref = this.audioref;
        if (this.children !== undefined) json.children = this.children.map(x => x.serialize());
        if (this.imgref !== undefined) json.imgref = this.imgref;
        if (this.role !== undefined) json.role = setToArray(this.role);
        if (this.text !== undefined) {
            const serializedText = this.text.serialize();
            if (serializedText !== undefined) {
                json.text = serializedText;
            }
        }
        if (this.textref !== undefined) json.textref = this.textref;
        if (this.videoref !== undefined) json.videoref = this.videoref;
        if (this.description !== undefined) json.description = this.description.serialize();
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
