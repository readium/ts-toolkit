/* Copyright 2020 Readium Foundation. All rights reserved.
 * Use of this source code is governed by a BSD-style license,
 * available in the LICENSE file present in the Github repository of the project.
 */

import { arrayfromJSON, datefromJSON, positiveNumberfromJSON } from '../util/JSONParse';
import { BelongsTo } from './BelongsTo';
import { Contributors } from './Contributor';
import { LocalizedString } from './LocalizedString';
import { Presentation } from './presentation/Presentation';
import { ReadingProgression } from './ReadingProgression';
import { Subjects } from './Subject';

// type Collection = Contributor;
// type Collections = Contributors;

/** https://readium.org/webpub-manifest/schema/metadata.schema.json */
// export interface IMetadata {
//   title: LocalizedString;
//   typeUri?: string;
//   identifier?: string;
//   subtitle?: ILocalizedString;
//   artist?: Array<IContributor>;
//   author?: Array<IContributor>;
//   colorist?: Array<IContributor>;
//   contributor?: Array<IContributor>;
//   editor?: Array<IContributor>;
//   illustrator?: Array<IContributor>;
//   inker?: Array<IContributor>;
//   letterer?: Array<IContributor>;
//   narrator?: Array<IContributor>;
//   penciler?: Array<IContributor>;
//   translator?: Array<IContributor>;
//   language?: Array<string>;
//   description?: string;
//   publisher?: Array<IContributor>;
//   imprint?: Array<IContributor>;
//   published?: string | Date;
//   modified?: string | Date;
//   subject?: Array<Subject>;
//   belongsTo?: Array<string>;
//   readingProgression?: ReadingProgression;
//   duration?: number;
//   numberOfPages?: number;
// }

export class Metadata {
  public title: LocalizedString;
  public typeUri?: string;
  public identifier?: string;
  public subtitle?: LocalizedString;
  public artists?: Contributors;
  public authors?: Contributors;
  public colorists?: Contributors;
  public contributors?: Contributors;
  public editors?: Contributors;
  public illustrators?: Contributors;
  public inkers?: Contributors;
  public letterers?: Contributors;
  public narrators?: Contributors;
  public pencilers?: Contributors;
  public translators?: Contributors;
  public languages?: Array<string>;
  public description?: string;
  public publishers?: Contributors;
  public imprints?: Contributors;
  public published?: Date;
  public modified?: Date;
  public subjects?: Subjects;
  // public belongsToCollection?: Array<Collection>;
  // public belongsToSeries?: Array<Collection>;
  public belongsTo?: BelongsTo;
  // public belongsToCollections: Array<Collection>;
  // public belongsToSeries: Array<Collection>;

  /** This contains the reading progression as declared in the manifest, so it might be
   *  `auto`. To know the effective reading progression used to lay out the content, use
   *  `effectiveReadingProgression` instead.
   */
  public readingProgression?: ReadingProgression;
  public duration?: number;
  public numberOfPages?: number;
  public otherMetadata?: { [key: string]: any };

  /* public otherMetadata */

  private static readonly RTLLanguages = ['ar', 'fa', 'he', 'zh-Hant', 'zh-TW'];

  private static readonly mappedProperties = ['title', '@type', 'identifier', 'subtitle', 'artists',
    'authors', 'colorists', 'contributors', 'editors', 'illustrators', 'inkers', 'letterers',
    'letterers', 'narrators', 'pencilers', 'translators', 'languages', 'description', 'publishers',
    'imprints', 'published', 'modified', 'subjects', 'belongsTo', 'readingProgression', 'duration',
    'numberOfPages',
  ];

