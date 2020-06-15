# Project Structure

* Authors: [jccr](https://github.com/jccr)
* Review PR: [#1](https://github.com/readium/web/pull/1)
* Implementation PRs:
  * TBD
* Related Issues:
  * (none)


## Summary

This is a proposal for a project structure for Readium Web. This structure will be designed for the development of a JavaScript project for Readium. It will organize the repository of source code and other assets, and facilitate the necessary tasks of building, testing, and releasing the project. These tasks will be defined in workflows that could be automated in CI/CD. Additionally it will set the styles and conventions for the code and commit messages.


## Motivation

The contributors to Readium Web want the project to be a monorepo of modules.

This motivation comes from previously maintaining a set of projects in multiple repositories with disadvantages such as a duplicated structure and increased complexity when developing with the full set of projects together.

A monorepo would have all the sources of truth (for code, tests, tools, config, workflows) in one location. Which would mean a single clone, a single build task, a single repository to iterate in and refactor code that easily spans the whole project in one go.

To achieve success in producing modules, a monorepo project structure needs to facilitate the isolation of code for each module. This ties in well with the motivation of wanting to build, test and publish these modules as individual packages.

Another motivation expressed by the contributors is with having a consistent code style for the project.
With a monorepo, the tooling for linting and formatting of the code could be added in as an additional source of truth.

The project structure should scale and be flexible enough for the current motivations, and for future needs. For example:
- Generating API documentation
  - Generating a markdown or HTML site from doc comments in the code.
- Commit messages based on conventions
  - Linting commit messages
- Generating changelog(s)
  - Generated automatically from conventional commit messages 
- Continuous Integration, Deployment, and/or Delivery


## Developer Guide

TODO: Explain the structure and features for the developer experience.


## Reference Guide

### Structure

```
.
├── .editorconfig
├── .eslintignore
├── .eslintrc.js
├── .github
│   └── workflows
│       ├── build.yml
│       ├── lint.yml
│       └── test.yml
├── .gitignore
├── .lintstagedrc
├── .npmrc
├── .prettierrc
├── CHANGELOG.md
├── commitlint.config.js
├── karma.config.js
├── lerna.json
├── LICENSE
├── LICENSE-3RD-PARTY.md
├── node_modules
├── package.json
├── package-lock.json
├── packages
│   ├── injectables
│   │   ├── .npmignore
│   │   ├── CHANGELOG.md
│   │   ├── dist
│   │   ├── lib
│   │   ├── node_modules
│   │   ├── package.json
│   │   ├── package-lock.json
│   │   ├── README.md
│   │   ├── src
│   │   ├── test
│   │   └── tsconfig.json
│   ├── navigator
│   │   ├── .npmignore
│   │   ├── CHANGELOG.md
│   │   ├── dist
│   │   ├── lib
│   │   ├── node_modules
│   │   ├── package.json
│   │   ├── package-lock.json
│   │   ├── README.md
│   │   ├── src
│   │   ├── test
│   │   └── tsconfig.json
│   ├── publication
│   │   ├── .npmignore
│   │   ├── CHANGELOG.md
│   │   ├── dist
│   │   ├── lib
│   │   ├── node_modules
│   │   ├── package.json
│   │   ├── package-lock.json
│   │   ├── README.md
│   │   ├── src
│   │   ├── test
│   │   └── tsconfig.json
│   ├── README.md
│   ├── rollup.config.js
│   ├── tsconfig.json
│   └── tsconfig.json
├── README.md
├── static
│   ├── fixtures
│   │   ├── injectables
│   │   ├── navigator
│   │   └── publication
│   ├── publications
│   │   ├── accessible_epub_3
│   │   ├── israel-sailing
│   │   ├── moby-dick-mo
│   │   └── page-blanche
│   ├── README
│   └── sandbox
│       └── index.html
├── tsconfig.base.json
└── tsconfig.test.json
```

### Tooling

#### Lerna

For managing the package architecture as a [workspace](https://yarnpkg.com/features/workspaces).

Lerna can be used with Yarn or NPM.
In this proposal it is used with NPM as default.

##### Alternatives

- Yarn 2 [workspaces](https://yarnpkg.com/features/workspaces).
- Lerna with Yarn 2.

#### TypeScript Compiler

The primary implementation language will be TypeScript for this project.
A TypeScript compiler (transpiler) is needed.

Use the official [TypeScript](https://www.typescriptlang.org/) compiler.

##### Alternatives

- Babel + [typescript preset/plugin](https://babeljs.io/docs/en/babel-preset-typescript).
  - Blog [post](https://devblogs.microsoft.com/typescript/typescript-and-babel-7/) from Microsoft

#### Karma + Jasmine

Browser-based test runner.

Tests for this project will benefit from running in a full browser environment.

[Karma](https://karma-runner.github.io/latest/index.html) is the choice for this as it's very well supported.

With a runner, you'll need tests to run them in. 

[Jasmine](https://jasmine.github.io/) is the choice for a testing framework since it promotes clean tests and comes built-in with assertions and mocking. The built-ins are two less components to configure and integrate.

##### Alternatives

- [Jest](https://jestjs.io/) + JSDOM
  - Jest is delightful and modern, and has a Jasmine-based framework with everything built-in.
  - Unfortunately for us it runs in a Node environment, which means you can't use a real DOM implementation in that environment, the best you have is JSDOM, and that can't render anything.
- [Mocha](https://mochajs.org/) + [Chai](https://www.chaijs.com/) + [Sinon](https://sinonjs.org/) instead of Jasmine.

#### Rollup.js

The project will be using ES modules to organize code in the canonical source code.
For this to work as the final output in a browser all the modules would need to be bundled together.

[Rollup.js] is the best for this as it's the most lightweight since this is its single purpose.

#### Prettier

Most modern programming language platforms now a days adopt an official code formatter.

[Gofmt](https://blog.golang.org/gofmt) is such an example for Go.

[Prettier](https://prettier.io/) fulfills this role for the Javascript community.
It is the defacto standard for this job.

#### ESLint

[ESLint](https://eslint.org/) is the choice for a Javascript static code analyzer.

It now has [TypeScript support](https://typescript-eslint.io/) (TSLint used to be the choice for this), and it has a plugin for Prettier, and for understanding the package resolution with Lerna.

##### Alternatives

- [TSLint](https://palantir.github.io/tslint/) (now deprecated)

#### Husky + Lint Staged

Husky will allow the declaration and configuration of Git commit hooks.

One such use for this is with [Lint Staged](https://github.com/okonet/lint-staged).

This runs linters (and other tools) against files that will be committed.

##### Alternatives

- Manual setup

#### GitHub Actions

#### NPM


### Workflows

#### Building

#### Testing

#### Linting

#### Formatting

#### Releasing



## Rationale and Alternatives

What other designs have been considered, and why you chose this approach instead.


## Drawbacks and Limitations

Why should we *not* do this? Are there any unresolved questions?


## Future Possibilities
(*if relevant*)

Think about what the natural extension and evolution of your proposal would be. This is also a good place to "dump ideas", if they are out of scope for the proposal but otherwise related.


## Implementation Notes
(*after implementing the feature on a platform*)

Any implementer can submit an amendment PR to offer insights for other platforms.
