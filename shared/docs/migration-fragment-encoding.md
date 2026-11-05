# Migration: percent-encoded locator fragments

Following [readium/architecture#198](https://github.com/readium/architecture/pull/198), each fragment in `locations.fragments` is percent-encoded, as it appears in a URI, and has no `#` prefix. A structured fragment, such as a text fragment, is split on its delimiters before its components are decoded.

| Target | Fragment |
|---|---|
| Element with the id `café noir` | `caf%C3%A9%20noir` |
| The text `Yes, please` | `:~:text=Yes%2C%20please` |

## Stored locators

Nothing to do. Fragments that are percent-encoded, decoded (`café noir`) or `#`-prefixed (`#café noir`) all resolve to the same element.

## `getHtmlId`

`getHtmlId` now returns the decoded id.

```ts
// Before
getHtmlId(locations) // "caf%C3%A9%20noir"

// After
getHtmlId(locations) // "café noir"
```

- Don't decode its result again.
- Encode it with `encodeURIComponent` when building a URL from it.

## Comparing locators

A locator stored before this change may hold a decoded id, while a new one holds the encoded id, so their `fragments` differ as strings. To tell whether two locators point to the same element, compare their ids:

```ts
// Before
a.locations.fragments[0] === b.locations.fragments[0]

// After
getHtmlId(a.locations) === getHtmlId(b.locations)
```

## Building locators

Encode ids with `encodeURIComponent`, without `#`. This includes locators passed to `@readium/decorator`.

```ts
new LocatorLocations({ fragments: [encodeURIComponent(element.id)] })
```
