# navigator

A navigator for web platforms based on the readium Navigator spec. Work is primarily based on the [kotlin toolkit](https://github.com/readium/kotlin-toolkit/tree/develop/readium/navigator/src/main/java/org/readium/r2/navigator), but adapted for the needs of the web.

> [!WARNING]
> Breaking changes can ship in minor versions. Patch versions never contain breaking changes. Use a tilde range (`~x.y.z`) rather than a caret range, and check the changelog before upgrading to a new minor version.

To build:

```sh
pnpm run build
```

It will output 2 files (`index.js` and `index.umd.cjs`) in `dist`.
