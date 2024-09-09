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

It will output 2 files (`index.mjs` and `index.umd.js`) in `dist`.

To check the size limit: 

```sh
# Check ths size limit is not exceeded
pnpm run size
```