import { positiveNumberfromJSON } from '../../util/JSONParse';

/**
 * A serializable representation of a boundary point in a DOM Range.
 *
 * The [cssSelector] field always references a DOM element. If the original DOM Range
 * start/endContainer property references a DOM text node, the [textNodeIndex] field is used to
 * complement the CSS Selector; thereby providing a pointer to a child DOM text node; and
 * [charOffset] is used to tell a position within the character data of that DOM text node
 * (just as the DOM Range start/endOffset does). If the original DOM Range start/endContainer
 * property references a DOM Element, then the [textNodeIndex] field is used to designate the
 * child Text node (just as the DOM Range start/endOffset does), and the optional [charOffset]
 * field is not used (as there is no explicit position within the character data of the text
 * node).
 *
 * https://github.com/readium/architecture/blob/master/models/locators/extensions/html.md#the-start-and-end-object
 */
export class DomRangePoint {
  public cssSelector: string;
  public textNodeIndex: number;
  public charOffset?: number;

  /**
   * Creates a [DomRange].
   */
  constructor(values: {
    cssSelector: string;
    textNodeIndex: number;
    charOffset?: number;
  }) {
    this.cssSelector = values.cssSelector;
    this.textNodeIndex = values.textNodeIndex;
    this.charOffset = values.charOffset;
  }

  /**
   * Parses a [DomRangePoint] from its RWPM JSON representation.
   */
  public static deserialize(json: any): DomRangePoint | undefined {
    if (!(json && json.cssSelector)) return;
    let textNodeIndex = positiveNumberfromJSON(json.textNodeIndex);
    if (textNodeIndex === undefined) return;
    let charOffset = positiveNumberfromJSON(json.charOffset);
    if (charOffset === undefined)
      charOffset = positiveNumberfromJSON(json.offset);
    return new DomRangePoint({
      cssSelector: json.cssSelector,
      textNodeIndex,
      charOffset,
    });
  }

  /**
   * Serializes a [DomRangePoint] to its RWPM JSON representation.
   */
  public serialize(): any {
    const json: any = {
      cssSelector: this.cssSelector,
      textNodeIndex: this.textNodeIndex,
    };
    if (this.charOffset !== undefined) json.charOffset = this.charOffset;
    return json;
  }
}