  constructor(values: {
    title: LocalizedString,
    typeUri?: string,
    identifier?: string,
    subtitle?: LocalizedString,
    artists?: Contributors,
    authors?: Contributors,
    colorists?: Contributors,
    contributors?: Contributors,
    editors?: Contributors,
    illustrators?: Contributors,
    inkers?: Contributors,
    letterers?: Contributors,
    narrators?: Contributors,
    pencilers?: Contributors,
    translators?: Contributors,
    languages?: Array<string>,
    description?: string,
    publishers?: Contributors,
    imprints?: Contributors,
    published?: Date,
    modified?: Date,
    subjects?: Subjects,
    belongsTo?: BelongsTo,
    // belongsToCollections?: Array<Collection>,
    // belongsToSeries?: Array<Collection>,
    // belongsToCollection?: Array<Collection>,
    // belongsToSeries?: Array<Collection>
    readingProgression?: ReadingProgression,
    duration?: number,
    numberOfPages?: number,
    otherMetadata?: { [key: string]: any }
  }) {
    this.title = values.title as LocalizedString; //title always required
    this.typeUri = values.typeUri;
    this.identifier = values.identifier;
    this.subtitle = values.subtitle;
    this.artists = values.artists;
    this.authors = values.authors;
    this.colorists = values.colorists;
    this.contributors = values.contributors;
    this.editors = values.editors;
    this.illustrators = values.illustrators;
    this.inkers = values.inkers;
    this.letterers = values.letterers;
    this.narrators = values.narrators;
    this.pencilers = values.pencilers;
    this.translators = values.translators;
    this.languages = values.languages;
    this.description = values.description;
    this.publishers = values.publishers;
    this.imprints = values.imprints;
    this.published = values.published;
    this.modified = values.modified;
    this.subjects = values.subjects;
    this.belongsTo = values.belongsTo;
    // this.belongsToCollections= values.belongsToCollections;
    // this.belongsToSeries = values.belongsToSeries;
    // this.belongsToCollection = values.belongsToCollection;
    // this.belongsToSeries = values.belongsToSeries;
    this.readingProgression = values.readingProgression; // || ReadingProgression.auto;
    this.duration = values.duration;
    this.numberOfPages = values.numberOfPages;
    this.otherMetadata = values.otherMetadata;

    // this.colorists = dictionary.parseArray('colorist');
    // this.contributors = dictionary.parseArray('contributor');
    // this.editors = dictionary.parseArray('editor');
    // this.illustrators = dictionary.parseArray('illustrator');
    // this.inkers = dictionary.parseArray('inker');
    // this.letterers = dictionary.parseArray('letterer');
    // this.narrators = dictionary.parseArray('narrator');
    // this.pencilers = dictionary.parseArray('penciler');
    // this.translators = dictionary.parseArray('translator');
    // this.languages = dictionary.parseArray('language');
    // this.description = dictionary.parseRaw('description');
    // this.publishers = dictionary.parseArray('publisher');
    // this.imprints = dictionary.parseArray('imprint');
    // this.published = dictionary.parseDate('published');
    // this.modified = dictionary.parseDate('modified');
    // this.subjects = dictionary.parseArray('subject');
    // const belongsTo = dictionary.parseRaw('belongsTo');
    // this.belongsToCollection = belongsTo ? belongsTo['collection'] : [];
    // this.belongsToSeries = belongsTo ? belongsTo['series'] : [];
    // this.readingProgression =
    //   dictionary.parseRaw('readingProgression') || ReadingProgression.auto;
    // this.duration = dictionary.parsePositive('duration');
    // this.numberOfPages = dictionary.parsePositive('numberOfPages');
    // this.otherMetadata = dictionary.json;

  }


