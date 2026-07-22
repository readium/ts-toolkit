import { Link, Links, Locator, LocatorLocations, Profile, Timeline, TimelineItem } from '../src';
import { buildTimeline } from '../src/publication/services/timeline/index.ts';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type RoDef = { href: string; title?: string };
type TocDef = { href: string; title?: string; children?: TocDef[] };

function ro(...items: RoDef[]): Links {
  return new Links(items.map(i => new Link(i)));
}

function buildLink(def: TocDef): Link {
  return new Link({
    href: def.href,
    title: def.title,
    children: def.children ? new Links(def.children.map(buildLink)) : undefined,
  });
}

function toc(...items: TocDef[]): Links {
  return new Links(items.map(buildLink));
}

function build(readingOrder: Links, tocLinks?: Links, depth?: number): Timeline {
  return Timeline.build({ readingOrder, toc: tocLinks }, { depth });
}

function clean(items: TimelineItem[]): unknown[] {
  return items.map(item => {
    const out: Record<string, unknown> = {
      title: item.title,
      references: item.references,
    };
    if (item.children?.length) out['children'] = clean(item.children);
    return out;
  });
}

// ---------------------------------------------------------------------------
// Group 1 – No TOC
// ---------------------------------------------------------------------------

describe('Timeline – no TOC', () => {
  it('1.1 reading order items with titles become top-level items', () => {
    const t = build(ro(
      { href: 'chapter1.html', title: 'Chapter 1' },
      { href: 'chapter2.html', title: 'Chapter 2' },
    ));
    expect(clean(t.items)).toEqual([
      { title: 'Chapter 1', references: ['chapter1.html'] },
      { title: 'Chapter 2', references: ['chapter2.html'] },
    ]);
  });

  it('1.2 reading order items without a derivable title get an undefined title', () => {
    const t = build(ro(
      { href: 'chapter1.html' },
      { href: 'chapter2.html' },
    ));
    expect(clean(t.items)).toEqual([
      { title: undefined, references: ['chapter1.html'] },
      { title: undefined, references: ['chapter2.html'] },
    ]);
  });

  it('1.3 empty reading order produces an empty timeline', () => {
    const t = build(ro());
    expect(t.items).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Group 2 – Title resolution
// ---------------------------------------------------------------------------

describe('Timeline – title resolution', () => {
  it('2.1 reading order title takes precedence over a matching TOC root title', () => {
    const t = build(
      ro({ href: 'chapter1.html', title: 'RO Title' }),
      toc({ href: 'chapter1.html', title: 'TOC Title' }),
    );
    expect(clean(t.items)[0]).toMatchObject({ title: 'RO Title' });
  });

  it('2.2 no RO title – bare-href TOC root provides the title', () => {
    const t = build(
      ro({ href: 'chapter1.html' }),
      toc({ href: 'chapter1.html', title: 'Chapter One' }),
    );
    expect(clean(t.items)[0]).toMatchObject({ title: 'Chapter One' });
  });

  it('2.3 no RO title – single fragment TOC entry provides the title', () => {
    const t = build(
      ro({ href: 'chapter1.html' }),
      toc({ href: 'chapter1.html#opening', title: 'Opening' }),
    );
    expect(clean(t.items)[0]).toMatchObject({ title: 'Opening' });
  });

  it('2.4 no RO title – multiple fragment TOC entries → undefined title, entries become children', () => {
    const t = build(
      ro({ href: 'chapter1.html' }),
      toc(
        { href: 'chapter1.html#section-1', title: 'Section 1' },
        { href: 'chapter1.html#section-2', title: 'Section 2' },
      ),
    );
    expect(clean(t.items)).toEqual([
      {
        title: undefined,
        references: ['chapter1.html'],
        children: [
          { title: 'Section 1', references: ['chapter1.html#section-1'] },
          { title: 'Section 2', references: ['chapter1.html#section-2'] },
        ],
      },
    ]);
  });

  it('2.5 no RO title, no TOC match → undefined title', () => {
    const t = build(
      ro({ href: 'chapter1.html' }, { href: 'chapter2.html', title: 'Chapter 2' }),
      toc({ href: 'chapter2.html', title: 'Chapter Two' }),
    );
    expect(clean(t.items)).toEqual([
      { title: undefined, references: ['chapter1.html'] },
      { title: 'Chapter 2', references: ['chapter2.html'] },
    ]);
  });

  it('2.6 title is resolved from a nested TOC entry when the bare-href root has no title', () => {
    // The root TOC entry has no title, but a single child referencing the same
    // bare href does — that child's title is the only available candidate.
    const t = build(
      ro({ href: 'chapter1.html' }),
      toc({
        href: 'chapter1.html',
        children: [
          { href: 'chapter1.html#intro', title: 'Introduction' },
        ],
      }),
    );
    expect(clean(t.items)[0]).toMatchObject({ title: 'Introduction' });
  });

  it('2.7 a hrefless grouping heading (e.g. a <span>) does not become the title of every resource', () => {
    const t = build(
      ro(
        { href: 'bib.xhtml' },
        { href: 'intro.xhtml' },
        { href: 'isaacs.xhtml' },
        { href: 'andersen.xhtml' },
      ),
      toc(
        { href: 'bib.xhtml', title: 'Bibliography' },
        { href: 'intro.xhtml', title: 'Introductory' },
        {
          href: '',
          title: 'Abram S. Isaacs',
          children: [
            { href: 'isaacs.xhtml', title: 'The Story' },
          ],
        },
        {
          href: '',
          title: 'Hans Christian Andersen',
          children: [
            { href: 'andersen.xhtml#story1', title: 'The Real Princess' },
            { href: 'andersen.xhtml#story2', title: "The Emperor's New Clothes" },
          ],
        },
      ),
    );
    expect(clean(t.items)).toMatchObject([
      { title: 'Bibliography', references: ['bib.xhtml'] },
      { title: 'Introductory', references: ['intro.xhtml'] },
      { title: 'The Story', references: ['isaacs.xhtml'] },
      { title: undefined, references: ['andersen.xhtml'] },
    ]);
  });
});

// ---------------------------------------------------------------------------
// Group 3 – Children from TOC (flat — hierarchy is NOT inferred)
//
// All TOC entries that reference a reading order resource become flat children
// of that RO item, in TOC declaration order.  No parent-child relationships
// within the TOC are reconstructed; that requires role context.
// ---------------------------------------------------------------------------

describe('Timeline – children from TOC (flat)', () => {
  it('3.1 single fragment TOC root → appears as sole child', () => {
    const t = build(
      ro({ href: 'chapter1.html', title: 'Chapter 1' }),
      toc({ href: 'chapter1.html#intro', title: 'Introduction' }),
    );
    expect(clean(t.items)).toEqual([
      {
        title: 'Chapter 1',
        references: ['chapter1.html'],
        children: [{ title: 'Introduction', references: ['chapter1.html#intro'] }],
      },
    ]);
  });

  it('3.2 bare-href TOC root provides title but is NOT included as a child; its fragment children are', () => {
    const t = build(
      ro({ href: 'chapter1.html' }),
      toc({
        href: 'chapter1.html',
        title: 'Chapter',
        children: [
          { href: 'chapter1.html#section-1', title: 'Section 1' },
          { href: 'chapter1.html#section-2', title: 'Section 2' },
        ],
      }),
    );
    expect(clean(t.items)).toEqual([
      {
        title: 'Chapter',
        references: ['chapter1.html'],
        children: [
          { title: 'Section 1', references: ['chapter1.html#section-1'] },
          { title: 'Section 2', references: ['chapter1.html#section-2'] },
        ],
      },
    ]);
  });

  it('3.3 fragment TOC root plus its children on the same resource → all flat', () => {
    const t = build(
      ro({ href: 'chapter1.html', title: 'Chapter 1' }),
      toc({
        href: 'chapter1.html#part',
        title: 'Part',
        children: [
          { href: 'chapter1.html#section-1', title: 'Section 1' },
          { href: 'chapter1.html#section-2', title: 'Section 2' },
        ],
      }),
    );
    expect(clean(t.items)).toEqual([
      {
        title: 'Chapter 1',
        references: ['chapter1.html'],
        children: [
          { title: 'Part',      references: ['chapter1.html#part'] },
          { title: 'Section 1', references: ['chapter1.html#section-1'] },
          { title: 'Section 2', references: ['chapter1.html#section-2'] },
        ],
      },
    ]);
  });

  it('3.4 TOC parent spans two RO resources – each resource gets only its matching entries, flat', () => {
    const t = build(
      ro(
        { href: 'chapter1.html', title: 'Chapter 1' },
        { href: 'chapter2.html', title: 'Chapter 2' },
      ),
      toc({
        href: 'chapter1.html#part',
        title: 'Part',
        children: [
          { href: 'chapter1.html#section-1', title: 'Section 1' },
          { href: 'chapter1.html#section-2', title: 'Section 2' },
          { href: 'chapter2.html#section-3', title: 'Section 3' },
          { href: 'chapter2.html#section-4', title: 'Section 4' },
        ],
      }),
    );
    expect(clean(t.items)).toEqual([
      {
        title: 'Chapter 1',
        references: ['chapter1.html'],
        children: [
          { title: 'Part',      references: ['chapter1.html#part'] },
          { title: 'Section 1', references: ['chapter1.html#section-1'] },
          { title: 'Section 2', references: ['chapter1.html#section-2'] },
        ],
      },
      {
        title: 'Chapter 2',
        references: ['chapter2.html'],
        children: [
          { title: 'Section 3', references: ['chapter2.html#section-3'] },
          { title: 'Section 4', references: ['chapter2.html#section-4'] },
        ],
      },
    ]);
  });

  it('3.5 deeply nested TOC entries are also collected as flat children', () => {
    // No hierarchy is reconstructed — Part, Sub-Chapter 1, and Section 1.1
    // all reference the same resource so they all appear at the same level.
    const t = build(
      ro({ href: 'chapter1.html', title: 'Chapter 1' }),
      toc({
        href: 'chapter1.html#part',
        title: 'Part',
        children: [
          {
            href: 'chapter1.html#ch1',
            title: 'Sub-Chapter 1',
            children: [
              { href: 'chapter1.html#s1-1', title: 'Section 1.1' },
            ],
          },
        ],
      }),
    );
    expect(clean(t.items)).toEqual([
      {
        title: 'Chapter 1',
        references: ['chapter1.html'],
        children: [
          { title: 'Part',          references: ['chapter1.html#part'] },
          { title: 'Sub-Chapter 1', references: ['chapter1.html#ch1'] },
          { title: 'Section 1.1',   references: ['chapter1.html#s1-1'] },
        ],
      },
    ]);
  });

  it('3.6 children follow TOC declaration order', () => {
    const t = build(
      ro({ href: 'chapter1.mp3', title: 'Chapter 1' }),
      toc(
        { href: 'chapter1.mp3#t=100', title: 'C' },
        { href: 'chapter1.mp3#t=10',  title: 'A' },
        { href: 'chapter1.mp3#t=50',  title: 'B' },
      ),
    );
    const children = (clean(t.items)[0] as any).children as { title: string }[];
    expect(children.map(c => c.title)).toEqual(['C', 'A', 'B']);
  });
});

// ---------------------------------------------------------------------------
// Group 4 – TOC entries not covered by the reading order are ignored
// ---------------------------------------------------------------------------

describe('Timeline – TOC entries outside the reading order', () => {
  it('4.1 TOC root whose href is not in the reading order is NOT added to the timeline', () => {
    const t = build(
      ro({ href: 'chapter1.html', title: 'Chapter 1' }),
      toc(
        { href: 'chapter1.html#intro', title: 'Intro' },
        { href: 'extras.html',         title: 'Extras' },
      ),
    );
    // extras.html is not in the reading order → ignored entirely
    // chapter1.html#intro IS a child of the chapter1 item
    expect(clean(t.items)).toEqual([
      {
        title: 'Chapter 1',
        references: ['chapter1.html'],
        children: [{ title: 'Intro', references: ['chapter1.html#intro'] }],
      },
    ]);
  });

  it('4.2 TOC-only entries with children are also ignored', () => {
    const t = build(
      ro({ href: 'chapter1.html', title: 'Chapter 1' }),
      toc({
        href: 'extras.html',
        title: 'Extras',
        children: [
          { href: 'extras.html#part-1', title: 'Part 1' },
        ],
      }),
    );
    expect(clean(t.items)).toEqual([
      { title: 'Chapter 1', references: ['chapter1.html'] },
    ]);
  });
});

// ---------------------------------------------------------------------------
// Group 5 – Audio-specific: #t=0 means start of resource, same as bare href
// ---------------------------------------------------------------------------

describe('Timeline – audio #t=0 edge cases', () => {
  it('5.1 #t=0 TOC root provides the title like a bare href', () => {
    const t = build(
      ro({ href: 'track.mp3' }),
      toc({ href: 'track.mp3#t=0', title: 'Track Title' }),
    );
    expect(clean(t.items)[0]).toMatchObject({ title: 'Track Title' });
  });

  it('5.2 #t=0 alongside other fragment entries counts as the bare-href match, not as a fragment match', () => {
    // #t=0 should not push the item into the "multiple fragments" case;
    // it should be treated as the title-providing bare-href equivalent,
    // leaving the remaining entries to be evaluated on their own.
    const t = build(
      ro({ href: 'track.mp3' }),
      toc(
        { href: 'track.mp3#t=0',  title: 'Title from Start' },
        { href: 'track.mp3#t=60', title: 'Section 1' },
      ),
    );
    // t=0 provides the title; the one remaining non-zero fragment is a single
    // match and would also provide a title — but t=0 wins as the bare-href
    // equivalent (higher priority).
    expect(clean(t.items)[0]).toMatchObject({ title: 'Title from Start' });
  });
});

// ---------------------------------------------------------------------------
// Group 6 – Depth limits how deep into the TOC tree children are collected.
// Level 1 = top-level TOC entries; level 2 = their children; etc.
// Children are always flat regardless of depth.
//
// Shared TOC used across 6.1–6.3:
//   Level 1: Part (c.html#part), Epilogue (c.html#epilogue)
//   Level 2: Section 1 (c.html#s1), Section 2 (c.html#s2)
//   Level 3: Sub-section 1a (c.html#s1a)
// ---------------------------------------------------------------------------

describe('Timeline – depth', () => {
  const sharedRo = ro({ href: 'c.html', title: 'Chapter' });
  const sharedToc = toc(
    {
      href: 'c.html#part',
      title: 'Part',
      children: [
        {
          href: 'c.html#s1',
          title: 'Section 1',
          children: [
            { href: 'c.html#s1a', title: 'Sub-section 1a' },
          ],
        },
        { href: 'c.html#s2', title: 'Section 2' },
      ],
    },
    { href: 'c.html#epilogue', title: 'Epilogue' },
  );

  it('6.1 depth=1 collects only level-1 TOC entries as flat children', () => {
    const t = build(sharedRo, sharedToc, 1);
    expect(clean(t.items)).toEqual([
      {
        title: 'Chapter',
        references: ['c.html'],
        children: [
          { title: 'Part',     references: ['c.html#part'] },
          { title: 'Epilogue', references: ['c.html#epilogue'] },
        ],
      },
    ]);
  });

  it('6.2 depth=2 collects levels 1 and 2 as flat children', () => {
    const t = build(sharedRo, sharedToc, 2);
    expect(clean(t.items)).toEqual([
      {
        title: 'Chapter',
        references: ['c.html'],
        children: [
          { title: 'Part',      references: ['c.html#part'] },
          { title: 'Section 1', references: ['c.html#s1'] },
          { title: 'Section 2', references: ['c.html#s2'] },
          { title: 'Epilogue',  references: ['c.html#epilogue'] },
        ],
      },
    ]);
  });

  it('6.3 no depth limit collects entries at all levels as flat children', () => {
    const t = build(sharedRo, sharedToc);
    expect(clean(t.items)).toEqual([
      {
        title: 'Chapter',
        references: ['c.html'],
        children: [
          { title: 'Part',           references: ['c.html#part'] },
          { title: 'Section 1',      references: ['c.html#s1'] },
          { title: 'Sub-section 1a', references: ['c.html#s1a'] },
          { title: 'Section 2',      references: ['c.html#s2'] },
          { title: 'Epilogue',       references: ['c.html#epilogue'] },
        ],
      },
    ]);
  });

  it('6.4 depth=1 ignores matching entries nested under a non-matching parent', () => {
    // Real-world case: a Part entry in the TOC sits at level 1 referencing a
    // different resource, with chapter sections nested at level 2.
    const t = build(
      ro({ href: 'chapter2.html', title: 'Chapter 2' }),
      toc({
        href: 'chapter1.html#part',
        title: 'Part',
        children: [
          { href: 'chapter2.html#s1', title: 'Section 1' },
          { href: 'chapter2.html#s2', title: 'Section 2' },
        ],
      }),
      1,
    );
    expect(clean(t.items)).toEqual([
      { title: 'Chapter 2', references: ['chapter2.html'] },
    ]);
  });

  it('6.5 depth=2 reaches matching entries nested under a non-matching parent', () => {
    const t = build(
      ro({ href: 'chapter2.html', title: 'Chapter 2' }),
      toc({
        href: 'chapter1.html#part',
        title: 'Part',
        children: [
          { href: 'chapter2.html#s1', title: 'Section 1' },
          { href: 'chapter2.html#s2', title: 'Section 2' },
        ],
      }),
      2,
    );
    expect(clean(t.items)).toEqual([
      {
        title: 'Chapter 2',
        references: ['chapter2.html'],
        children: [
          { title: 'Section 1', references: ['chapter2.html#s1'] },
          { title: 'Section 2', references: ['chapter2.html#s2'] },
        ],
      },
    ]);
  });
});

// ---------------------------------------------------------------------------
// Group 7 – Single-track audio: fragment-only TOC links (#t=N)
// ---------------------------------------------------------------------------

describe('Timeline – single-track audio (fragment-only references)', () => {
  it('7.1 fragment-only TOC children are collected and stored with the resource href prepended', () => {
    const t = build(
      ro({ href: 'audio.mp3', title: 'Audiobook' }),
      toc(
        { href: '#t=60',   title: 'Part 1' },
        { href: '#t=1800', title: 'Part 2' },
      ),
    );
    expect(clean(t.items)).toEqual([
      {
        title: 'Audiobook',
        references: ['audio.mp3'],
        children: [
          { title: 'Part 1', references: ['audio.mp3#t=60'] },
          { title: 'Part 2', references: ['audio.mp3#t=1800'] },
        ],
      },
    ]);
  });

  it('7.2 #t=0 fragment-only TOC link is treated as start-of-resource', () => {
    const t = build(
      ro({ href: 'audio.mp3' }),
      toc(
        { href: '#t=0',  title: 'Audiobook Title' },
        { href: '#t=60', title: 'Part 1' },
      ),
    );
    expect(clean(t.items)[0]).toMatchObject({ title: 'Audiobook Title' });
    expect((clean(t.items)[0] as any).children).toEqual([
      { title: 'Part 1', references: ['audio.mp3#t=60'] },
    ]);
  });
});

// ---------------------------------------------------------------------------
// Group 8 – locate()
// ---------------------------------------------------------------------------

function locator(href: string, locations?: ConstructorParameters<typeof LocatorLocations>[0]): Locator {
  return new Locator({ href, type: '', locations: locations ? new LocatorLocations(locations) : undefined });
}

describe('Timeline – locate()', () => {
  // ── EPUB ──────────────────────────────────────────────────────────────────

  it('8.1 EPUB: matches on HTML ID fragment', () => {
    const t = build(
      ro({ href: 'chapter1.html', title: 'Chapter 1' }),
      toc(
        { href: 'chapter1.html#intro',   title: 'Intro' },
        { href: 'chapter1.html#section', title: 'Section' },
      ),
    );
    const item = t.locate(locator('chapter1.html', { fragments: ['section'] }));
    expect(item?.title).toBe('Section');
  });

  it('8.2 EPUB: href with fragment is normalized and matched', () => {
    const t = build(
      ro({ href: 'chapter1.html', title: 'Chapter 1' }),
      toc({ href: 'chapter1.html#intro', title: 'Intro' }),
    );
    // Fragment in href should be normalized into locations by the Locator constructor.
    const item = t.locate(locator('chapter1.html#intro'));
    expect(item?.title).toBe('Intro');
  });

  it('8.3 EPUB: falls back to bare href when no fragment matches', () => {
    const t = build(
      ro({ href: 'chapter1.html', title: 'Chapter 1' }),
    );
    const item = t.locate(locator('chapter1.html'));
    expect(item?.title).toBe('Chapter 1');
  });

  it('8.4 EPUB: returns undefined for unknown href', () => {
    const t = build(ro({ href: 'chapter1.html', title: 'Chapter 1' }));
    expect(t.locate(locator('unknown.html'))).toBeUndefined();
  });

  it('8.5 EPUB: matches on scroll progression', () => {
    const positionsList = [
      new Locator({ href: 'chapter1.html', type: '', locations: new LocatorLocations({ fragments: ['intro'],   progression: 0.0, position: 1 }) }),
      new Locator({ href: 'chapter1.html', type: '', locations: new LocatorLocations({ fragments: ['section'], progression: 0.5, position: 5 }) }),
    ];
    const t = buildTimeline({
      readingOrder: ro({ href: 'chapter1.html', title: 'Chapter 1' }),
      toc: toc(
        { href: 'chapter1.html#intro',   title: 'Intro' },
        { href: 'chapter1.html#section', title: 'Section' },
      ),
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
      return { scroll: atFragment?.locations.progression };
    });
    const item = t.locate(locator('chapter1.html', { progression: 0.6 }));
    expect(item?.title).toBe('Section');
  });

  // ── Audio multi-track ─────────────────────────────────────────────────────

  it('8.6 audio multi-track: best-match on t= start time', () => {
    const t = build(
      ro({ href: 'track1.mp3', title: 'Track 1' }),
      toc(
        { href: 'track1.mp3#t=0',   title: 'Intro' },
        { href: 'track1.mp3#t=60',  title: 'Part 1' },
        { href: 'track1.mp3#t=120', title: 'Part 2' },
      ),
    );
    const item = t.locate(locator('track1.mp3', { fragments: ['t=90'] }));
    expect(item?.title).toBe('Part 1');
  });

  it('8.7 audio multi-track: does not match items from a different track', () => {
    const t = build(
      ro({ href: 'track1.mp3', title: 'Track 1' }, { href: 'track2.mp3', title: 'Track 2' }),
      toc(
        { href: 'track1.mp3#t=60', title: 'Part 1' },
        { href: 'track2.mp3#t=60', title: 'Part 2' },
      ),
    );
    const item = t.locate(locator('track2.mp3', { fragments: ['t=90'] }));
    expect(item?.title).toBe('Part 2');
  });

  // ── Audio single-track ────────────────────────────────────────────────────

  it('8.8 audio single-track: best-match on t= start time with fragment-only references in TOC', () => {
    const t = build(
      ro({ href: 'audio.mp3', title: 'Audiobook' }),
      toc(
        { href: '#t=0',   title: 'Intro' },
        { href: '#t=60',  title: 'Part 1' },
        { href: '#t=120', title: 'Part 2' },
      ),
    );
    const item = t.locate(locator('audio.mp3', { fragments: ['t=90'] }));
    expect(item?.title).toBe('Part 1');
  });

  // ── Multi-reference items ─────────────────────────────────────────────────

  it('8.9 multi-reference: item is matched via its second reference', () => {
    const t = Timeline.build({ readingOrder: ro({ href: 'track1.mp3', title: 'Track 1' }, { href: 'track2.mp3', title: 'Track 2' }) });
    // Manually inject an item with two references (external consumer use case).
    const multiItem: TimelineItem = {
      title: 'Spanning Part',
      references: ['track1.mp3#t=3600', 'track2.mp3#t=0'],
    };
    const customTimeline = new Timeline(
      [multiItem],
      new Map([[multiItem, new Link({ href: 'track1.mp3' })]]),
    );
    expect(customTimeline.locate(locator('track2.mp3', { fragments: ['t=30'] }))?.title).toBe('Spanning Part');
  });
});

// ---------------------------------------------------------------------------
// Group 9 – contextualizedToc
// ---------------------------------------------------------------------------

describe('Timeline – contextualizedToc', () => {
  const sharedRo = ro({ href: 'c.html', title: 'Chapter' });
  const sharedToc = toc(
    {
      href: 'c.html#part',
      title: 'Part',
      children: [
        {
          href: 'c.html#s1',
          title: 'Section 1',
          children: [
            { href: 'c.html#s1a', title: 'Sub-section 1a' },
          ],
        },
        { href: 'c.html#s2', title: 'Section 2' },
      ],
    },
    { href: 'c.html#epilogue', title: 'Epilogue' },
  );

  function cleanToc(entries: ReturnType<Timeline['contextualizedToc']>): unknown[] {
    return entries.map(e => {
      const out: Record<string, unknown> = { title: e.link.title };
      if (e.position !== undefined) out['position'] = e.position;
      if (e.timestamp !== undefined) out['timestamp'] = e.timestamp;
      if (e.children?.length) out['children'] = cleanToc(e.children);
      return out;
    });
  }

  it('9.1 mirrors the real, authored TOC hierarchy — deeper than items\' one-level-flat children', () => {
    const t = build(sharedRo, sharedToc);
    expect(cleanToc(t.contextualizedToc)).toEqual([
      {
        title: 'Part',
        children: [
          {
            title: 'Section 1',
            children: [{ title: 'Sub-section 1a' }],
          },
          { title: 'Section 2' },
        ],
      },
      { title: 'Epilogue' },
    ]);
  });

  it('9.2 respects depth', () => {
    const t = build(sharedRo, sharedToc, 1);
    expect(cleanToc(t.contextualizedToc)).toEqual([
      { title: 'Part' },
      { title: 'Epilogue' },
    ]);
  });

  it('9.3 non-audio profile: position (string) is populated from the matching item, timestamp is not', () => {
    const positions = [
      new Locator({ href: 'chapter1.html', type: '', locations: new LocatorLocations({ fragments: ['section'], position: 12, progression: 0.5 }) }),
    ];
    const t = buildTimeline({
      readingOrder: ro({ href: 'chapter1.html', title: 'Chapter 1' }),
      toc: toc({ href: 'chapter1.html#section', title: 'Section' }),
      metadata: { conformsTo: [Profile.EPUB] },
    });
    t.augment((_item, link) => {
      const fragment = link.href.split('#')[1];
      const entry = positions.find(p => p.locations.fragments[0] === fragment);
      return { position: entry?.locations.position };
    });
    const entry = t.contextualizedToc[0];
    expect(entry.position).toBe('12');
    expect(entry.timestamp).toBeUndefined();
  });

  it('9.4 audiobook profile: timestamp (formatted string) is populated, position is not', () => {
    const t = buildTimeline({
      readingOrder: new Links([new Link({ href: 'track.mp3', title: 'Track', duration: 7200 })]),
      toc: new Links([buildLink({ href: 'track.mp3#t=1647', title: 'Part 1' })]),
      metadata: { conformsTo: [Profile.AUDIOBOOK] },
    });
    const entry = t.contextualizedToc[0];
    expect(entry.timestamp).toBe('27:27');
    expect(entry.position).toBeUndefined();
  });

  it('9.5 falls back to one flat entry per reading-order item when there is no manifest toc at all', () => {
    const t = build(ro(
      { href: 'chapter1.html', title: 'Chapter 1' },
      { href: 'chapter2.html', title: 'Chapter 2' },
    ));
    expect(t.contextualizedToc.map(e => e.link.href)).toEqual(['chapter1.html', 'chapter2.html']);
    expect(t.contextualizedToc.every(e => e.children === undefined)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Group 10 – tocEntryFor
// ---------------------------------------------------------------------------

describe('Timeline – tocEntryFor', () => {
  it('10.1 tier-1 direct match: a TOC-derived child item resolves to its own toc entry', () => {
    const t = build(
      ro({ href: 'chapter1.html', title: 'Chapter 1' }),
      toc({ href: 'chapter1.html#intro', title: 'Introduction' }),
    );
    const child = t.items[0].children![0];
    expect(t.tocEntryFor(child)?.link.title).toBe('Introduction');
  });

  it('10.2 tier-2 fallback: a plain reading-order item resolves to the nearest preceding toc entry by scroll', () => {
    const t = build(
      ro({ href: 'chapter1.html', title: 'Chapter 1' }),
      toc(
        { href: 'chapter1.html#s1', title: 'Section 1' },
        { href: 'chapter1.html#s2', title: 'Section 2' },
      ),
    );
    // Simulate scroll progression normally populated via augment().
    t.items[0].children![0].scroll = 0.0;
    t.items[0].children![1].scroll = 0.5;
    t.items[0].scroll = 0.6;

    expect(t.tocEntryFor(t.items[0])?.link.title).toBe('Section 2');
  });

  it('10.3 tier-3 fallback: a resource with no TOC entries of its own resolves to the preceding resource\'s toc entry', () => {
    // One TOC entry spans three consecutive RO resources — only the first is referenced.
    const t = build(
      ro(
        { href: 'chapter1.html' },
        { href: 'chapter1-2.html' },
        { href: 'chapter1-3.html' },
      ),
      toc({ href: 'chapter1.html', title: 'Chapter One' }),
    );
    expect(t.tocEntryFor(t.items[1])?.link.title).toBe('Chapter One');
  });

  it('10.4 tier-3 fallback: walks back past multiple untitled resources to find the nearest preceding entry', () => {
    const t = build(
      ro(
        { href: 'chapter1.html' },
        { href: 'chapter1-2.html' },
        { href: 'chapter1-3.html' },
      ),
      toc({ href: 'chapter1.html', title: 'Chapter One' }),
    );
    // chapter1-3.html has no toc entry of its own, and neither does chapter1-2.html
    // immediately preceding it — must skip past it to chapter1.html's entry.
    expect(t.tocEntryFor(t.items[2])?.link.title).toBe('Chapter One');
  });

  it('10.5 tier-3 fallback: preceding resource with only ambiguous fragment entries still resolves, to the last one', () => {
    // chapter1.html has no start-of-resource toc entry, and two fragment entries —
    // ambiguous for title resolution (undefined title), but tier-3 must still
    // pick one deterministically rather than skipping past it to nothing.
    const t = build(
      ro(
        { href: 'chapter1.html' },
        { href: 'chapter1-2.html' },
      ),
      toc(
        { href: 'chapter1.html#s1', title: 'Section 1' },
        { href: 'chapter1.html#s2', title: 'Section 2' },
      ),
    );
    expect(t.tocEntryFor(t.items[1])?.link.title).toBe('Section 2');
  });

  it('10.6 tier-3 fallback: excludes fragment-only toc entries when resolving the preceding resource', () => {
    // "#t=30" is fragment-only (single-track audio convention) and loosely
    // matches any resource's own title resolution in build(), but it does
    // not belong to track1.mp3 specifically — must not be picked as its entry.
    const t = build(
      ro(
        { href: 'track1.mp3' },
        { href: 'track2.mp3' },
      ),
      toc({ href: '#t=30', title: 'Marker' }),
    );
    expect(t.tocEntryFor(t.items[1])).toBeUndefined();
  });

  it('10.7 tier-3 fallback: no preceding entry exists → undefined', () => {
    const t = build(
      ro({ href: 'chapter1.html' }, { href: 'chapter2.html', title: 'Chapter 2' }),
      toc({ href: 'chapter2.html', title: 'Chapter Two' }),
    );
    expect(t.tocEntryFor(t.items[0])).toBeUndefined();
  });

  it('10.8 tier-3 fallback: does not misresolve when the reading order repeats the same href', () => {
    // Two RO entries share an href; the second (untitled, no toc entries of
    // its own) must resolve against its own preceding neighbor by identity,
    // not the first occurrence of a matching href.
    const t = build(
      ro(
        { href: 'shared.html', title: 'First' },
        { href: 'other.html' },
        { href: 'shared.html' },
      ),
      toc({ href: 'other.html', title: 'Other' }),
    );
    expect(t.tocEntryFor(t.items[2])?.link.title).toBe('Other');
  });

  it('10.9 no match: an item unknown to the timeline resolves to undefined', () => {
    const t = build(
      ro({ href: 'chapter1.html', title: 'Chapter 1' }),
      toc({ href: 'chapter1.html#intro', title: 'Introduction' }),
    );
    const untracked: TimelineItem = { title: 'Untracked', references: ['nowhere.html'] };
    expect(t.tocEntryFor(untracked)).toBeUndefined();
  });

  it('10.10 no manifest toc: a reading-order item direct-matches its own fallback toc entry', () => {
    const t = build(ro({ href: 'chapter1.html', title: 'Chapter 1' }));
    expect(t.tocEntryFor(t.items[0])?.link.href).toBe('chapter1.html');
  });
});
