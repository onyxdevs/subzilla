---
paths:
    - 'packages/core/src/FormattingStripper.ts'
    - 'packages/core/src/SubtitleProcessor.ts'
    - 'packages/core/src/EncodingDetectionService.ts'
---

# Text-processing code

These files read untrusted input and their bugs are silent (words vanish or fuse; nothing throws).

## Regex safety — every one of these has bitten this repo

- Never start a pattern with an unanchored optional run (`[^\S\r\n]*<tag`). Every character of a long run re-scans the rest: quadratic. Pin the start with a lookbehind: `(?<![^\S\r\n])[^\S\r\n]*<tag`.
- Never put two adjacent runs of the same class around an optional element (`ws* NL? ws*`). Write `ws* (NL ws*)?`.
- A negated class must exclude the OPENER as well as the closer: `\{\\[^{}]+\}`, not `\{\\[^}]+\}`. Otherwise an unclosed opener scans to end of input, once per opener.
- A tag/marker pattern must not cross lines: exclude `\r\n` from its classes. `/<[^>]+>/` once deleted everything between a stray `<` and a `>` several cues later.
- `\w`, `\b` and `\s` are ASCII-centric. Use `\p{L}\p{N}` with the `u` flag for word boundaries in Arabic text.
- New or changed regex → add a hostile 200k-character case to `RegexPerformance.adversarial.test.ts`.

## Behaviour

- Decide what each removed token MEANS before deleting it: nothing (`<i>`), a space (`&nbsp;`, ASS `\h`), or a line break (`<br>`, `<p>`, `\N`). Deleting a separator glues words.
- Ambiguous lowercase ASS markers (`\n`, `\h`) are only honoured when the file shows ASS provenance (`\N` or `{\tag}` elsewhere); `C:\new` must survive in a plain SRT.
- Markdown stripping is conservative by design. Dialogue dashes, `# lyrics #`, `f**k`, `* sighs *`, `snake_case`, `>> Speaker:` stay. Emphasis never pairs across cues.
- Decode with Windows supersets (ISO-8859-1 → windows-1252, -9 → windows-1254), as browsers do.
- The project targets ES2020: no `Object.hasOwn`, no `Array.prototype.at`.

Any change here needs the `writing-adversarial-tests` skill. To examine a real problem file, use the `diagnosing-subtitle-files` skill before touching code.
