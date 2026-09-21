---
paths:
    - 'packages/mac/**'
---

# Mac (Electron) app

- The renderer (`src/renderer/js/*.js`) is plain JS copied as-is: no bundler, no imports, no TypeScript. It talks to main only through `window.subzilla` (defined in `src/preload/index.ts`).
- Changing the preload API means updating `ISubzillaAPI`, the `api` object, and `__tests__/preload/index.test.ts`, which asserts the full key list.
- Never store a DOM element under the same name as a method (`this.restoreDefaults = getElementById(...)` silently replaced the method and killed the button). Suffix element fields: `restoreDefaultsButton`.
- Never interpolate file names or paths into `innerHTML`; use `textContent`.
- Formatting presets exist in THREE places that must match in name and order: `getFormattingPresets()` in `main/preferences.ts`, and twice in `renderer/js/preferences.js` (`applyPreset`, `updatePresetButtons`), plus the buttons in `preferences.html`. A test enforces this, and that no two presets are identical (a duplicate can never show as selected).
- Dropped paths come from `window.subzilla.getPathForFile(file)` (`File.path` is gone in newer Electron). Folder expansion lives in `main/files.ts`: skips hidden entries, symlinks, `.subzilla.` outputs, VobSub `.sub`+`.idx` pairs, and `.txt` inside folders.
- Renderer behaviour is tested by executing the real script against a stub DOM (`__tests__/renderer/`), not by grepping source.
- Packaging: config is `electron-builder.yml` only; `scripts/adhoc-sign.js` must stay wired as `afterPack`. `electron-store` must stay < 9 (9+ is ESM-only; main is CommonJS) and `electron-builder` stays on 24 until migrated deliberately.
- Releasing is a manual procedure: use the `/releasing-mac-app` skill.
