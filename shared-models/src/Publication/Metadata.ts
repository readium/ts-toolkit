/* Copyright 2020 Readium Foundation. All rights reserved.
 * Use of this source code is governed by a BSD-style license,
 * available in the LICENSE file present in the Github repository of the project.
 */

import {
  arrayfromJSONorString,
  datefromJSON,
  positiveNumberfromJSON,
} from '../util/JSONParse';
import { BelongsTo } from './BelongsTo';
import { Contributors } from './Contributor';
import { LocalizedString } from './LocalizedString';
import { Presentation } from './presentation/Presentation';
import { ReadingProgression } from './ReadingProgression';
import { Subjects } from './Subject';

/**
 * https://readium.org/webpub-manifest/schema/metadata.schema.json
 *
 * readingProgression : This contains the reading progression as declared in the
 *     publication, so it might be [auto]. To lay out the content, use [effectiveReadingProgression]
 *     to get the calculated reading progression from the declared direction and the language.
 * otherMetadata Additional metadata for extensions, as a JSON dictionary.
 */
export class Metadata {
  public title: LocalizedString;
  public typeUri?: string;
  public identifier?: string;
  public subtitle?: LocalizedString;
  public sortAs?: LocalizedString;
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
  public belongsTo?: BelongsTo;
  public belongsToCollections?: Contributors;
  public belongsToSeries?: Contributors;
  public readingProgression?: ReadingProgression;
  public duration?: number;
  public numberOfPages?: number;
  public otherMetadata?: { [key: string]: any };

  /**All metadata not in otherMetadata */
  private static readonly mappedProperties = [
    'title',
    '@type',
    'identifier',
    'subtitle',
    'sortAs',
    'artist',
    'author',
    'colorist',
    'contributor',
    'editor',
    'illustrator',
    'inker',
    'letterer',
    'narrator',
    'penciler',
    'translator',
    'language',
    'description',
    'publisher',
    'imprint',
    'published',
    'modified',
    'subject',
    'belongsTo',
    'readingProgression',
    'duration',
    'numberOfPages',
  ];

  /** Creates [Metadata] object */
  constructor(values: {
    title: LocalizedString;
    typeUri?: string;
    identifier?: string;
    subtitle?: LocalizedString;
    sortAs?: LocalizedString;
    artists?: Contributors;
    authors?: Contributors;
    colorists?: Contributors;
    contributors?: Contributors;
    editors?: Contributors;
    illustrators?: Contributors;
    inkers?: Contributors;
    letterers?: Contributors;
    narrators?: Contributors;
    pencilers?: Contributors;
    translators?: Contributors;
    languages?: Array<string>;
    description?: string;
    publishers?: Contributors;
    imprints?: Contributors;
    published?: Date;
    modified?: Date;
    subjects?: Subjects;
    belongsTo?: BelongsTo;
    belongsToCollections?: Contributors;
    belongsToSeries?: Contributors;
    readingProgression?: ReadingProgression;
    duration?: number;
    numberOfPages?: number;
    otherMetadata?: { [key: string]: any };
  }) {
    //title always required
    this.title = values.title as LocalizedString;
    this.typeUri = values.typeUri;
    this.identifier = values.identifier;
    this.subtitle = values.subtitle;
    this.sortAs = values.sortAs;
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
    this.belongsToCollections = values.belongsToCollections;
    this.belongsToSeries = values.belongsToSeries;

    if (
      this.belongsToCollections &&
      this.belongsToCollections.items.length > 0
    ) {
      if (!this.belongsTo) {
        this.belongsTo = new BelongsTo();
      }
      this.belongsTo.items.set('collection', this.belongsToCollections);
    }

    if (this.belongsToSeries && this.belongsToSeries.items.length > 0) {
      if (!this.belongsTo) {
        this.belongsTo = new BelongsTo();
      }
      this.belongsTo.items.set('series', this.belongsToSeries);
    }

    this.readingProgression = values.readingProgression;
    this.duration = values.duration;
    this.numberOfPages = values.numberOfPages;
    this.otherMetadata = values.otherMetadata;
  }