  public static fromJSON(json: any): Metadata {
    let title = LocalizedString.fromJSON(json.title) as LocalizedString;
    let typeUri = json['@type'];
    let identifier = json.identifier;
    let subtitle = LocalizedString.fromJSON(json.subtitle);
    let artists = Contributors.fromJSON(json.artist);
    let authors = Contributors.fromJSON(json.author);
    let colorists = Contributors.fromJSON(json.colorist);
    let contributors = Contributors.fromJSON(json.contributor);
    let editors = Contributors.fromJSON(json.editor);
    let illustrators = Contributors.fromJSON(json.illustrator);
    let inkers = Contributors.fromJSON(json.inker);
    let letterers = Contributors.fromJSON(json.letterer);
    let narrators = Contributors.fromJSON(json.narrator);
    let pencilers = Contributors.fromJSON(json.penciler);
    let translators = Contributors.fromJSON(json.translator);
    let languages = arrayfromJSON(json.language);
    let description = json.description;
    let publishers = Contributors.fromJSON(json.publisher);
    let imprints = Contributors.fromJSON(json.imprint);
    let published = datefromJSON(json.published);
    let modified = datefromJSON(json.modified);
    let subjects = Subjects.fromJSON(json.subject);

    //let  belongsTo = _json.belongsTo;
    //let  belongsToCollection = belongsTo ? belongsTo['collection'] : [];
    // belongsToSeries : belongsTo ? belongsTo['series'] : [];

    //TODO : implement
    let belongsTo = BelongsTo.fromJSON(json.belongsTo);

    let readingProgression = json.readingProgression;

    let duration = positiveNumberfromJSON(json.duration);
    let numberOfPages = positiveNumberfromJSON(json.numberOfPages);

    let otherMetadata = Object.assign({}, json);
    Metadata.mappedProperties.forEach(x => delete otherMetadata[x]);
    if (Object.keys(otherMetadata).length == 0) {
      otherMetadata = undefined;
    }

    return new Metadata({
      title,
      typeUri,
      identifier,
      subtitle,
      artists,
      authors,
      colorists,
      contributors,
      editors,
      illustrators,
      inkers,
      letterers,
      narrators,
      pencilers,
      translators,
      languages,
      description,
      publishers,
      imprints,
      published,
      modified,
      subjects,
      belongsTo,
      //  belongsTo : dictionary.parseRaw('belongsTo'),
      // belongsToCollection : belongsTo ? belongsTo['collection'] : [];
      // belongsToSeries : belongsTo ? belongsTo['series'] : [];
      readingProgression,
      duration,
      numberOfPages,
      otherMetadata
    });
  }

  public toJSON(): any {
    let json:any = {title : this.title.toJSON() };
    if (this.typeUri) json['@type'] = this.typeUri;
    if (this.identifier) json.identifier = this.identifier;
    if (this.subtitle) json.subtitle = this.subtitle.toJSON();
    if (this.artists) json.artists = this.artists.toJSON();
    if (this.authors) json.authors = this.authors.toJSON();
    if (this.colorists) json.colorists = this.colorists.toJSON();
    if (this.contributors) json.contributors = this.contributors.toJSON();
    if (this.illustrators) json.illustrators = this.illustrators.toJSON();
    if (this.letterers) json.letterers = this.letterers.toJSON();
    if (this.narrators) json.narrators = this.narrators.toJSON();
    if (this.pencilers) json.pencilers = this.pencilers.toJSON();
    if (this.translators) json.translators = this.translators.toJSON();
    if (this.languages) json.languages = this.languages;
    if (this.description) json.description = this.description;
    if (this.publishers) json.publishers = this.publishers.toJSON();
    if (this.imprints) json.imprints = this.imprints.toJSON();
    if (this.published) json.published = this.published;
    if (this.modified) json.modified = this.modified;
    if (this.subjects) json.subjects = this.subjects.toJSON();
    if (this.belongsTo) json.belongsTo = this.belongsTo.toJSON();
    if (this.readingProgression) json.readingProgression = this.readingProgression;
    if (this.duration) json.duration = this.duration;
    if (this.numberOfPages) json.numberOfPages = this.numberOfPages;

    if (this.otherMetadata) {
      let metadata = this.otherMetadata;
      Object.keys(metadata).forEach((x) => json[x]=metadata[x]);
    }

    return json;
  }

  public getPresentation(): Presentation | undefined {
    if (this.otherMetadata) {
      let presentation = this.otherMetadata['presentation'] || this.otherMetadata['rendition'];
      if (presentation) {
        return new Presentation(presentation);
      }
    }

    return undefined;

    // return this.otherMetadata && this.otherMetadata['presentation']
    //   ? new Presentation(this.otherMetadata['presentation'])
    //   : new Presentation({});
  }

  /** Computes a `ReadingProgression` when the value of `readingProgression` is set to `auto`,
   *  using the publication language.
   */
  public effectiveReadingProgression(): ReadingProgression {
    if (
      this.readingProgression &&
      this.readingProgression !== ReadingProgression.auto
    ) {
      return this.readingProgression;
    }

    //TODO : check??
    if (this.languages && this.languages.length > 0) {
      const primaryLang = this.languages[0];
      const lang = primaryLang.includes('zh')
        ? primaryLang
        : primaryLang.split('-')[0];
      if (Metadata.RTLLanguages.includes(lang)) {
        return ReadingProgression.rtl;
      }
    }

    return ReadingProgression.ltr;
  }

}
