# SubZilla

Subtitle converter: detects the encoding, converts to UTF-8, strips formatting. Arabic/RTL correctness is the product's reason to exist. Yarn 4 monorepo, TypeScript (CommonJS, ES2020 target), Node >= 22.12 (`nvm use`).

<!-- Maintainer note: keep this file under ~100 lines. Area-specific rules live in
.claude/rules/ (loaded only when matching files are opened); procedures live in
.claude/skills/. Add a line here only when the same mistake happens twice. -->

## Layout

| Package          | Role                                                                             |
| ---------------- | -------------------------------------------------------------------------------- |
| `packages/types` | Shared interfaces + the Zod config schema. Everything depends on it.             |
| `packages/core`  | Encoding detection, conversion, `FormattingStripper`, `SubtitleProcessor`, batch |
| `packages/cli`   | The `subzilla` command (commander)                                               |
| `packages/mac`   | Electron app. Main + preload are TS; the renderer is plain, unbundled JS         |

## Commands

```bash
npx tsc --build            # compile types/core/cli — use THIS while iterating
yarn test                  # all 4 jest projects (needs the compile above: CLI tests run dist/)
npx jest --selectProjects core --testPathPatterns WordBoundary   # one suite
yarn lint && yarn format:check && yarn type-check                # what CI runs, plus tests
yarn workspace @subzilla/mac build                               # package the app (slow)
```

- `yarn build` also packages the Electron app (minutes, ~400 MB). Never use it as a compile step.
- Build errors like `TS6305 ... has not been built from source` mean stale `tsconfig.tsbuildinfo`: run `yarn clean`, then compile.
- After switching to a branch whose `yarn.lock` differs, run `yarn install` before trusting any lint/format/test result (`command not found: prettier` is this).

## Working agreements

- `main` is protected: branch, then PR. CI = Node 22 + 24; both must pass.
- Commits: one tag + imperative summary, bullets explain _why_. Tags: `[FEAT] [FIX] [TEST] [DOCS] [CHORE] [CI]`. Batch related files per commit.
- A pre-commit hook runs lint-staged. Format only through it, `yarn format`, or `yarn lint:fix`. Never run `prettier --write` on `*.html` or on the whole repo: it rewrites hundreds of unrelated lines. `npx husky init` likewise reformats `package.json` — revert that.
- Tests must discriminate. For text-processing work use the `writing-adversarial-tests` skill; a new test that was never seen failing does not count.
- Report what was verified and what was not. "Packaged" is not "launched"; "CI green" is not "works on the user's Mac".

## Invariants (break these and subtitles silently lose text)

- `SubtitleProcessor` splits the file into cues on its ORIGINAL blank lines first, then cleans each cue. Nothing may create a blank line inside a cue — every SRT reader treats it as end-of-cue and drops the rest.
- Removing markup must never join two words. Anything that means "line break" or "space" (`<br>`, block tags, `&nbsp;`, ASS `\N`, NEL/VT/FF/LS/PS) becomes a real separator, never nothing.
- ZWNJ/ZWJ are kept (they shape Arabic/Persian words). Bidi controls are removable; stripping runs after HTML so `&rlm;` is caught.
- `timestamps`, `numbers`, `punctuation`, `brackets` strip options are force-disabled during file processing.
- Encoding detection order: BOM → BOM-less UTF-16 → strict UTF-8 → chardet on the text payload only (markup and timestamps removed) → Arabic/Hebrew tie-break.

## Gotchas

- Adding a strip option touches ~10 places: `IStripOptions`, Zod schema, `ConfigManager` (`KNOWN_PROPERTIES` + defaults), CLI `options.ts` + `strip-options.ts` + `IStripCommandOptions`, mac `preferences.ts` (schema, defaults, presets), `preferences.html`, `preferences.js` (element, listener list, load, save, presets ×2), READMEs. `git grep -n bidiControl` lists them all.
- Mac app config rule: once Preferences has been saved (`userSavedConfig` marker, or stored values differing from defaults), Preferences is the ONLY source; before that `.subzillarc` seeds values over the built-in defaults. electron-store materialises every default, so a plain "stored overrides RC" merge can never express this. Logic + rationale: `getConfig()` in `main/preferences.ts`.
- `packages/mac/electron-builder.yml` is the only builder config. Never re-add a `"build"` field to `packages/mac/package.json`: it silently shadows the yml.
- macOS reports anything carrying STOCK Electron 31.7.7's code hash as "contains malware" and deletes it — even a pristine, checksum-verified `Electron.app`. Re-signing ad hoc gives it a new hash and it runs. So the packaged app is re-signed by `scripts/adhoc-sign.js` (afterPack) and the dev binary by `scripts/sign-dev-electron.js` (runs before `dev`/`start`). Never launch `node_modules/electron/dist/Electron.app` directly. Before launching any build: `codesign -dv <app>` must NOT say `Identifier=Electron`. (The "code has no resources…" message from `codesign --verify` on stock Electron is normal and was a red herring.)
- macOS has no `timeout` command. When checking that a launched process is alive, use its PID (`kill -0 $PID`); `pgrep -f <path>` matches your own shell command.
