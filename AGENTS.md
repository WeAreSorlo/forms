# Notes for coding agents

Sorlo Forms (`@sorlo/forms`) is a schema-driven React form library. Forms are plain data, rendered from pluggable inputs, and validated the same way in the browser and on a server. [CONTRIBUTING.md](CONTRIBUTING.md) has setup and the full conventions. This file is the short version.

## Commands

Node 22 or 24, with npm.

- `npm run typecheck`, `npm test` (Vitest), `npm run format` (Prettier, with `npm run format:fix` to fix) and `npm run build`. Run all four before you finish.
- `npm run dev` serves the demo in `public/`. The typecheck doesn't cover `public/`, so check a demo change with `npx vite build --outDir` and a scratch folder.

## Rules

- **It stands alone.** People use it without the Sorlo CMS, so keep CMS concepts (content types, entries, media, databases) out of it. When another project needs something from it, add a general hook that project implements, as `prepareSchema` and `validateServerValue` are.
- **A new input** is a module in `src/inputs/<Name>/index.tsx` with the exports CONTRIBUTING.md lists, `typeValue` included. Register it in `src/inputs/index.tsx`, add its row to the README's field table, and add it to `src/inputs/optionFields.test.ts`, `validateValue.test.ts` and `typeValue.test.ts`.
- **Strings** shown to people, validation messages included, live in `src/translations/en.ts`.
- **Lodash** is imported one function at a time with the extension, `lodash/<fn>.js`, never `lodash` itself, since Node's ES module loader can't resolve it without the `.js`.
- **Formatting:** 120 columns, no semicolons, single quotes and sorted imports, which `npm run format:fix` applies.
- **A change users will notice** needs a changeset: run `npx changeset`, as CONTRIBUTING.md describes.
