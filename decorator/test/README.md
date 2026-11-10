# Decorator tests

Visual tests for the decoration renderer, served from the workspace sources, so no package needs building first.

## Manual

```sh
pnpm test:serve
```

- `index.html` is an explorer: pick a style, writing mode, direction, column count and zoom, and the URL keeps them so a case can be shared. `--host` exposes it on the local network to test on mobile devices.
- `grid.html?type=<type>` renders every layout, width and line style of one decoration type, on plain text and on text with `sup`, `code` and ruby. These are the pages the automated tests screenshot. It also takes `wm` (writing mode), `dir=rtl`, `zoom`, `positioned` (a positioned root element) and `activatable` (records activated decorations in `window.activatedDecorations`). With `cols` (paginated columns), it shows a single case in column 2, picked with `layout` and `width`.
- `chapter.html?type=<type>` paginates the first chapter of _Moby-Dick_ in two columns and decorates the first paragraph split across them. It takes `layout`, `width`, `cols` and `events` (records decoration events in `window.decorationEvents`).
- `layouts.html` decorates tables, flex rows, floats and text across columns, in a paginated root with `cols`, and otherwise in multi-column elements: through an element, the whole element by its selector, across a spanning element, right-to-left and vertical. It takes `type`, `layout` and `width`.

## Automated

[Playwright](https://playwright.dev) screenshots the grids in Chromium, Firefox and WebKit.

- `<type>.spec.ts` has one test per writing mode (horizontal, vertical-rl, vertical-lr, RTL). Each checks one screenshot per layout × width, cropped to its cases: every line style, `expand` and `thickness` variant of that combination. They are stored as `snapshots/<browser>/<type>/<writing mode>/<layout>-<width>.png`.
- `columns.spec.ts` checks one case per screenshot in a paginated two-column document, for Page and Viewport widths.
- `chapter.spec.ts` checks one decoration per screenshot across two columns, for every layout × width.
- `layouts.spec.ts` checks the layouts page with a Bounds layout outline and a Bounds width highlight, which must cover each column on its own and nothing else.
- `scroll.spec.ts` checks outline and mask with the document scrolled halfway.
- `activation.spec.ts` clicks a decoration and its heading, unscrolled and scrolled halfway, and checks that only the decoration is activated. It also hovers and clicks each column's part of the chapter's decoration, and checks that every event reports the box of that part.
- `zoom.spec.ts` runs the type grids at zoom 2, in Chromium only, as zoom is only compensated for in Blink.

```sh
pnpm exec playwright install chromium firefox webkit
pnpm test
```

Reference screenshots in `snapshots/` are only generated and compared in CI, since fonts and antialiasing differ between platforms. Local runs compare against `snapshots/local/` instead, which is ignored by git; run `pnpm test:update` to create or refresh it.

In CI, a screenshot without a reference is written instead of failing, and every run uploads `snapshots/` as the `decorator-snapshots` artifact. To add references, commit the new files from that artifact. To update them after an intentional change, run the “Decorator update snapshots” workflow on the branch: it opens a pull request into that branch with the new references.
