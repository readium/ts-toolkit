# shared

Shared models to be used across other Readium projects and implementations in Typescript.

To test: 

```sh
# Run the Jest tests
pnpm run test
```

It will output the results in your shell.

To build: 

```sh
pnpm run build
```

It will output 6 files (`shared.js` and `shared.umd.cjs`, `fetcher.js` and `fetcher.cjs`) in `dist`.

To check the size limit: 

```sh
# Check ths size limit is not exceeded
pnpm run size
```