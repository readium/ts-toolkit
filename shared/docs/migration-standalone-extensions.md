# Migration: prototype augmentation → standalone functions

`@readium/shared` previously extended its core models with format-specific methods by patching their prototypes at module load time. The build has been rewritten to enable tree-shaking, which is incompatible with prototype augmentation — augmentation modules are side-effect-only and cannot survive `sideEffects: false`. All augmentations have therefore been replaced with exported standalone functions.

The call-site change is mechanical: pass the instance as the first argument instead of calling a method on it.

```ts
// Before
loc.time()
locations.getCssSelector()

// After
import { getTime, getCssSelector } from "@readium/shared";
getTime(loc)
getCssSelector(locations)
```

## Full mapping

### HTML — `LocatorLocations` (`@readium/shared/html`)

| Before | After |
|---|---|
| `loc.getCssSelector()` | `getCssSelector(loc)` |
| `loc.getPartialCfi()` | `getPartialCfi(loc)` |
| `loc.getDomRange()` | `getDomRange(loc)` |
| `loc.fragmentParameters()` | `getFragmentParameters(loc)` |
| `loc.htmlId()` | `getHtmlId(loc)` |
| `loc.page()` | `getPage(loc)` |
| `loc.time()` | `getTime(loc)` |
| `loc.space()` | `getSpace(loc)` |

### EPUB — `Properties` (`@readium/shared/epub`)

| Before | After |
|---|---|
| `properties.getContains()` | `getContains(properties)` |

### EPUB — `Publication` (`@readium/shared/epub`)

| Before | After |
|---|---|
| `pub.getPageList()` | `getPageList(pub)` |
| `pub.getLandmarks()` | `getLandmarks(pub)` |
| `pub.getListOfAudioClips()` | `getListOfAudioClips(pub)` |
| `pub.getListOfIllustrations()` | `getListOfIllustrations(pub)` |
| `pub.getListOfTables()` | `getListOfTables(pub)` |
| `pub.getListOfVideoClips()` | `getListOfVideoClips(pub)` |

### EPUB — `Metadata` (`@readium/shared/epub`)

| Before | After |
|---|---|
| `metadata.getMediaOverlay()` | `getMediaOverlay(metadata)` |

### OPDS — `Properties` (`@readium/shared/opds`)

| Before | After |
|---|---|
| `properties.getNumberOfItems()` | `getNumberOfItems(properties)` |
| `properties.getPrice()` | `getPrice(properties)` |
| `properties.getIndirectAcquisitions()` | `getIndirectAcquisitions(properties)` |
| `properties.getHolds()` | `getHolds(properties)` |
| `properties.getCopies()` | `getCopies(properties)` |
| `properties.getAvailability()` | `getAvailability(properties)` |
| `properties.getAuthenticate()` | `getAuthenticate(properties)` |

### OPDS — `Publication` (`@readium/shared/opds`)

| Before | After |
|---|---|
| `pub.getImages()` | `getImages(pub)` |

### Encryption — `Properties` (`@readium/shared/encryption`)

| Before | After |
|---|---|
| `properties.encryption` | `getEncryption(properties)` |

Note: `encryption` was a property accessor, not a method. It is now `getEncryption(properties)`.

## Imports

All functions are available from the main barrel or from the relevant subpath:

```ts
import { getTime, getCssSelector } from "@readium/shared";
// or
import { getTime, getCssSelector } from "@readium/shared/html";
```