  /**
   * Parses a [Metadata] from its RWPM JSON representation.
   *
   * If the metadata can't be parsed, a warning will be logged with [warnings].
   */
  public static fromJSON(json: any): Metadata | undefined {
    if (!(json && json.title)) return;

    let title = LocalizedString.fromJSON(json.title) as LocalizedString;
    let typeUri = json['@type'];
    let identifier = json.identifier;
    let subtitle = LocalizedString.fromJSON(json.subtitle);
    let sortAs = LocalizedString.fromJSON(json.sortAs);
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
    let languages = arrayfromJSONorString(json.language);
    let description = json.description;
    let publishers = Contributors.fromJSON(json.publisher);
    let imprints = Contributors.fromJSON(json.imprint);
    let published = datefromJSON(json.published);
    let modified = datefromJSON(json.modified);
    let subjects = Subjects.fromJSON(json.subject);
    let belongsTo = BelongsTo.fromJSON(json.belongsTo);
    let readingProgression = json.readingProgression;
    let duration = positiveNumberfromJSON(json.duration);
    let numberOfPages = positiveNumberfromJSON(json.numberOfPages);

    let otherMetadata = Object.assign({}, json);
    Metadata.mappedProperties.forEach(x => delete otherMetadata[x]);
    if (Object.keys(otherMetadata).length === 0) {
      otherMetadata = undefined;
    }

    return new Metadata({
      title,
      typeUri,
      identifier,
      subtitle,
      sortAs,
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
      readingProgression,
      duration,
      numberOfPages,
      otherMetadata,
    });
  }

  /**
   * Serializes a [Metadata] to its RWPM JSON representation.
   */
  public toJSON(): any {
    let json: any = { title: this.title.toJSON() };
    if (this.typeUri) json['@type'] = this.typeUri;
    if (this.identifier) json.identifier = this.identifier;
    if (this.subtitle) json.subtitle = this.subtitle.toJSON();
    if (this.sortAs) json.sortAs = this.sortAs.toJSON();
    if (this.editors) json.editor = this.editors.toJSON();
    if (this.artists) json.artist = this.artists.toJSON();
    if (this.authors) json.author = this.authors.toJSON();
    if (this.colorists) json.colorist = this.colorists.toJSON();
    if (this.contributors) json.contributor = this.contributors.toJSON();
    if (this.illustrators) json.illustrator = this.illustrators.toJSON();
    if (this.letterers) json.letterer = this.letterers.toJSON();
    if (this.narrators) json.narrator = this.narrators.toJSON();
    if (this.pencilers) json.penciler = this.pencilers.toJSON();
    if (this.translators) json.translator = this.translators.toJSON();
    if (this.inkers) json.inker = this.inkers.toJSON();
    if (this.languages) json.language = this.languages;
    if (this.description) json.description = this.description;
    if (this.publishers) json.publisher = this.publishers.toJSON();
    if (this.imprints) json.imprint = this.imprints.toJSON();
    if (this.published) json.published = this.published.toISOString();
    if (this.modified) json.modified = this.modified.toISOString();
    if (this.subjects) json.subject = this.subjects.toJSON();
    if (this.belongsTo) json.belongsTo = this.belongsTo.toJSON();
    if (this.readingProgression)
      json.readingProgression = this.readingProgression;
    if (this.duration) json.duration = this.duration;
    if (this.numberOfPages) json.numberOfPages = this.numberOfPages;

    if (this.otherMetadata) {
      let metadata = this.otherMetadata;
      Object.keys(metadata).forEach(x => (json[x] = metadata[x]));
    }

    return json;
  }

  // Presentation
  public getPresentation(): Presentation | undefined {
    if (!this.otherMetadata) return;
    let presentation =
      this.otherMetadata['presentation'] || this.otherMetadata['rendition'];
    if (!presentation) return;
    return new Presentation(presentation);
  }

  /**
   * Computes a [ReadingProgression] when the value of [readingProgression] is set to
   * auto, using the publication language.
   *
   * See this issue for more details: https://github.com/readium/architecture/issues/113
   */
  public effectiveReadingProgression(): ReadingProgression {
    if (
      this.readingProgression &&
      this.readingProgression !== ReadingProgression.auto
    ) {
      return this.readingProgression;
    }

    // https://github.com/readium/readium-css/blob/develop/docs/CSS16-internationalization.md#missing-page-progression-direction
    if (this.languages?.length !== 1) {
      return ReadingProgression.ltr;
    }

    const primaryLang = this.languages[0].toLowerCase();

    if (primaryLang === 'zh-hant' || primaryLang == 'zh-tw') {
      return ReadingProgression.rtl;
    }

    // The region is ignored for ar, fa and he.
    const lang = primaryLang.split('-')[0];

    switch (lang) {
      case 'ar':
        return ReadingProgression.rtl;
      case 'fa':
        return ReadingProgression.rtl;
      case 'he':
        return ReadingProgression.rtl;
      default:
        return ReadingProgression.ltr;
    }
  }
}
