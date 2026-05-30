import fs from 'fs';
import os from 'os';
import path from 'path';

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

import { IConvertOptions, IStripOptions } from '@subzilla/types';

import FormattingStripper from '../src/FormattingStripper';
import SubtitleProcessor from '../src/SubtitleProcessor';

/**
 * Adversarial regression suite for the "collapsed line break" bug.
 *
 * Symptom: when a subtitle line break is represented by an INLINE marker
 * (<br>, <br/>, ASS \N, adjacent inline tags ...) the marker is deleted with
 * no separator, so the two lines' words get glued together. In Arabic/RTL this
 * is very visible because two words touch and read as one nonsense word.
 *
 * These tests deliberately push hard on every inline-break representation we
 * can find. They are written to PASS only once words are kept apart (by a
 * newline or, at minimum, a space).
 */

// Two unambiguous Arabic words. Their concatenation must never appear.
const A = 'مرحبا'; // "hello"
const B = 'بالعالم'; // "to the world"
const GLUED = `${A}${B}`; // مرحبابالعالم  <-- the bug signature

/** Assert two words ended up separated by a newline or a space, never glued. */
function expectSeparated(output: string, left = A, right = B): void {
    // The smoking gun: the two words directly touching.
    expect(output).not.toContain(`${left}${right}`);
    // And they should still both be present (we never lose content).
    expect(output).toContain(left);
    expect(output).toContain(right);
    // They must be joined by whitespace (newline preferred, space acceptable).
    expect(output).toMatch(new RegExp(`${left}[\\s][\\s]*${right}`));
}

describe('Line-break collapse — FormattingStripper (unit)', () => {
    let stripper: FormattingStripper;
    const html: IStripOptions = { html: true };

    beforeEach(() => {
        stripper = new FormattingStripper();
    });

    it('<br> between Arabic words must not glue them', () => {
        const result = stripper.stripFormatting(`${A}<br>${B}`, html);

        expect(result).not.toBe(GLUED);
        expectSeparated(result);
    });

    it('<br/> (self-closing) between Arabic words must not glue them', () => {
        const result = stripper.stripFormatting(`${A}<br/>${B}`, html);

        expectSeparated(result);
    });

    it('<br /> (spaced self-closing) between Arabic words must not glue them', () => {
        const result = stripper.stripFormatting(`${A}<br />${B}`, html);

        expectSeparated(result);
    });

    it('<BR> (uppercase) between Arabic words must not glue them', () => {
        const result = stripper.stripFormatting(`${A}<BR>${B}`, html);

        expectSeparated(result);
    });

    it('control: adjacent inline tags with NO break marker stay as authored', () => {
        // <i>A</i><i>B</i> has no <br>/space between the spans, so it already
        // renders with the words touching in the original video. Stripping must
        // be faithful and NOT invent a separator — this is deliberately the
        // boundary of the fix, not the bug (which is about real line breaks).
        const result = stripper.stripFormatting(`<i>${A}</i><i>${B}</i>`, html);

        expect(result).toBe(GLUED);
    });

    it('English sanity check: Hello<br>World must not become HelloWorld', () => {
        const result = stripper.stripFormatting('Hello<br>World', html);

        expect(result).not.toContain('HelloWorld');
        expect(result).toMatch(/Hello[\s]+World/);
    });

    it('control: a real newline between words is preserved as-is', () => {
        const result = stripper.stripFormatting(`${A}\n${B}`, html);

        expect(result).toContain(`${A}\n${B}`);
    });
});

