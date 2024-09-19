# Readium Web

Next generation SDK for publications in Web Apps

## Install

You need `pnpm` installed as this is a monorepo using workspaces.

To install pnpm using node:

```sh
npm install -g pnpm
```

Note there are [several other options](https://pnpm.io/installation) if needed.

To install all dependencies:

```sh
pnpm install
```

Then workspaces should be all set up and you can build them from their directory in the following order:

1. shared
2. navigator-html-injectables
3. navigator

## Workspaces

- [Shared](./shared/): shared models to be used across other Readium projects and implementations in Typescript.
- [Navigator](./navigator/): a navigator for web platforms based on the readium Navigator spec.
- [Navigator-html-injectables](./navigator-html-injectables/): provides access and control over a resource from a navigator on any modern browser or embedded browser frame.
- [Testapp/vanilla](./testapp/vanilla/): an example of how to use the ts-toolkit.