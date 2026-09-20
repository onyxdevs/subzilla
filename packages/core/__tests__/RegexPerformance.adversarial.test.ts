import fs from 'fs';
import os from 'os';
import path from 'path';

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';

import FormattingStripper from '../src/FormattingStripper';
import SubtitleProcessor from '../src/SubtitleProcessor';

/**
 * ReDoS guard. SubZilla reads untrusted files, so no input may make a regex go
 * quadratic: a 1 MB line of spaces once took ~13 minutes.
 *
 * Each input is 200,000 characters. Linear regexes handle that in a few
 * milliseconds; the quadratic ones this suite was written against needed
 * 30+ seconds. The 1.5 s budget is therefore far from both — it does not flake
 * on a slow CI runner and cannot pass by accident.
 */

const SIZE = 200_000;
const BUDGET_MS = 1500;
const ALL = { html: true, markdown: true, colors: true, styles: true, urls: true, emojis: true, bidiControl: true };

const repeat = (unit: string): string => unit.repeat(Math.ceil(SIZE / unit.length));

const HOSTILE_INPUTS: Array<[string, string]> = [
    ['one long run of spaces, then a non-tag', `${' '.repeat(SIZE)}<x`],
    ['one long run of spaces after a <br>', `a<br>${' '.repeat(SIZE)}b`],
    ['one long run of spaces after a <p>, no second tag', `<p>${' '.repeat(SIZE)}x`],
    ['one long run of tabs before a heading marker', `${'\t'.repeat(SIZE)}x`],
    ['link with a huge unterminated title', `[a](http://x "${' '.repeat(SIZE)}`],
    ['link target followed by a long run of spaces', `[a](http://x${' '.repeat(SIZE)}z`],
    ['ASS override that never closes: {\\a000000…', `{\\a${'0'.repeat(SIZE)}`],
    ['many ASS override openers, none closed', repeat('{{\\')],
    ['many "<a" openers, none closed', repeat('<a')],
    ['many "[" openers', repeat('[')],
    ['many "![" openers', repeat('![')],
    ['many "*a " — openers with no closer', repeat('*a ')],
    ['many "_a " — openers with no closer', repeat('_a ')],
    ['many "`a " — openers with no closer', repeat('`a ')],
    ['many "~~a " — openers with no closer', repeat('~~a ')],
    ['a run of 200k stars', '*'.repeat(SIZE)],
    ['a run of 200k underscores', '_'.repeat(SIZE)],
    ['many unterminated entities', repeat('&#1')],
    ['many "&" + long names', repeat('&abcdefghi')],
    ['many ASS soft breaks hugged by spaces', `{\\an8}${repeat(' \\n ')}`],
    ['one long run of spaces before \\N', `a${' '.repeat(SIZE)}\\Nb`],
    ['URL-ish prefix repeated', repeat('http://')],
];

describe('no strip regex goes quadratic on hostile input', () => {
    it.each(HOSTILE_INPUTS)('FormattingStripper: %s', (_name, input) => {
        const started = Date.now();

        new FormattingStripper().stripFormatting(input, ALL);

        expect(Date.now() - started).toBeLessThan(BUDGET_MS);
    });
});

describe('the full pipeline stays fast on hostile files', () => {
    let tempDir: string;

    beforeAll(async () => {
        tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'subzilla-redos-'));
    });

    afterAll(async () => {
        await fs.promises.rm(tempDir, { recursive: true, force: true });
    });

    it.each(HOSTILE_INPUTS)('SubtitleProcessor: %s', async (_name, input) => {
        const index = HOSTILE_INPUTS.findIndex(([, candidate]) => candidate === input);
        const inputPath = path.join(tempDir, `hostile-${index}.srt`);
        const outputPath = path.join(tempDir, `hostile-${index}.out.srt`);

        // A valid cue before and after, so we can also prove the file still converts
        const content = `1\n00:00:01,000 --> 00:00:02,000\nمرحبا\n\n2\n00:00:03,000 --> 00:00:04,000\n${input}\n\n3\n00:00:05,000 --> 00:00:06,000\nبالعالم\n`;

        await fs.promises.writeFile(inputPath, content, 'utf8');

        const started = Date.now();

        await new SubtitleProcessor().processFile(inputPath, outputPath, { strip: ALL, overwriteExisting: true });

        expect(Date.now() - started).toBeLessThan(BUDGET_MS);

        const output = await fs.promises.readFile(outputPath, 'utf8');

        expect(output.startsWith('1\n00:00:01,000 --> 00:00:02,000\nمرحبا\n\n2\n')).toBe(true);
        expect(output.endsWith('\n\n3\n00:00:05,000 --> 00:00:06,000\nبالعالم\n')).toBe(true);
    });
});
