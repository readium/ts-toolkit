import { Language } from "../../../../util/Language";

export class Attribute<V> {
    constructor(
        public key: AttributeKeys | string,
        public value: V
    ) { }
}

export enum AttributeKeys {
    ACCESSIBILITY_LABEL = "accessibilityLabel",
    LANGUAGE = "language",
}

export abstract class AttributesHolder {
    constructor(
        /**
         * Associated list of attributes.
         */
        readonly _attributes: Attribute<any>[] = []
    ) {}

    get language(): Language | undefined {
        return this.attribute(AttributeKeys.LANGUAGE);
    }

    get accessibilityLabel(): string | undefined {
        return this.attribute(AttributeKeys.ACCESSIBILITY_LABEL);
    }

    /**
     * Gets the first attribute with the given [key].
     */
    attribute<V>(key: AttributeKeys | string): V | undefined {
        return this._attributes.find(attribute => attribute.key === key)?.value;
    }

    /**
     * Gets all the attributes with the given [key].
     */
    attributes<V>(key: AttributeKeys | string): V[] {
        return this._attributes.filter(attribute => attribute.key === key).map(attribute => attribute.value);
    }
}