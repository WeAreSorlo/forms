# Contributing to Sorlo Forms

## Setup

Sorlo Forms is developed with Node 22 or 24, which CI runs on, and npm.

```sh
npm install
```

## Commands

- `npm run dev` serves the demo in `public/`, a form and the schema builder, at the address Vite prints.
- `npm test` runs the Vitest suite.
- `npm run typecheck` checks `src/` with strict TypeScript. It doesn't cover `public/`, so check demo edits with a Vite build, such as `npx vite build --outDir /tmp/sorlo-demo`, or a temporary tsconfig.
- `npm run format` checks the formatting with Prettier, and `npm run format:fix` fixes it.
- `npm run build` builds `dist/`: the library with tsup, and the styles in `src/styles` compiled to CSS with Sass.

CI runs the format check, typecheck, tests and build on every pull request.

## Conventions

- An input is a module in `src/inputs/<Name>/index.tsx`. It exports `name`, `description`, `category`, `optionFields`, `validateValue` and `typeValue` (its value's TypeScript type, for `schemaToTypeScript`), and optionally `validateChildren`, `pickValue`, `formatValue` and `renderValue`, with the React component as the default export. Register it in `src/inputs/index.tsx` and add a row to the README's field table.
- Validation messages and UI strings live in `src/translations/en.ts`.
- Tests:
  - `src/inputs/validateValue.test.ts` for each input's validation.
  - `src/inputs/optionFields.test.ts` lists the options each input must declare, so it needs updating with every new input.
  - `src/inputs/typeValue.test.ts` for each input's type. It fails for any input without a `typeValue`.
  - `src/utils/inputs.test.ts` for `validateValues`, `validateServerValues` and `pickValues`.
  - `src/components/Form/interactions.test.tsx` for React Testing Library form tests.
- Messages and validity are keyed by dotted paths like `pets.0.petname`. Containers nest their children's reports through `FieldReportContext`, and condition scopes through `FieldScopeContext`.
- Prettier: 120 columns, no semicolons, single quotes, sorted imports.
- Import single lodash functions with the extension, `lodash/<fn>.js`, never `lodash` itself. Node's ES module loader can't resolve `lodash/<fn>` without the `.js`.

## Changesets

A change that users of the package will notice comes with a changeset, which sets the next version and writes the changelog. Run `npx changeset`, choose patch, minor or major, and describe the change for the changelog. It writes a file in `.changeset/` to commit with the change. Changes to tests, docs or CI need none.

## Releasing

The release workflow, `.github/workflows/release.yml`, runs on every push to `main`:

- While changesets are waiting, it opens or updates a "Version Packages" pull request, which bumps the version, writes `CHANGELOG.md` and deletes the changesets.
- Merging that pull request publishes the new version to npm, with provenance, then tags it, such as `v0.2.0`, and makes a GitHub release.

It publishes through npm's trusted publishing, so no npm token is stored anywhere. Only the publish job can get a short-lived one, and the job before it runs the tests and packs the tarball. To version without the pull request, run `npm run version-packages`, then commit and push.

GitHub doesn't start workflows for pull requests made with its own token, so CI doesn't run on the "Version Packages" pull request. It only changes the version and the changelog.

### The first publish

npm sets up trusted publishing only for a package that already exists, so the first version is published by hand, once:

1. Make the repository public, since provenance needs a public repository. Then, in its settings, turn on private vulnerability reporting and Dependabot alerts under Advanced Security, and "Allow GitHub Actions to create and approve pull requests" under Actions → General.
2. Publish from a clean checkout of `main`, with `npm login` and then `npm publish --provenance=false`. `publishConfig` asks for provenance, which npm can make only in CI, and the flag overrides it this once. To tag it as the workflow tags later releases, run `npx changeset git-tag` and `git push --tags`.
3. Add the trusted publisher on npmjs.com, in the package's settings under Trusted Publisher: GitHub Actions, organization `WeAreSorlo`, repository `forms`, workflow `release.yml`, no environment, with `npm publish` allowed, since Changesets can't use staged publishing yet. `npm trust github @sorlo/forms --file release.yml --repo WeAreSorlo/forms --allow-publish` does the same from the command line. npm expires the setup unless its first publish comes within 2 days, so add it when a release is ready to merge.
4. Once a release has gone out through the workflow, choose "Require two-factor authentication and disallow tokens" under the package's Publishing access.

Until steps 2 and 3 are done, the release workflow's publish job fails on each push to `main`.
