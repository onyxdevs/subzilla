---
name: reviewing-dependency-updates
description: Triages Dependabot and other dependency-update pull requests for SubZilla - decides merge, hold or close using the project's version policies, consolidates conflicting PRs into one tested branch, and verifies that what ships inside the Mac app is authentic. Use when Dependabot PRs are open or failing, when the user asks whether to merge or close dependency PRs, when bumping packages by hand, or after any dependency change that affects the packaged app.
---

# Reviewing dependency updates

CI green is necessary, not sufficient: CI cannot see the maintainer's local Node version, the pre-commit hook, or whether the packaged app still launches.

## 1. Survey

```bash
gh pr list --author "app/dependabot" --json number,title,mergeable
gh pr checks <n>                      # per PR
gh run view <run-id> --log-failed     # why a red one is red
```

## 2. Apply the version policies

| Package                      | Policy                                                                                                        |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `@types/node`                | Track the MINIMUM supported Node (`engines`), never latest. Close bumps beyond it.                            |
| `eslint`, `@eslint/js`       | Only together, and only once `eslint-plugin-import` lists that major in its `peerDependencies`.               |
| `electron`                   | Patch/minor within the major: fine. Major: deliberate migration (preload/renderer APIs change).               |
| `electron-store`             | Stay < 9. 9+ is ESM-only; the main process is CommonJS.                                                       |
| `electron-builder`           | Stay on 24 until migrated; re-verify `scripts/adhoc-sign.js` (the `afterPack` hook) when it moves.            |
| `chardet`, `iconv-lite`      | Encoding detection stands on these: `EncodingDetection.adversarial` must pass unchanged.                      |
| anything with `engines.node` | `npm view <pkg>@<ver> engines`. Compare against `engines` AND the user's local `node -v` (hooks run locally). |

To make Dependabot stop re-opening a major: comment `@dependabot ignore this major version` with the reason. Durable policies belong in `.github/dependabot.yml` with a note on when to lift them.

## 3. Consolidate instead of merging one by one

Every dependency PR rewrites `yarn.lock`, so they conflict. For more than two, build one branch:

```bash
git checkout -b chore/dependency-updates
# edit the version ranges by hand (do NOT check out Dependabot's whole package.json: it reverts other bumps)
yarn install
yarn lint:fix            # a newer Prettier may reformat a few files - commit that with the bump
yarn clean && npx tsc --build && yarn type-check && yarn lint && yarn format:check && yarn test
```

Then exercise what CI cannot: run the compiled CLI (`node packages/cli/dist/main.js --version`, `convert --help`, an unknown command), and make one commit so the pre-commit hook runs. Put `Closes #a, closes #b` in the PR body.

## 4. If the Mac app's bundled packages or Electron changed

```bash
yarn workspace @subzilla/mac build
.claude/skills/releasing-mac-app/scripts/verify-mac-bundle.sh
```

It checks the code signature, the Electron download against Electron's official SHA-256, and every bundled package against its npm tarball, without launching anything. `RESULT: OK` is required before anyone launches the build.

If macOS ever reports the app as malware: do not launch anything else. Run the script first. An invalid signature (not a compromised package) caused this once already; the script distinguishes the two.

## 5. Report

Per PR: merge / hold / close, with the reason. State separately what was verified locally and what only CI covered.
