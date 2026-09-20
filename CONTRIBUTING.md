# Contributing to SubZilla

Thanks for helping out. Bug reports with a sample file are as valuable as code.

## Reporting a bug

The most useful thing you can attach is **the subtitle file that goes wrong** (or the few cues that reproduce it). Encoding and spacing bugs usually cannot be reproduced from a description, because the problem lives in the exact bytes. If the file is copyrighted, a 3–5 cue excerpt is enough.

Please do not paste the text into the issue instead of attaching the file: copy-paste converts it to UTF-8 and removes invisible characters, which is often the bug itself.

## Development setup

```bash
git clone https://github.com/your-username/subzilla.git
cd subzilla
corepack enable      # the repo pins Yarn 4 via "packageManager"
yarn install
npx tsc --build      # compile types, core and cli
yarn test
```

- Node.js 22 or newer.
- The CLI integration tests run the compiled CLI, so compile before `yarn test`.
- `yarn build` also packages the macOS app with electron-builder, which is slow. `npx tsc --build` is all you need while iterating.
- A pre-commit hook runs Prettier and ESLint on staged files.

## Before opening a pull request

CI runs exactly these, on Node 22 and 24:

```bash
yarn type-check
yarn lint
yarn format:check
yarn test
```

## Tests

Text-processing changes need a test that would have caught the bug:

- Run the real pipeline on real bytes (see `packages/core/__tests__/*.adversarial.test.ts`) and assert the **exact** output, not just "does not throw" or "does not contain".
- Include the negative cases: what must be left alone matters as much as what is changed.
- Check that the new test fails without your fix.

`WordBoundary.adversarial.test.ts` contains a seeded generative test. If your change breaks it, the failure message prints the seed, the input and the output.

## Commit messages

One tag, then an imperative summary; optional bullet points explaining _why_:

```
[FIX] Prevent stripped markup from gluing words

- Block-level tags become line breaks instead of vanishing, which glued Arabic words.
```

Tags in use: `[FEAT]`, `[FIX]`, `[TEST]`, `[DOCS]`, `[CHORE]`, `[CI]`.

## Project layout

| Package          | What it is                                                  |
| ---------------- | ----------------------------------------------------------- |
| `packages/types` | Shared TypeScript interfaces and the Zod config schema      |
| `packages/core`  | Encoding detection, conversion, stripping, batch processing |
| `packages/cli`   | The `subzilla` command                                      |
| `packages/mac`   | The Electron desktop app                                    |

By contributing you agree that your contribution is licensed under the project's [ISC License](LICENSE).
