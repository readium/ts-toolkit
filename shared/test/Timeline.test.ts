import { Link, Links, Timeline, TimelineItem } from '../src';

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

  it('1.2 reading order items without titles receive a positional placeholder', () => {
    const t = build(ro(
      { href: 'chapter1.html' },
      { href: 'chapter2.html' },
    ));
    expect(clean(t.items)).toEqual([
      { title: 'Resource 1', references: ['chapter1.html'] },
      { title: 'Resource 2', references: ['chapter2.html'] },
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

  it('2.4 no RO title – multiple fragment TOC entries → positional placeholder, entries become children', () => {
    const t = build(
      ro({ href: 'chapter1.html' }),
      toc(
        { href: 'chapter1.html#section-1', title: 'Section 1' },
        { href: 'chapter1.html#section-2', title: 'Section 2' },
      ),
    );
    expect(clean(t.items)).toEqual([
      {
        title: 'Resource 1',
        references: ['chapter1.html'],
        children: [
          { title: 'Section 1', references: ['chapter1.html#section-1'] },
          { title: 'Section 2', references: ['chapter1.html#section-2'] },
        ],
      },
    ]);
  });

  it('2.5 no RO title, no TOC match → positional placeholder', () => {
    const t = build(
      ro({ href: 'chapter1.html' }, { href: 'chapter2.html', title: 'Chapter 2' }),
      toc({ href: 'chapter2.html', title: 'Chapter Two' }),
    );
    expect(clean(t.items)).toEqual([
      { title: 'Resource 1', references: ['chapter1.html'] },
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