describe('Line-break collapse — SubtitleProcessor (end-to-end)', () => {
    let processor: SubtitleProcessor;
    let tempDir: string;

    beforeEach(async () => {
        processor = new SubtitleProcessor();
        tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'subzilla-linebreak-'));
    });

    afterEach(async () => {
        try {
            await fs.promises.rm(tempDir, { recursive: true, force: true });
        } catch {
            // ignore cleanup errors
        }
    });

    async function run(srt: string, options?: IConvertOptions): Promise<string> {
        const inputPath = path.join(tempDir, 'in.srt');

        await fs.promises.writeFile(inputPath, srt, 'utf8');

        const result = await processor.processFile(inputPath, undefined, options);

        return fs.promises.readFile(result.outputPath, 'utf8');
    }

    it('CONTROL: two real-newline lines survive with no strip', async () => {
        const srt = `1
00:00:01,000 --> 00:00:03,000
${A}
${B}`;

        const out = await run(srt);

        expectSeparated(out);
    });

    it('BUG: inline <br> with html strip glues the two Arabic words', async () => {
        const srt = `1
00:00:01,000 --> 00:00:03,000
${A}<br>${B}`;

        const out = await run(srt, { strip: { html: true } });

        expect(out).not.toContain(GLUED);
        expectSeparated(out);
    });

    it('BUG: <br/> and <br /> variants with html strip', async () => {
        const srt = `1
00:00:01,000 --> 00:00:03,000
${A}<br/>${B}

2
00:00:04,000 --> 00:00:06,000
${A}<br />${B}`;

        const out = await run(srt, { strip: { html: true } });

        expect(out).not.toContain(GLUED);
        // Both cues must keep their words apart.
        expect((out.match(new RegExp(`${A}[\\s]+${B}`, 'g')) || []).length).toBe(2);
    });

    it('BUG: trailing <br> producing a real two-line cue must keep a break', async () => {
        // Source has all text on physical line 1, using <br> as the line break.
        const srt = `1
00:00:01,000 --> 00:00:03,000
${A} و الصحابة<br>${B} و التابعين`;

        const out = await run(srt, { strip: { html: true } });

        expect(out).not.toContain('الصحابةبالعالم');
        expect(out).toMatch(/الصحابة[\s]+بالعالم/);
    });

    it('BUG: ASS \\N hard break must not survive as glue/literal between words', async () => {
        const srt = `1
00:00:01,000 --> 00:00:03,000
${A}\\N${B}`;

        const out = await run(srt, { strip: { html: true } });

        // Neither glued nor a literal "\N" left dangling against a word.
        expect(out).not.toContain(GLUED);
        expect(out).not.toContain(`${A}\\N${B}`);
        expectSeparated(out);
    });

    it('BUG: html + bidiControl strip together still must not glue words', async () => {
        const srt = `1
00:00:01,000 --> 00:00:03,000
‫${A}<br>${B}‬`;

        const out = await run(srt, { strip: { html: true, bidiControl: true } });

        expect(out).not.toContain(GLUED);
        expectSeparated(out);
    });

    it('EDGE: doubled <br><br> collapses to one break, never splits the cue', async () => {
        const srt = `1
00:00:01,000 --> 00:00:03,000
${A}<br><br>${B}

2
00:00:04,000 --> 00:00:06,000
next`;

        const out = await run(srt, { strip: { html: true } });

        expect(out).not.toContain(GLUED);
        expectSeparated(out);
        // The two words must remain inside ONE cue: no blank line between them
        // that would orphan "بالعالم" as a timestamp-less block.
        expect(out).toMatch(new RegExp(`${A}\\n${B}`));
        // Cue 2 must still be intact and reachable.
        expect(out).toContain('00:00:04,000 --> 00:00:06,000');
        expect(out).toContain('next');
    });

    it('EDGE: <br> hugging a real newline does not create a blank line', async () => {
        // Source already breaks the physical line AND adds a <br> — a common
        // double-encoding. Must yield a single break, not an orphaned line.
        const srt = `1
00:00:01,000 --> 00:00:03,000
${A}<br>
${B}`;

        const out = await run(srt, { strip: { html: true } });

        expect(out).not.toContain(GLUED);
        // Exactly one newline between the words (single break, no blank line).
        expect(out).toMatch(new RegExp(`${A}\\n${B}`));
        expect(out).not.toMatch(new RegExp(`${A}\\n\\n${B}`));
    });

    it('EDGE: trailing <br> at end of a cue must not merge it with the next cue', async () => {
        const srt = `1
00:00:01,000 --> 00:00:03,000
${A}<br>

2
00:00:04,000 --> 00:00:06,000
${B}`;

        const out = await run(srt, { strip: { html: true } });

        // The cue boundary must survive: the two cues stay distinct, words apart.
        expect(out).not.toContain(GLUED);
        expect(out).toContain('00:00:04,000 --> 00:00:06,000');
        expect(out).toMatch(/2\n00:00:04,000/);
    });

    it('EDGE: CRLF input with inline <br> stays separated and intact', async () => {
        const srt = `1\r\n00:00:01,000 --> 00:00:03,000\r\n${A}<br>${B}\r\n`;

        const out = await run(srt, { strip: { html: true }, lineEndings: 'lf' });

        expect(out).not.toContain(GLUED);
        expect(out).toMatch(new RegExp(`${A}\\n${B}`));
    });

    it('multi-cue mix: real newline cue and <br> cue both stay separated', async () => {
        const srt = `1
00:00:01,000 --> 00:00:03,000
${A}
${B}

2
00:00:04,000 --> 00:00:06,000
${A}<br>${B}`;

        const out = await run(srt, { strip: { html: true } });

        expect(out).not.toContain(GLUED);
        expect((out.match(new RegExp(`${A}[\\s]+${B}`, 'g')) || []).length).toBe(2);
    });
});
