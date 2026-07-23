# Timeline

> **This API is in active development and will evolve.** Behaviour, method signatures, and the shape of `TimelineItem` are subject to change without notice until this notice is removed.

A `Timeline` gives reading applications a unified, format-agnostic view of a publication's structure. It answers questions like "What chapter am I in right now?", "Where does the next chapter begin?", and "Which section does this search result belong to?" — consistently across EPUBs, audiobooks, PDFs, and web publications.

## Concepts

### TimelineItem

A `TimelineItem` represents one structural entry in the publication:

```ts
interface TimelineItem {
  title?: string;        // Display title of this entry, when one could be derived
  references: string[];  // Hrefs with optional fragments that identify where this entry starts
  role?: string[];       // Structural roles, e.g. ["chapter"], ["part"]
  position?: number;     // Raw position: book-global seconds for audio, a Positions List position for EPUB, a page number for PDF
  scroll?: number;       // Scroll progression (0–1) for entries that start mid-resource
  children?: TimelineItem[];
}
```

`position` is a raw value, not display-ready — use `tocEntryFor(item)` (see below) to get a formatted label/timestamp for UI.

`references` holds one or more hrefs identifying where this entry starts in the reading order. Examples:
- Audio: `["track1.mp3#t=1620"]` (NPT time fragment)
- EPUB: `["chapter3.html#section-2"]` (HTML id fragment)
- PDF: `["#page=42"]` (page fragment)

### Timeline

`Timeline` is the container built once from a publication's reading order and table of contents. It is a lazy singleton on `Publication`: the first access builds it and the result is cached.

### How it is built

**The reading order is the source of truth.** Every item in the reading order becomes exactly one top-level `TimelineItem`. The TOC is consulted only to enrich those items — never to introduce new top-level entries.

**Title resolution** (per reading order item, first match wins):
1. The reading order item's own `title`.
2. A TOC entry whose href points to the start of that resource (bare href, or `#t=0` for audio).
3. If exactly one fragment-based TOC entry references this resource, its title.
4. A positional placeholder (`Resource N`) when no title can be reliably derived.

**Children:** all TOC entries that reference a reading order resource become flat children of the corresponding timeline item, in TOC declaration order. No parent-child relationships within the TOC are reconstructed — that inference requires role context and is planned for a future iteration.

TOC entries that do not match any reading order item are ignored entirely.

### Depth

The `depth` option controls how many levels deep into the TOC hierarchy the timeline looks, for both title resolution and child collection. Level 1 means only top-level TOC entries; level 2 adds their children; and so on. `undefined` means no limit.

Depth can be set at build time (via `Timeline.build`) or adjusted at runtime via the `depth` setter. Setting it at runtime trims the cached tree without rebuilding from scratch. Setting the same value again is a no-op.

## Access

```ts
publication.timeline  // lazy, cached on first access
navigator.timeline    // delegates to publication.timeline (may also augment with additional data)
```

Prefer `navigator.timeline` when a navigator is available: the EPUB navigator augments the timeline with the Positions List, populating `TimelineItem.position` (Positions List position) and `TimelineItem.scroll` (scroll progression within a resource). For audiobooks, `position` (book-global seconds) is already populated on `publication.timeline` itself — audio publications don't need a navigator for this, since track durations come straight from the manifest.

### `augment(mapper)`

The mechanism behind all of the above: applies `mapper`'s returned patch to every item, resolving `position`, `scroll`, or `role` from data the mapper has access to. Each field the patch sets overwrites the item's current value, so calling `augment` again refreshes it with the latest data — e.g. after positions are recomputed following a reflow.

```ts
navigator.timeline.augment((item, link) => {
  const entry = positionsList.find(p => p.href === bareHref(link.href));
  if (!entry) return {};
  return { position: entry.locations.position, scroll: entry.locations.progression };
});
```

```ts
publication.timeline.depth = 2;   // limit visible tree depth at runtime
```

## Observing changes

Both `EpubNavigatorListeners` and `AudioNavigatorListeners` expose a `timelineItemChanged` callback. It fires whenever the active `TimelineItem` changes — not on every position tick, only when the item actually changes. It receives `undefined` when no item is active.

```ts
// EPUB
const listeners: EpubNavigatorListeners = {
  timelineItemChanged(item: TimelineItem | undefined): void {
    chapterTitle.textContent = item?.title ?? '';
  },
  // …
};

// Audio
const listeners: AudioNavigatorListeners = {
  timelineItemChanged(item: TimelineItem | undefined): void {
    chapterTitle.textContent = item?.title ?? '';
  },
  // …
};
```

