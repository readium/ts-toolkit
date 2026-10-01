# Guided Navigation Test Fixtures

This directory is a language-agnostic conformance test suite for two pipeline
stages:

1. **HTML parsing** — reading a document or fragment of HTML/XHTML.
2. **Guided Navigation (GND) generation** — mapping the parsed HTML
   onto the [Guided Navigation](https://github.com/readium/guided-navigation)
   role vocabulary defined in
   [`roles.md`](https://github.com/readium/guided-navigation/blob/main/roles.md).

[`@readium/speech`](https://github.com/readium/speech) extends it with
expected utterances for each fixture.

Fixtures here are **plain files on disk** (HTML + JSON) — not code. Any
platform (TypeScript, Kotlin, Swift, ...) can consume them with nothing more
than a JSON parser and a file reader. There is no query language, template
system, or fixture-specific code to learn.

## Directory layout

```
fixtures/
  README.md              this file
  manifest.json          flat index of every fixture, for discovery without a filesystem walk (generated — do not hand-edit)
  ROLES_COVERAGE.md       flat list of every role covered and its fixtures (generated — do not hand-edit)
  <fixture-id>/
    meta.json             fixture metadata
    input.html             the input markup as HTML (a fragment or a full document, see meta.json.inputKind);
                            or input.xhtml when the fixture's content is XHTML (all *-epub-type fixtures)
    gnd.json               the expected Guided Navigation object(s) produced from the input file:
                            one object, or `{ "children": [...] }` for several top-level siblings
```

`manifest.json` and `ROLES_COVERAGE.md` are both generated from the
`meta.json` files on disk by `scripts/build-fixtures-manifest.js`
(`pnpm run generate-fixtures-manifest`) — the filesystem is the source of
truth, not either of these files. Never hand-edit them; run the script
instead.

[roles.md](https://github.com/readium/guided-navigation/blob/main/roles.md)
was the seed used to originally populate this suite — it is not something
this suite continues to track itself against. Its tier/table categorization
does not appear anywhere in `meta.json`, `manifest.json`, or
`ROLES_COVERAGE.md` — only `role` does, since that's the actual content type
being tested (a "footnote", a "list", ...), not a classification scheme.

Each fixture directory is fully self-contained and independently loadable.

## Fixture granularity

**One fixture = one distinct, scoped behavior.** Concretely:

- **One fixture per role, per distinct HTML encoding.** roles.md documents
  up to three ways of expressing a role: a native HTML element, an explicit
  ARIA role (`role="doc-..."` or a plain ARIA role), and an EPUB `epub:type`
  attribute. Every one of these is a separate code path through stage 1
  (HTML parsing), even when two encodings produce an identical GND result —
  so each gets its own fixture, distinguished by its id/description and
  visible directly in its `input.html` (e.g. `list-html-native` vs.
  `list-role-aria` vs. `list-epub-type`). This isn't tracked as a field in
  `meta.json` — it's not information a consumer needs to look up, just a
  reason more than one fixture exists for the same role.
- **Trivial repetition is bundled into one fixture.** `heading1`...`heading6`
  are the same pathway repeated at six depths, not six distinct behaviors —
  they live together in one `heading-*` fixture. Multiple `<li>` inside one
  `<ul>` is one `list-*` fixture, not one per item.

## `meta.json` schema

```jsonc
{
  "id": "footnote-epub-type",             // must match the directory name
  "description": "Footnote encoded via epub:type, referenced by a noteref",
  "role": "footnote",                     // the roles.md role name this fixture targets
  "rolesCovered": ["footnote", "noteref"],// every role name this fixture's markup exercises
  "sourceRef": "https://github.com/readium/guided-navigation/blob/main/roles.md",
  "inputKind": "document"                 // "fragment" | "document"
}
```

`role` is a roles.md role name for the vast majority of fixtures — one
covering a concern that cuts across roles rather than targeting one, such
as language resolution, instead uses a short pseudo-role naming that
concern (e.g. `"language"`) not found in roles.md. `rolesCovered` still lists the real roles.md role(s) the
fixture's markup exercises, so that coverage tracking in
`ROLES_COVERAGE.md` stays accurate either way.

## `gnd.json` and the Guided Navigation schema

Every object in `gnd.json` is valid against the
[Guided Navigation schema](https://readium.org/guided-navigation/schema/document.schema.json):
`text` is always a text object (`{ "plain": ... }`), `description` a
description object (`{ "text": { "plain": ... } }`), and every object has
at least one of `audioref`, `imgref`, `textref`, `videoref`, `text` or
`children`.

`textref` values generated from the markup (`#id`, `#css(...)`) depend on
each implementation's selector generator, so they aren't compared. They
only appear in `gnd.json` where the schema requires them, e.g. a
`separator` or a `math` element with no text of its own.

## `epub:type` fixtures are full XHTML documents

`epub:type` is only meaningful in XHTML with the `epub` namespace declared on
the document root — it is **not** a plain-HTML attribute, and there is no
"parse it as a literal attribute name in an HTML5 document" fallback: real
EPUB reading systems parse content documents as namespace-aware XHTML. Every
`*-epub-type` fixture therefore has `inputKind: "document"` and its
`input.xhtml` is a complete document:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head><meta charset="utf-8"/><title>Fixture</title></head>
<body>
  <div epub:type="chapter">...</div>
</body>
</html>
```

By contrast, `role-aria` and `html-native` fixtures stay as bare fragments
(`inputKind: "fragment"`) since ARIA roles and native HTML elements don't
require any namespace declaration.

## Navigational-list roles

Roles whose roles.md definition is "a list of links to X" or "a collection
of X" (`landmarks`, `loa`, `loi`, `lot`, `lov`, `pagelist`, `toc`, `index`,
`bibliography`, `glossary`, `endnotes`, `credits`) are modeled as an actual
`list`/`listItem` structure, not a flat text blob — because that's what they
are. A `listItem` that links to a target elsewhere in the work carries a
`textref` alongside its visible `text`, reusing the same field the
footnote/endnote fixtures already use for cross-references:

```jsonc
{ "role": ["listItem"], "text": { "plain": "Cover" }, "textref": "cover.xhtml" }
```

## `manifest.json`

A flat JSON array, one entry per fixture:

```jsonc
[
  {
    "id": "footnote-epub-type",
    "dir": "footnote-epub-type",
    "role": "footnote",
    "description": "Footnote encoded via epub:type, referenced by a noteref",
    "files": {
      "input": "input.xhtml",
      "gnd": "gnd.json"
    }
  }
]
```

Any test runner, in any language, reads this one file to discover every
fixture and resolve its file paths — no directory listing required.

## Consuming a fixture (any platform)

1. Read `manifest.json`, iterate its entries.
2. For each entry, read `files.input` (`input.html` or `input.xhtml`) and run
   it through your implementation of HTML → GND.
3. Compare the result to `gnd.json`, ignoring `textref` values generated
   from the markup (see above).

## Adding a new fixture

1. `mkdir fixtures/<id>` and hand-write `input.html` (or `input.xhtml` for an
   `epub:type` fixture, since `epub:type` requires XHTML — see above) for the
   specific markup being tested.
2. Hand-author `gnd.json` — the ground truth implementations must match.
3. Write `meta.json`.
4. Run `pnpm run generate-fixtures-manifest` to regenerate `manifest.json`
   and `ROLES_COVERAGE.md` from what's now on disk.

## This suite is not finished

New roles, new encodings, and new real-world edge cases get added to
`fixtures/` as they're encountered — this is a living suite, not a fixed
checklist against any external document.
