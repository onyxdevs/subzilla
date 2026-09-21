---
name: diagnosing-subtitle-files
description: Inspects a problem subtitle file byte-for-byte and shows what SubZilla's real pipeline does to it - detected encoding, invisible characters, markup, blank lines cutting cues short, and any cue whose visible words change. Use when a user reports a converted subtitle that looks wrong (words touching or joined, mojibake or garbled Arabic, missing lines, wrong encoding), attaches or names an .srt/.ass/.sub file, or before changing FormattingStripper, SubtitleProcessor or EncodingDetectionService because of a bug report.
allowed-tools: Bash(node .claude/skills/diagnosing-subtitle-files/scripts/inspect-subtitle.js *) Bash(npx tsc --build)
---

# Diagnosing a subtitle file

Look at the bytes before forming a theory. Pasted text is useless: copy-paste re-encodes to UTF-8 and drops invisible characters, which is usually the bug. If the user only pasted text, ask for the file.

## 1. Inspect

```bash
npx tsc --build        # the script loads packages/core/dist
node .claude/skills/diagnosing-subtitle-files/scripts/inspect-subtitle.js <file>          # add --json for full detail
```

The input is never modified (conversion runs on a temp copy).

## 2. Read the report

| Line        | What to look for                                                                                                                                                                                              |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Encoding`  | `detected` differing from the first `raw chardet` entry means our payload-only detection overrode chardet - expected for markup-heavy files. `U+FFFD > 0`: the file was already damaged before it reached us. |
| `Structure` | `text block(s) with no timing line`: a blank line inside a cue. Players drop that text. We preserve original blank lines; we must never ADD one.                                                              |
| `Invisible` | NEL/VT/FF/LS/PS are line breaks players render as nothing. NBSP/ZWSP between words. ZWNJ/ZWJ are legitimate - never strip them.                                                                               |
| `Suspect`   | Two words separated ONLY by an invisible character. They already touch on screen in the source. That is a source defect, not a pipeline bug - say so.                                                         |
| `Pipeline`  | `CUE COUNT CHANGED` or any `cues whose visible words changed` is a real bug in our code, unless the `Suspect` line explains it.                                                                               |

## 3. Decide where the fault is

- **Source defect** (listed under `Suspect`, or `U+FFFD` present): report it; do not "fix" by guessing. Inserting a space for an invisible mark would corrupt correctly-authored text elsewhere.
- **Detection wrong** (output is mojibake): reproduce in `EncodingDetection.adversarial.test.ts` with the same encoding + markup style.
- **Words changed or cue count changed**: reduce the offending cue to the smallest input that still fails, then follow the `writing-adversarial-tests` skill - failing test first, then the fix.
- **Output is right but the player shows it wrong**: check the `EOL` line. Some TVs need CRLF (`lineEndings: crlf`) and a BOM.

## 4. Report back

State which of the four it is, quote the exact cue and code points (`U+200F`), and say what was NOT checked (for example: how a specific TV renders it).
