# shared

Shared models to be used across other Readium projects and implementations in Typescript.

> [!WARNING]
> Breaking changes can ship in minor versions. Patch versions never contain breaking changes. Use a tilde range (`~x.y.z`) rather than a caret range, and check the changelog before upgrading to a new minor version.

To test: 

```sh
# Run the Jest tests
pnpm run test
```

It will output the results in your shell.

Locale files from [edrlab/thorium-locales](https://github.com/edrlab/thorium-locales) are vendored in `src/locales/` and must be present before building. Update them when upstream changes:

```sh
pnpm run update-locales
```

This fetches all available locale files from the upstream repository and runs a coverage check.

To build: 

```sh
pnpm run build
```

It will output files in `dist`.