Use this to keep chapter titles, breadcrumbs, or previous/next navigation in sync without polling. See `positionChanged` if you need every position tick.

## Methods

### `locate(locator)`

Returns the most specific `TimelineItem` covering the given locator's position.

- **Audio:** matches on the `#t=` NPT time fragment, returning the entry whose start time is ≤ the current time and closest to it.
- **EPUB (paginated):** matches on the HTML id fragment if present, then falls back to the best scroll progression match.
- **Fallback:** bare href match, returning the top-level item for the resource.

```ts
const item = navigator.timeline.locate(navigator.currentLocator);
console.log(item?.title);
```

This also covers hover inference within the current resource — build a **fresh** `Locator` for the hovered fraction (not derived from `currentLocator`, whose existing fragment/progression would otherwise take precedence over the one you're trying to set) and pass it in:

```ts
// EPUB: fraction maps directly to scroll progression.
progressBar.addEventListener('mousemove', (e) => {
  const fraction = e.offsetX / progressBar.clientWidth;
  const locator = new Locator({
    href: currentLocator.href,
    type: currentLocator.type,
    locations: new LocatorLocations({ progression: fraction }),
  });
  const hovered = navigator.timeline.locate(locator);
  tooltip.textContent = hovered?.title ?? '';
});
```

```ts
// Audio: fraction needs converting to an absolute NPT time first.
progressBar.addEventListener('mousemove', (e) => {
  const fraction = e.offsetX / progressBar.clientWidth;
  const time = fraction * audioDuration;
  const locator = new Locator({
    href: currentLocator.href,
    type: currentLocator.type,
    locations: new LocatorLocations({ fragments: [`t=${time}`] }),
  });
  const hovered = navigator.timeline.locate(locator);
  tooltip.textContent = hovered?.title ?? '';
});
```

### `navigableFrom(item)`

Returns `{ previous, next }` relative to the given item. Both values are `undefined` at the boundaries.

In `EpubNavigator`/`WebPubNavigator`, `navigator.timeline.navigableFrom()` is visibility-aware: rather than the item's immediate neighbors, it skips over the whole run of items currently visible on screen, anchoring `previous`/`next` on the ends of that visible run. `publication.timeline.navigableFrom()` is unaffected and always returns the item's immediate neighbors in the flattened timeline.

```ts
const { previous, next } = navigator.timeline.navigableFrom(currentItem);
prevButton.disabled = !previous;
nextButton.disabled = !next;
prevLabel.textContent = previous?.title ?? '';
nextLabel.textContent = next?.title ?? '';
```

### `segmentsForHref(href)`

Returns the timeline segments within a reading order resource: the item's children if it has any, otherwise the item itself. Use this to render a labelled progress bar.

```ts
const segments = navigator.timeline.segmentsForHref(locator.href);
renderProgressBar(segments);
```

### `ancestors(item)`

Returns the ordered ancestor path from root to the immediate parent of `item`. Empty array if the item is top-level.

```ts
const path = navigator.timeline.ancestors(currentItem);
breadcrumb.textContent = [...path, currentItem].map(a => a.title).join(' › ');
```

### `linkFor(item)`

Returns the source `Link` from the publication manifest that this item was built from. Useful when you need to navigate to the item's starting position.

```ts
const link = navigator.timeline.linkFor(item);
if (link) {
  const locator = publication.locatorFromLink(link);
  navigator.go(locator);
}
```

### `contextualizedToc`

Returns the publication's authored TOC hierarchy — unlike `TimelineItem`'s `children` (which only flatten TOC fragments one level, per reading-order resource), this mirrors `publication.toc` as declared, nested arbitrarily. Each entry is contextualized with a position (EPUB Positions List position), page number (PDF), or timestamp (audiobook), depending on the publication's profile. When a publication has no `toc` at all, falls back to one flat entry per reading-order item.

```ts
interface ContextualizedTocEntry {
  link: Link;
  position?: string;    // e.g. "42"
  timestamp?: string;   // e.g. "27:27"
  children?: ContextualizedTocEntry[];
}
```

```ts
function renderTocPanel(entries: ContextualizedTocEntry[], container: HTMLElement) {
  for (const entry of entries) {
    const row = document.createElement('div');
    row.textContent = `${entry.link.title ?? ''} ${entry.position ?? entry.timestamp ?? ''}`;
    container.appendChild(row);
    if (entry.children) {
      const nested = document.createElement('div');
      nested.style.paddingLeft = '1em';
      renderTocPanel(entry.children, nested);
      container.appendChild(nested);
    }
  }
}

renderTocPanel(navigator.timeline.contextualizedToc, document.getElementById('toc-panel')!);
```

### `tocEntryFor(item)`

Maps a `TimelineItem` (typically from `locate()` or the `timelineItemChanged` listener) to its `ContextualizedTocEntry`, so a TOC panel can highlight the current entry without re-implementing the cross-reference between the reading-order-derived `TimelineItem` and the authored TOC hierarchy. Falls back to the nearest preceding TOC entry for that resource when there's no exact match (e.g. a mid-resource audio position between chapter markers).

```ts
const listeners = {
  timelineItemChanged(item: TimelineItem | undefined): void {
    if (!item) return;
    const tocEntry = navigator.timeline.tocEntryFor(item);
    highlightTocEntry(tocEntry?.link);
  },
};
```

## Use Cases

### Running header (current chapter title)

Keep a header in sync with reading position using `timelineItemChanged`:

```ts
const listeners = {
  timelineItemChanged(item: TimelineItem | undefined): void {
    document.getElementById('chapter-header').textContent = item?.title ?? '';
  },
};
```

### Previous / Next chapter navigation

```ts
let currentItem: TimelineItem | undefined;

const listeners = {
  timelineItemChanged(item: TimelineItem | undefined): void {
    currentItem = item;
    if (!item) return;

    const { previous, next } = navigator.timeline.navigableFrom(item);
    prevChapterButton.disabled = !previous;
    nextChapterButton.disabled = !next;
    prevChapterLabel.textContent = previous?.title ?? '';
    nextChapterLabel.textContent = next?.title ?? '';
  },
};

prevChapterButton.addEventListener('click', () => {
  if (!currentItem) return;
  const { previous } = navigator.timeline.navigableFrom(currentItem);
  if (!previous) return;
  const link = navigator.timeline.linkFor(previous);
  if (link) navigator.go(publication.locatorFromLink(link));
});
```

### Progress bar with chapter segments

Render chapter boundaries as tick marks on a progress bar, and show which chapter the user would land in when they hover:

```ts
function renderProgressBar(locator: Locator, duration: number) {
  const segments = navigator.timeline.segmentsForHref(locator.href);
  const container = document.getElementById('progress-bar');

  // Render chapter ticks
  container.innerHTML = '';
  segments.forEach((segment, i) => {
    const tick = document.createElement('div');
    tick.className = 'chapter-tick';

    if (duration > 0) {
      // Audio: use start time
      const link = navigator.timeline.linkFor(segment);
      const time = parseTimeFromHref(link?.href ?? '');
      tick.style.left = `${(time / duration) * 100}%`;
    } else {
      // EPUB: evenly spaced (or use segment.scroll if available)
      tick.style.left = `${(i / segments.length) * 100}%`;
    }

    container.appendChild(tick);
  });
}

// Hover tooltip
progressBar.addEventListener('mousemove', (e) => {
  const fraction = e.offsetX / progressBar.clientWidth;
  const locator = new Locator({
    href: currentLocator.href,
    type: currentLocator.type,
    locations: duration > 0
      ? new LocatorLocations({ fragments: [`t=${fraction * duration}`] })
      : new LocatorLocations({ progression: fraction }),
  });
  const hovered = navigator.timeline.locate(locator);
  tooltip.textContent = hovered?.title ?? '';
  tooltip.style.left = `${e.offsetX}px`;
});
```

### Breadcrumb

Show the full structural path to the current item:

```ts
const listeners = {
  timelineItemChanged(item: TimelineItem | undefined): void {
    if (!item) {
      breadcrumb.textContent = '';
      return;
    }
    const path = navigator.timeline.ancestors(item);
    breadcrumb.textContent = [...path, item].map(a => a.title).join(' › ');
  },
};
```

### Grouping search results by chapter

```ts
function groupResultsByChapter(locators: Locator[]): Map<string, Locator[]> {
  const groups = new Map<string, Locator[]>();

  for (const locator of locators) {
    const item = navigator.timeline.locate(locator);
    const key = item?.title ?? 'Unknown';
    const existing = groups.get(key) ?? [];
    existing.push(locator);
    groups.set(key, existing);
  }

  return groups;
}
```

### Contextualizing bookmarks and highlights

Attach chapter context when saving annotations:

```ts
function saveHighlight(locator: Locator, text: string) {
  const item = navigator.timeline.locate(locator);
  const chapterTitle = item?.title;
  const tocEntry = item && navigator.timeline.tocEntryFor(item);
  const chapterPosition = tocEntry?.position ?? tocEntry?.timestamp;

  db.saveHighlight({ locator, text, chapterTitle, chapterPosition });
}
```

## Complete Example — EPUB Chapter Navigation UI

```ts
import { EpubNavigator, EpubNavigatorListeners, Locator, LocatorLocations, TimelineItem } from "@readium/navigator";

let currentItem: TimelineItem | undefined;

const listeners: EpubNavigatorListeners = {
  positionChanged(locator: Locator): void {
    const progression = locator.locations.progression ?? 0;
    (document.getElementById('progress') as HTMLInputElement).value = String(progression);
  },

  timelineItemChanged(item: TimelineItem | undefined): void {
    currentItem = item;

    // Running header
    document.getElementById('chapter-title')!.textContent = item?.title ?? '';

    if (!item) return;

    // Previous / Next labels
    const { previous, next } = navigator.timeline.navigableFrom(item);
    (document.getElementById('prev-chapter') as HTMLButtonElement).disabled = !previous;
    (document.getElementById('next-chapter') as HTMLButtonElement).disabled = !next;
    document.getElementById('prev-label')!.textContent = previous?.title ?? '';
    document.getElementById('next-label')!.textContent = next?.title ?? '';

    // Breadcrumb
    const path = navigator.timeline.ancestors(item);
    document.getElementById('breadcrumb')!.textContent =
      [...path, item].map(a => a.title).join(' › ');
  },

  // …other required listeners
};

const navigator = new EpubNavigator(container, publication, listeners, positions);

// Chapter navigation
document.getElementById('prev-chapter')!.addEventListener('click', () => {
  if (!currentItem) return;
  const { previous } = navigator.timeline.navigableFrom(currentItem);
  if (!previous) return;
  const link = navigator.timeline.linkFor(previous);
  if (link) navigator.go(publication.locatorFromLink(link));
});

document.getElementById('next-chapter')!.addEventListener('click', () => {
  if (!currentItem) return;
  const { next } = navigator.timeline.navigableFrom(currentItem);
  if (!next) return;
  const link = navigator.timeline.linkFor(next);
  if (link) navigator.go(publication.locatorFromLink(link));
});
```

## Complete Example — Audio Chapter Segments

```ts
import { AudioNavigator, AudioNavigatorListeners, Locator, LocatorLocations, TimelineItem } from "@readium/navigator";

let audioDuration = 0;
let currentLocator: Locator | undefined;

const listeners: AudioNavigatorListeners = {
  metadataLoaded(metadata): void {
    audioDuration = metadata.duration;
    if (currentLocator) renderSegments(currentLocator.href);
  },

  positionChanged(locator: Locator): void {
    currentLocator = locator;
    const progression = locator.locations.progression ?? 0;
    (document.getElementById('progress') as HTMLInputElement).value = String(progression);
  },

  timelineItemChanged(item: TimelineItem | undefined): void {
    document.getElementById('chapter-title')!.textContent = item?.title ?? '';

    if (!item) return;
    const { previous, next } = navigator.timeline.navigableFrom(item);
    document.getElementById('prev-label')!.textContent = previous?.title ?? '';
    document.getElementById('next-label')!.textContent = next?.title ?? '';
  },

  // …other required listeners
};

const navigator = new AudioNavigator(publication, listeners);

function renderSegments(href: string) {
  const segments = navigator.timeline.segmentsForHref(href);
  const bar = document.getElementById('chapter-ticks')!;
  bar.innerHTML = '';

  segments.forEach(segment => {
    const tick = document.createElement('div');
    tick.className = 'tick';
    const link = navigator.timeline.linkFor(segment);
    if (link) {
      const t = parseNptFromHref(link.href);
      if (t !== undefined && audioDuration > 0) {
        tick.style.left = `${(t / audioDuration) * 100}%`;
        tick.title = segment.title;
        bar.appendChild(tick);
      }
    }
  });
}

// Hover tooltip
document.getElementById('progress')!.addEventListener('mousemove', (e) => {
  if (!currentLocator) return;
  const el = e.currentTarget as HTMLInputElement;
  const fraction = e.offsetX / el.clientWidth;
  const time = fraction * audioDuration;
  const locator = new Locator({
    href: currentLocator.href,
    type: currentLocator.type,
    locations: new LocatorLocations({ fragments: [`t=${time}`] }),
  });
  const hovered = navigator.timeline.locate(locator);
  document.getElementById('hover-tooltip')!.textContent = hovered?.title ?? '';
});
```
