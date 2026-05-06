# Timeline

> **This API is in active development and will evolve.** Behaviour, method signatures, and the shape of `TimelineItem` are subject to change without notice until this notice is removed.

A `Timeline` is built from a publication's reading order and table of contents. It is available directly on the publication and is the single source of truth for structure and position queries.

## How it is built

**The reading order is the source of truth.** Every item in the reading order becomes exactly one top-level `TimelineItem`. The TOC is consulted only to enrich those items — never to introduce new top-level entries and never to impose its own hierarchy on them.

### Title resolution (per reading order item)

Tried in order, first match wins:

1. The reading order item's own `title`.
2. A TOC entry whose href is the start of that resource — bare href with no fragment, or `#t=0` for audio (both are treated as equivalent).
3. If exactly one fragment-based TOC entry references this resource, its title.
4. A positional placeholder (`Resource N`) when no title can be reliably derived.

### Children

All TOC entries that reference a reading order resource become **flat** children of the corresponding timeline item, in TOC declaration order. No parent-child relationships within the TOC are reconstructed — that inference requires role context and will be implemented in a future iteration.

Start-of-resource TOC entries (bare href or `#t=0`) are excluded from children; they serve title resolution only.

TOC entries whose href does not match any reading order item are ignored entirely.

### Depth

The `depth` option passed to `Timeline.build` limits how many levels deep into the TOC hierarchy the builder looks — for both title resolution and child collection. Level 1 means only top-level TOC entries; level 2 adds their children; and so on. `undefined` means no limit.

## Access

```js
publication.timeline  // lazy, cached on first access
navigator.timeline    // delegates to publication.timeline
```

## Depth (runtime)

The `depth` setter limits the visible tree at query time. All queries respect it. Unset means unlimited.

```js
publication.timeline.depth = 2;

publication.timeline.items           // depth-2 tree
publication.timeline.locate(locator) // respects depth
```

Setting the same depth again is a no-op. Setting a different depth invalidates the cache and recomputes.

## Observing changes

The optional `timelineItemChanged` listener fires whenever the active `TimelineItem` changes — not on every position tick. See [Customizing Listeners](./CustomizingListeners.md#timelineitemchanged) for details and an example.

## Methods

### `locate(locator)`

Returns the most specific `TimelineItem` covering the given locator's position. For audio, matches on the time fragment; falls back to bare href.

```js
const item = publication.timeline.locate(navigator.currentLocator);
```

### `adjacentTo(item)`

Returns `{ previous, next }` relative to the given item in the flat timeline.

```js
const { previous, next } = publication.timeline.adjacentTo(current);
```

### `segmentsForHref(href)`

Returns the timeline segments within a reading order resource. Returns the item itself if it has no children. Use this to render a labelled progress bar.

```js
const segments = publication.timeline.segmentsForHref(locator.href);
```

### `itemAtProgression(href, progression, duration?)`

Returns the item that best corresponds to a progression (0–1) within a resource. Pass `duration` in seconds for time-based resolution. Use this for tooltip inference on hover.

```js
const hovered = publication.timeline.itemAtProgression(href, hoverFraction, resourceDuration);
tooltip.textContent = hovered.title;
```

### `ancestors(item)`

Returns the ordered ancestor path from root to the immediate parent of `item`. Empty if top-level.

```js
const path = publication.timeline.ancestors(current);
breadcrumb.textContent = path.map(a => a.title).join(' › ');
```

### `linkFor(item)`

Returns the source `Link` the item was built from.

```js
const link = publication.timeline.linkFor(item);
```
