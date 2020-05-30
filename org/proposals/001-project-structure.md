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

#### TypeScript Compiler

#### Karma

#### Rollup.js

#### Prettier

#### ESLint

#### Husky

#### Lint Staged

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
