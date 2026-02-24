# Readium Web

Next generation SDK for publications in Web Apps

## Usage

Three packages are made available by this repository, which are published on NPM.
They are:
- [@readium/shared](https://www.npmjs.com/package/@readium/shared)
- [@readium/navigator-html-injectables](https://www.npmjs.com/package/@readium/navigator-html-injectables)
- [@readium/navigator](https://www.npmjs.com/package/@readium/navigator)

# Development

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

## Local Development in a test app

If you want to develop locally, you have two simpler options:

- Using the `file:` syntax
- Using `pnpm link`

### Using file: syntax

You can use the `file:` syntax to link the packages to your project. This is useful for testing changes in a real application.

```json
{
  "dependencies": {
    "@readium/shared": "file:path/to/ts-toolkit/shared",
    "@readium/navigator-html-injectables": "file:path/to/ts-toolkit/navigator-html-injectables",
    "@readium/navigator": "file:path/to/ts-toolkit/navigator"
  }
}
```

Then run:

```sh
pnpm install
```

Your modifications to the packages will now be reflected in your project, although you may have to restart your development server to see the changes, or reload your IDE window to pick up the type changes.

### Using pnpm link

When developing locally, you can [link these packages to your project](https://pnpm.io/cli/link) for testing changes in a real application. Here's how to set it up:

1. First, build all packages in the correct order:

```sh
cd shared && pnpm build && cd ..
cd navigator-html-injectables && pnpm build && cd ..
cd navigator && pnpm build && cd ..
```

2. Make the packages available globally for linking:

```sh
cd shared && pnpm link --global && cd ..
cd navigator-html-injectables && pnpm link --global && cd ..
cd navigator && pnpm link --global && cd ..
```

Then proceed with either Method 1 or Method 2 below.

#### Method 1: Adding packages to package.json

If you don't already have the packages in your project's dependencies, add the packages to your `package.json`:

```json
{
  "dependencies": {
    "@readium/shared": "link:../ts-toolkit/shared",
    "@readium/navigator-html-injectables": "link:../ts-toolkit/navigator-html-injectables",
    "@readium/navigator": "link:../ts-toolkit/navigator"
  }
}
```

Then install the dependencies:

```sh
# In your project directory
pnpm install
```

You can now modify the source code of the linked package, and the changes will be reflected in your project on re-build.

#### Method 2: Linking existing dependencies

If you already have the packages in your project's dependencies (e.g., `"@readium/shared": "^2.0.0"`):


In your project directory, link each package:

```sh
# In your project directory
pnpm link @readium/shared @readium/navigator-html-injectables @readium/navigator
```

You can now modify the source code of the linked package, and the changes will be reflected in your project on re-build.

When you're done testing and want to unlink the packages and restore the original versions:

```sh
# In your project directory
pnpm unlink @readium/shared @readium/navigator-html-injectables @readium/navigator
pnpm install
```