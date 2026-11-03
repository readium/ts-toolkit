# Decorator tests

Visual tests for the decoration renderer, served from the workspace sources, so no package needs building first.

## Manual

```sh
pnpm test:serve
```

- `index.html` is an explorer: pick a style, writing mode, direction, column count and zoom, and the URL keeps them so a case can be shared. `--host` exposes it on the local network to test on mobile devices.
- `grid.html?type=<type>` renders every layout, width and line style of one decoration type, on plain text and on text with `sup`, `code` and ruby. These are the pages the automated tests screenshot. It also takes `wm` (writing mode), `dir=rtl` and `zoom`. With `cols` (paginated columns), it shows a single case in column 2, picked with `layout` and `width`.

## Automated

[Playwright](https://playwright.dev) screenshots the grids in Chromium, Firefox and WebKit.

- `<type>.spec.ts` has one test per writing mode (horizontal, vertical-rl, vertical-lr, RTL). Each checks one screenshot per layout × width, cropped to its cases: every line style, `expand` and `thickness` variant of that combination. They are stored as `snapshots/<browser>/<type>/<writing mode>/<layout>-<width>.png`.
- `columns.spec.ts` checks one case per screenshot in a paginated two-column document, for Page and Viewport widths.
- `scroll.spec.ts` checks outline and mask with the document scrolled halfway.
- `zoom.spec.ts` runs the type grids at zoom 2, in Chromium only, as zoom is only compensated for in Blink.

```sh
pnpm exec playwright install chromium firefox webkit
pnpm test
```

Reference screenshots in `snapshots/` are only generated and compared in CI, since fonts and antialiasing differ between platforms. Local runs compare against `snapshots/local/` instead, which is ignored by git; run `pnpm test:update` to create or refresh it.

To update the CI references after an intentional change, run the “Decorator update snapshots” workflow on the branch.
