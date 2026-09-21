---
name: writing-adversarial-tests
description: Writes and verifies tests for SubZilla's text-processing code that provably discriminate - real pipeline on real bytes, exact-output assertions, negative cases, a seeded generative invariant, and a mutation check proving the test fails on the old code. Use when fixing or changing FormattingStripper, SubtitleProcessor, EncodingDetectionService or ConfigManager, when adding a strip option or a regex, when a bug report involves wrong subtitle output, or when asked for adversarial, regression or "no theater" tests.
---

# Writing adversarial tests

A test that was never seen failing proves nothing. The maintainer's standard: "proper adversarial tests, no theater".

## Workflow

```
- [ ] 1. Reproduce the bug on real bytes (diagnosing-subtitle-files skill, or a node one-liner) BEFORE writing code
- [ ] 2. Write the failing test in the matching suite (below)
- [ ] 3. Fix the code
- [ ] 4. Run the mutation check - the new tests must FAIL on the old sources
- [ ] 5. Run the whole suite, incl. the generative invariant and the ReDoS guard
```

## Where tests go (`packages/core/__tests__/`)

| Suite                           | Covers                                                                                  |
| ------------------------------- | --------------------------------------------------------------------------------------- |
| `WordBoundary.adversarial`      | Anything that could join two words or split/merge cues. Has the generative invariant.   |
| `EncodingDetection.adversarial` | Detection. Asserts decoded TEXT round-trips, never just the encoding label.             |
| `MarkdownStrip.adversarial`     | Markdown - half of it is what must be left alone.                                       |
| `RegexPerformance.adversarial`  | Every regex on 200k-char hostile input within 1.5 s. Add a case for every regex change. |

## Rules

1. **Real pipeline, real bytes.** `new SubtitleProcessor().processFile()` on a temp file, encoded with `iconv.encode(text, 'windows-1256')` when encoding matters. No mocks of core classes.
2. **Exact output.** `expect(lines).toEqual(['مرحبا', 'بالعالم'])`. Never only `not.toContain(glued)`: that passes when the text vanished entirely.
3. **Sentinel cues.** Put the case between two normal cues and assert they survive untouched (`middleCue()` in `WordBoundary` does this). Damage to neighbours is the common hidden failure.
4. **Negative cases are half the job.** For every "strips X", assert the look-alikes that must NOT change (`f**k`, `5 < 6`, `C:\new`, `# lyrics #`, ZWNJ).
5. **Extend the generator, not just the examples.** New separator or wrapper? Add it to `SEPARATORS` / `WRAPPERS` in `WordBoundary`. 400 seeded files then exercise it in combinations nobody thought of. A failure prints its seed, input and output.
6. **Write invisible characters as escapes** (`'\u200F'`), never literally - a literal U+2028 inside a regex or string literal is a syntax error, and literal marks are unreviewable.
7. **Performance tests use a wide budget**, not ratios: linear is milliseconds, quadratic is tens of seconds, so 1.5 s neither flakes nor passes by accident.

## Mutation check (step 4)

```bash
.claude/skills/writing-adversarial-tests/scripts/mutation-check.sh <base-ref> <jest-project> <test-pattern> <changed-src-file>...

.claude/skills/writing-adversarial-tests/scripts/mutation-check.sh main core WordBoundary \
    packages/core/src/FormattingStripper.ts packages/core/src/SubtitleProcessor.ts
```

It swaps in the files from `<base-ref>`, runs the suite, and ALWAYS restores your versions. Read the verdict:

- `OK - N test(s) fail on the old code` - report N in the commit/PR.
- `NOT DISCRIMINATING` - the tests pass without the fix. Rewrite them; do not ship them as evidence.
- `INCONCLUSIVE` - the old code does not compile against the test (new API). A compile error is not a discriminating failure: keep the old signature callable for the check, or test through `processFile`.

Some new tests legitimately pass on old code (guards for behaviour that was already right). Say so rather than implying every test is new coverage.
