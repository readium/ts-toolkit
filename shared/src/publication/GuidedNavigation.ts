import {
  arrayfromJSONorString,
  setToArray,
} from '../util/JSONParse';

/**
 * Guided Navigation Object for the Readium Web Publication Manifest.
 * https://github.com/readium/guided-navigation/blob/main/schema/object.schema.json
 */

export class GuidedNavigation {
  /** References an audio resource or a fragment of it. */
  public readonly audioref?: string;
    
  /** Items that are children of the containing Guided Navigation Object. */
  public readonly children?: GuidedNavigation[];
  
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
        children?: GuidedNavigation[];
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
     * Parses a [GuidedNavigation] from its RWPM JSON representation.
     *
     * A GuidedNavigation object can be parsed from a single string, or a full-fledged object.
    */
    public static deserialize(json: any): GuidedNavigation | undefined {
        if (!json) return;
        return new GuidedNavigation({
            audioref: json.audioref,
            children: GuidedNavigation.deserializeArray(json.children),
            imgref: json.imgref,
            role: json.role
            ? new Set<string>(arrayfromJSONorString(json.role))
            : undefined,
            text: json.text,
            textref: json.textref,
        });
    }

    /**
     * Serializes a [GuidedNavigation] to its RWPM JSON representation.
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
}
