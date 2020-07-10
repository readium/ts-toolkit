/* Copyright 2020 Readium Foundation. All rights reserved.
 * Use of this source code is governed by a BSD-style license,
 * available in the LICENSE file present in the Github repository of the project.
 */

import { IContributor} from "./Contributor";
import { ILocalizedString } from "./LocalizedString";
import { JSONDictionary } from "./Publication+JSON";
import { ReadingProgression } from "./ReadingProgression";
import { Subject } from "./Subject";

type Collection = IContributor;

/** https://readium.org/webpub-manifest/schema/metadata.schema.json */
export interface IMetadata {
  title: string | ILocalizedString;
  "@type"?: string;
  identifier?: string;
  subtitle?: string | ILocalizedString;
  artist?: Array<IContributor>;
  author?: Array<IContributor>;
  colorist?: Array<IContributor>;
  contributor?: Array<IContributor>;
  editor?: Array<IContributor>;
  illustrator?: Array<IContributor>;
  inker?: Array<IContributor>;
  letterer?: Array<IContributor>;
  narrator?: Array<IContributor>;
  penciler?: Array<IContributor>;
  translator?: Array<IContributor>;
  language?: Array<string>;
  description?: string;
  publisher?: Array<IContributor>;
  imprint?: Array<IContributor>;
  published?: string | Date;
  modified?: string | Date;
  subject?: Array<Subject>;
  belongsTo?: Array<string>;
  readingProgression?: ReadingProgression;
  duration?: number;
  numberOfPages?: number;
}

export class Metadata implements IMetadata {
  public title: string | ILocalizedString;
  public "@type"?: string;
  public identifier?: string;
  public subtitle?: string | ILocalizedString;
  public artist: Array<IContributor>;
  public author: Array<IContributor>;
  public colorist: Array<IContributor>;
  public contributor: Array<IContributor>;
  public editor: Array<IContributor>;
  public illustrator: Array<IContributor>;
  public inker: Array<IContributor>;
  public letterer: Array<IContributor>;
  public narrator: Array<IContributor>;
  public penciler: Array<IContributor>;
  public translator: Array<IContributor>;
  public languages: Array<string>;
  public description?: string;
  public publisher: Array<IContributor>;
  public imprint: Array<IContributor>;
  public published: Date | null;
  public modified: Date | null;
  public subject: Array<Subject>;
  public belongsToCollection?: Array<Collection>;
  public belongsToSeries?: Array<Collection>;

  /** This contains the reading progression as declared in the manifest, so it might be 
   *  `auto`. To know the effective reading progression used to lay out the content, use
   *  `effectiveReadingProgression` instead.
  */
  public readingProgression: ReadingProgression;
  public duration: number | null;
  public numberOfPages: number | null;
  public otherMetadata: JSONDictionary;

  /* public otherMetadata */

  private static readonly RTLLanguages = ["ar", "fa", "he", "zh-Hant", "zh-TW"];

  constructor(metadata: IMetadata) {
    const json = new JSONDictionary(metadata);

    this.title = json.parseRaw("title");
    this["@type"] = json.parseRaw("@type");
    this.identifier = json.parseRaw("identifier");
    this.subtitle = json.parseRaw("subtitle");
    this.artist = json.parseArray("artist");
    this.author = json.parseArray("author");
    this.colorist = json.parseArray("colorist");
    this.contributor = json.parseArray("contributor");
    this.editor = json.parseArray("editor");
    this.illustrator = json.parseArray("illustrator");
    this.inker = json.parseArray("inker");
    this.letterer = json.parseArray("letterer");
    this.narrator = json.parseArray("narrator");
    this.penciler = json.parseArray("penciler");
    this.translator = json.parseArray("translator");
    this.languages = json.parseArray("language");
    this.description = json.parseRaw("description");
    this.publisher = json.parseArray("publisher");
    this.imprint = json.parseArray("imprint");
    this.published = json.parseDate("published");
    this.modified = json.parseDate("modified");
    this.subject = json.parseArray("subject");
    const belongsTo = json.parseRaw("belongsTo");
    this.belongsToCollection = belongsTo ? belongsTo["collection"] : [];
    this.belongsToSeries = belongsTo ? belongsTo["series"] : [];
    this.readingProgression = json.parseRaw("readingProgression") || ReadingProgression.auto;
    this.duration = json.parsePositive("duration");
    this.numberOfPages = json.parsePositive("numberOfPages");
    this.otherMetadata = json;
  }

  /** Computes a `ReadingProgression` when the value of `readingProgression` is set to `auto`,
   *  using the publication language.
   */
  public effectiveReadingProgression(): ReadingProgression {
    if (this.readingProgression && this.readingProgression !== ReadingProgression.auto) {
      return this.readingProgression;
    } 
    
    if (this.languages.length > 0) {
      const primaryLang = this.languages[0];
      const lang = (primaryLang.includes("zh") ? primaryLang : primaryLang.split("-")[0]);
      if (Metadata.RTLLanguages.includes(lang)) {
        return ReadingProgression.rtl;
      }
    }

    return ReadingProgression.ltr;
  }
}