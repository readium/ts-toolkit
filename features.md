# Feature List

## Publication Formats

Supported publication formats include EPUB formats and Audiobooks.

- Reflowable
- Fixed Layout
- Audiobook

## Visual Rendition

EPUB content is presented visually in paginated and/or scrolling layouts.

Content can be pre-paginated and with a fixed flow, as a *Fixed Layout* page. 

![Fixed Layout - Double Page](images/Fixed&#32;Layout&#32;-&#32;Double&#32;Page.png)

Content can have an adaptive flow, as a *Reflowable* document.

![Reflow - Double Column](images/Reflow&#32;-&#32;Double&#32;Column.png)

Reflowable content is fragmented and overlow applies when it doesn't fit in a single view (or screen).

![Reflow - Single Column](images/Reflow&#32;-&#32;Single&#32;Column.png)

Reflowable content is paginated dynamically, where a "page dimension" is bound to the view size.

- Layout
  - Single spread only
  - Multi spread possible
- Overflow
  - Paginate
  - Document scroll
  - Continuous, multi-doc scroll
  - Scroll axis
  
## Media Playback

Audiobooks are reproduced in non-visual ways.

Besides the cover art display for a track, there is no concern for rendering visual content.

Progression is mapped to time points instead of a visual points.

Playback runs as a continuous track, which can be stopped or paused.

- Time based progression
- Play / pause control
- No visual content rendering

## Optimization
- Visual pre-render
- Resource pre-load
- Offline caching
- Web security policy
- Rights management

## Visual
- Page-turn transitions
- Zoom, scale, fit
- Page numbering
- Footnotes
- Error alerts

## Interaction
- Page-turn gestures
- Selection actions
- Zoom gestures
- Tap zones (left / center / right)
- Bookmarks
- Table of contents
- Open external links

## User Settings
- Visual
  - Font size
  - Font face
  - Text alignment
  - Line-height
  - Margin size
  - Reading mode (themes)
  - Columns
  - Scrolling
- Media
  - Playback speed
  - Volume

## Accessibility
- WCAG Compliance (A, AA, or AAA)
- UI accessibility
- Content material accessibility
- Keyboard shortcuts
- Screen readers

## State Persistence
- Last location restore (last read page)
- User setting preferences
- Bookmark as perma-link URL
