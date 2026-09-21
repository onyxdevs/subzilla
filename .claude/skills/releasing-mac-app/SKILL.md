---
name: releasing-mac-app
description: Cuts a SubZilla macOS release - bumps the app version, verifies the packaged bundle (signature, Electron checksum, bundled packages vs npm), pushes the v* tag that triggers the release workflow, and checks the resulting draft GitHub release.
argument-hint: '[version, e.g. 1.1.0]'
disable-model-invocation: true
allowed-tools: Bash(.claude/skills/releasing-mac-app/scripts/verify-mac-bundle.sh *) Bash(git status *) Bash(git log *) Bash(gh release *) Bash(gh run *)
---

# Releasing the Mac app

Target version: `$ARGUMENTS` (if empty, propose one from the commits below and ask).

## Current state

- App version: !`node -p "require('./packages/mac/package.json').version"`
- Latest tag: !`git describe --tags --abbrev=0 2>/dev/null || echo "(no tags yet)"`
- Branch / cleanliness: !`git status -sb | head -5`
- Commits since last tag: !`git log --oneline $(git describe --tags --abbrev=0 2>/dev/null || git rev-list --max-parents=0 HEAD | tail -1)..HEAD | head -25`

## Procedure

Copy this checklist and tick items as they complete. Stop and report at the first failure.

```
- [ ] 1. On an up-to-date, clean `main`; CI green on HEAD (`gh run list --branch main --limit 3`)
- [ ] 2. Bump "version" in packages/mac/package.json (the workflow rejects a tag that does not match it)
- [ ] 3. Package locally:  npx tsc --build && yarn workspace @subzilla/mac build
- [ ] 4. Verify:           .claude/skills/releasing-mac-app/scripts/verify-mac-bundle.sh
- [ ] 5. Ask the user to launch the packaged app once and drop a file + a folder on it
- [ ] 6. Commit the bump via PR: "[CHORE] Release vX.Y.Z" (main is protected)
- [ ] 7. After merge, CONFIRM with the user, then:  git tag vX.Y.Z && git push origin vX.Y.Z
- [ ] 8. Watch:            gh run watch   (workflow: "Release (macOS app)")
- [ ] 9. Check the DRAFT release has 2 .dmg + 2 .zip + latest-mac.yml:  gh release view vX.Y.Z
- [ ] 10. Write release notes from the commit list (group by [FEAT]/[FIX]); the user publishes the draft
```

## Rules

- Step 4 must print `RESULT: OK`. A bundle that still carries stock Electron's signature (`Identifier=Electron`) is reported by macOS as "contains malware" and deleted on launch. Never publish or launch a build that fails it.
- Steps 7 and 10 are outward-facing and hard to undo: get explicit confirmation each time. Never publish the draft yourself.
- Do not claim the app "works" from packaging alone. Only step 5 (a human launching it) establishes that.
- The app is ad-hoc signed, not notarized. Release notes must tell users to approve it once under System Settings → Privacy & Security, and that auto-update cannot install unsigned updates.
- Unpublished mistake? Delete the draft and the tag (`gh release delete vX.Y.Z --cleanup-tag`), fix, re-tag. Never move a tag that was already published.
