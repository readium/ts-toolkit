/* Copyright 2021 Readium Foundation. All rights reserved.
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
  public static deserialize(json: any): Metadata | undefined {
    if (!(json && json.title)) return;

    const title = LocalizedString.deserialize(json.title) as LocalizedString;
    const typeUri = json['@type'];
    const identifier = json.identifier;
    const subtitle = LocalizedString.deserialize(json.subtitle);
    const sortAs = LocalizedString.deserialize(json.sortAs);
    const artists = Contributors.deserialize(json.artist);
    const authors = Contributors.deserialize(json.author);
    const colorists = Contributors.deserialize(json.colorist);
    const contributors = Contributors.deserialize(json.contributor);
    const editors = Contributors.deserialize(json.editor);
    const illustrators = Contributors.deserialize(json.illustrator);
    const inkers = Contributors.deserialize(json.inker);
    const letterers = Contributors.deserialize(json.letterer);
    const narrators = Contributors.deserialize(json.narrator);
    const pencilers = Contributors.deserialize(json.penciler);
    const translators = Contributors.deserialize(json.translator);
    const languages = arrayfromJSONorString(json.language);
    const description = json.description;
    const publishers = Contributors.deserialize(json.publisher);
    const imprints = Contributors.deserialize(json.imprint);
    const published = datefromJSON(json.published);
    const modified = datefromJSON(json.modified);
    const subjects = Subjects.deserialize(json.subject);
    const belongsTo = BelongsTo.deserialize(json.belongsTo);
    const readingProgression = json.readingProgression;
    const duration = positiveNumberfromJSON(json.duration);
    const numberOfPages = positiveNumberfromJSON(json.numberOfPages);

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
  public serialize(): any {
    const json: any = { title: this.title.serialize() };
    if (this.typeUri !== undefined) json['@type'] = this.typeUri;
    if (this.identifier !== undefined) json.identifier = this.identifier;
    if (this.subtitle) json.subtitle = this.subtitle.serialize();
    if (this.sortAs) json.sortAs = this.sortAs.serialize();
    if (this.editors) json.editor = this.editors.serialize();
    if (this.artists) json.artist = this.artists.serialize();
    if (this.authors) json.author = this.authors.serialize();
    if (this.colorists) json.colorist = this.colorists.serialize();
    if (this.contributors) json.contributor = this.contributors.serialize();
    if (this.illustrators) json.illustrator = this.illustrators.serialize();
    if (this.letterers) json.letterer = this.letterers.serialize();
    if (this.narrators) json.narrator = this.narrators.serialize();
    if (this.pencilers) json.penciler = this.pencilers.serialize();
    if (this.translators) json.translator = this.translators.serialize();
    if (this.inkers) json.inker = this.inkers.serialize();
    if (this.languages) json.language = this.languages;
    if (this.description !== undefined) json.description = this.description;
    if (this.publishers) json.publisher = this.publishers.serialize();
    if (this.imprints) json.imprint = this.imprints.serialize();
    if (this.published !== undefined)
      json.published = this.published.toISOString();
    if (this.modified !== undefined)
      json.modified = this.modified.toISOString();
    if (this.subjects) json.subject = this.subjects.serialize();
    if (this.belongsTo) json.belongsTo = this.belongsTo.serialize();
    if (this.readingProgression)
      json.readingProgression = this.readingProgression;
    if (this.duration !== undefined) json.duration = this.duration;
    if (this.numberOfPages !== undefined)
      json.numberOfPages = this.numberOfPages;

    if (this.otherMetadata) {
      const metadata = this.otherMetadata;
      Object.keys(metadata).forEach(x => (json[x] = metadata[x]));
    }

    return json;
  }

  /**
   * Computes a [ReadingProgression] when the value of [readingProgression] is set to
   * auto, using the publication language.
   *
   * See this issue for more details: https://github.com/readium/architecture/issues/113
   */
  public get effectiveReadingProgression(): ReadingProgression {
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

    if (primaryLang === 'zh-hant' || primaryLang === 'zh-tw') {
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
