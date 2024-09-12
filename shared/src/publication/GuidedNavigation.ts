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
  
  /** Textual equivalent of the resources or fragment of the resources referenced by the current Guided Navigation Object. */
  public readonly text?: string;
  
  /** References a textual resource or a fragment of it. */
  public readonly textref?: string;

    /**
     * Creates a [GuidedNavigation] object.
    */
    constructor(values: {
        audioref?: string;
        children?: GuidedNavigationObject[];
        imgref?: string;
        role?: Set<string>;
        text?: string;
        textref?: string;
    }) {
        this.audioref = values.audioref;
        this.children = values.children;
        this.imgref = values.imgref;
        this.role = values.role;
        this.text = values.text;
        this.textref = values.textref;
    }

    /**
     * Parses a [GuidedNavigationObject] from its RWPM JSON representation.
     *
     * A GuidedNavigationObject can be parsed from a single string, or a full-fledged object.
    */
    public static deserialize(json: any): GuidedNavigationObject | undefined {
        if (!json) return;
        return new GuidedNavigationObject({
            audioref: json.audioref,
            children: GuidedNavigationObject.deserializeArray(json.children),
            imgref: json.imgref,
            role: json.role
            ? new Set<string>(arrayfromJSONorString(json.role))
            : undefined,
            text: json.text,
            textref: json.textref,
        });
    }

    /** 
     * Parses a [GuidedNavigationObject] array from its RWPM JSON representation.
    */
    public static deserializeArray(json: any): GuidedNavigationObject[] | undefined {
        if (!(json instanceof Array)) return;
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
        if (this.text !== undefined) json.text = this.text;
        if (this.textref !== undefined) json.textref = this.textref;
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
