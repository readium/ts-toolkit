import { Link, Links, Locator, LocatorLocations, Profile } from '../src';
import { buildTimeline } from '../src/publication/services/timeline/index.ts';

function ro(href: string, title?: string): Links {
  return new Links([new Link({ href, title })]);
}

function buildLink(href: string, title?: string, children?: Link[]): Link {
  return new Link({
    href,
    title,
    children: children ? new Links(children) : undefined,
  });
}

function buildHtml(
  roHref: string,
  roTitle: string,
  tocLinks: Link[],
  positionsList: Locator[],
) {
  const t = buildTimeline({
    readingOrder: ro(roHref, roTitle),
    toc: new Links(tocLinks),
    metadata: { conformsTo: [Profile.EPUB] },
  });
  t.augment((item, link) => {
    const hashIndex = link.href.indexOf('#');
    const bare = hashIndex >= 0 ? link.href.slice(0, hashIndex) : link.href;
    const fragment = hashIndex >= 0 ? link.href.slice(hashIndex + 1) : undefined;
    const entries = positionsList.filter(p => p.href === bare);
    if (!entries.length) return {};
    const atFragment = fragment
      ? entries.find(p => p.locations.fragments[0] === fragment)
      : undefined;
    const candidate = atFragment ?? entries.reduce((min, p) =>
      (p.locations.position ?? Infinity) < (min.locations.position ?? Infinity) ? p : min
    );
    return {
      position: candidate.locations.position,
      scroll: atFragment?.locations.progression,
    };
  });
  return t;
}

// ---------------------------------------------------------------------------
// position (raw)
// ---------------------------------------------------------------------------

describe('TimelineItem – position', () => {
  it('reading order item gets lowest page number when multiple positions exist for the resource', () => {
    const positions = [
      new Locator({ href: 'chapter1.html', type: '', locations: new LocatorLocations({ position: 6, progression: 0.2 }) }),
      new Locator({ href: 'chapter1.html', type: '', locations: new LocatorLocations({ position: 5, progression: 0.1 }) }),
    ];
    const t = buildHtml('chapter1.html', 'Chapter 1', [], positions);
    expect(t.items[0].position).toBe(5);
  });

  it('reading order item has no position label when positions list is absent', () => {
    const t = buildTimeline({
      readingOrder: ro('chapter1.html', 'Chapter 1'),
      metadata: { conformsTo: [Profile.EPUB] },
    });
    expect(t.items[0].position).toBeUndefined();
  });

  it('audio single-track: parent starts at 0, children get publication-relative time in seconds', () => {
    const t = buildTimeline({
      readingOrder: new Links([new Link({ href: 'track.mp3', title: 'Track', duration: 7200 })]),
      toc: new Links([
        buildLink('track.mp3#t=1647', 'Part 1'),
        buildLink('track.mp3#t=3600', 'Part 2'),
      ]),
      metadata: { conformsTo: [Profile.AUDIOBOOK] },
    });
    expect(t.items[0].position).toBe(0);
    expect(t.items[0].children?.[0].position).toBe(1647);
    expect(t.items[0].children?.[1].position).toBe(3600);
  });

  it('audio multi-track: any missing duration suppresses all time values', () => {
    const t = buildTimeline({
      readingOrder: new Links([
        new Link({ href: 'track1.mp3', title: 'Track 1' }), // no duration
        new Link({ href: 'track2.mp3', title: 'Track 2', duration: 1800 }),
      ]),
      toc: new Links([
        buildLink('track1.mp3#t=60',  'Section A'),
        buildLink('track2.mp3#t=120', 'Section B'),
      ]),
      metadata: { conformsTo: [Profile.AUDIOBOOK] },
    });
    expect(t.items[0].children?.[0].position).toBeUndefined();
    expect(t.items[1].position).toBeUndefined();
    expect(t.items[1].children?.[0].position).toBeUndefined();
  });

  it('audio multi-track: parent and children get publication-relative time in seconds', () => {
    const t = buildTimeline({
      readingOrder: new Links([
        new Link({ href: 'track1.mp3', title: 'Track 1', duration: 3600 }),
        new Link({ href: 'track2.mp3', title: 'Track 2', duration: 1800 }),
      ]),
      toc: new Links([
        buildLink('track1.mp3#t=600', 'Section A'),
        buildLink('track2.mp3#t=120', 'Section B'),
      ]),
      metadata: { conformsTo: [Profile.AUDIOBOOK] },
    });
    expect(t.items[0].position).toBe(0);
    // Section A: 0 + 600 = 600s
    expect(t.items[0].children?.[0].position).toBe(600);
    // Track 2 starts at offset 3600s
    expect(t.items[1].position).toBe(3600);
    // Section B: 3600 + 120 = 3720s
    expect(t.items[1].children?.[0].position).toBe(3720);
  });

  it('EPUB: parent and children both get page numbers from positions list', () => {
    const positions = [
      new Locator({ href: 'chapter1.html', type: '', locations: new LocatorLocations({ position: 5, progression: 0.0 }) }),
      new Locator({ href: 'chapter1.html', type: '', locations: new LocatorLocations({ fragments: ['section'], position: 12, progression: 0.5 }) }),
    ];
    const t = buildHtml(
      'chapter1.html', 'Chapter 1',
      [buildLink('chapter1.html#section', 'Section')],
      positions,
    );
    expect(t.items[0].position).toBe(5);
    expect(t.items[0].children?.[0].position).toBe(12);
  });
});

// ---------------------------------------------------------------------------
// scroll
// ---------------------------------------------------------------------------

describe('TimelineItem – scroll', () => {
  it('TOC child gets scroll progression from matching position', () => {
    const positions = [
      new Locator({ href: 'chapter1.html', type: '', locations: new LocatorLocations({ fragments: ['intro'],   progression: 0.0, position: 1 }) }),
      new Locator({ href: 'chapter1.html', type: '', locations: new LocatorLocations({ fragments: ['section'], progression: 0.5, position: 5 }) }),
    ];
    const t = buildHtml(
      'chapter1.html', 'Chapter 1',
      [
        buildLink('chapter1.html#intro',   'Intro'),
        buildLink('chapter1.html#section', 'Section'),
      ],
      positions,
    );
    expect(t.items[0].children?.[0].scroll).toBe(0.0);
    expect(t.items[0].children?.[1].scroll).toBe(0.5);
  });

  it('TOC child has no scroll when positions list is absent', () => {
    const t = buildHtml(
      'chapter1.html', 'Chapter 1',
      [buildLink('chapter1.html#section', 'Section')],
      [],
    );
    expect(t.items[0].children?.[0].scroll).toBeUndefined();
  });

  it('TOC child has no scroll when no position matches its fragment', () => {
    const positions = [
      new Locator({ href: 'chapter1.html', type: '', locations: new LocatorLocations({ fragments: ['other'], progression: 0.3, position: 3 }) }),
    ];
    const t = buildHtml(
      'chapter1.html', 'Chapter 1',
      [buildLink('chapter1.html#section', 'Section')],
      positions,
    );
    expect(t.items[0].children?.[0].scroll).toBeUndefined();
  });

  it('bare-href TOC entries have no scroll (they are start-of-resource)', () => {
    const positions = [
      new Locator({ href: 'chapter1.html', type: '', locations: new LocatorLocations({ progression: 0.0, position: 1 }) }),
    ];
    const t = buildHtml(
      'chapter1.html', 'Chapter 1',
      [buildLink('chapter1.html', 'Chapter 1')],
      positions,
    );
    // Bare-href TOC entries are excluded from children entirely.
    expect(t.items[0].children).toBeUndefined();
  });
});
