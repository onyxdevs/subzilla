import fs from 'fs';
import os from 'os';
import path from 'path';

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import iconv from 'iconv-lite';

import { IConvertOptions } from '@subzilla/types';

import SubtitleProcessor from '../src/SubtitleProcessor';

/**
 * Adversarial suite for the "two Arabic words touch" bug family.
 *
 * Everything here runs the REAL pipeline (SubtitleProcessor.processFile) on
 * REAL bytes on disk and asserts on the bytes that come out. No mocks, no
 * "does not throw" assertions. Two kinds of test:
 *
 *   1. Exact-output cases: the full expected text of the cue is spelled out,
 *      so a regression in either direction (glued words OR lost/extra text OR
 *      a cue split in two) fails.
 *   2. A seeded generative test asserting an invariant that must hold for ANY
 *      input: the sequence of words in every cue is identical before and
 *      after processing, and no cue is created or destroyed.
 */

const STRIP = { html: true, markdown: true, colors: true, styles: true, urls: false, bidiControl: true };
const OPTIONS: IConvertOptions = { strip: STRIP, overwriteExisting: true, lineEndings: 'lf', bom: false };

interface ICue {
    index: string;
    timing: string;
    lines: string[];
}

let tempDir: string;
let counter = 0;

beforeAll(async () => {
    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'subzilla-wordboundary-'));
});

afterAll(async () => {
    await fs.promises.rm(tempDir, { recursive: true, force: true });
});

async function run(input: string | Buffer, options: IConvertOptions = OPTIONS): Promise<string> {
    const id = counter++;
    const inputPath = path.join(tempDir, `in-${id}.srt`);
    const outputPath = path.join(tempDir, `out-${id}.srt`);

    await fs.promises.writeFile(inputPath, input);
    await new SubtitleProcessor().processFile(inputPath, outputPath, options);

    return fs.promises.readFile(outputPath, 'utf8');
}

/** Strict SRT parse: every block must be "index / timing / 1+ text lines". */
function parseCues(output: string): ICue[] {
    // Exactly one newline terminates the file
    expect(output.endsWith('\n') && !output.endsWith('\n\n')).toBe(true);

    return output
        .slice(0, -1)
        .split(/\n[^\S\n]*\n/)
        .filter((block) => block.trim().length > 0)
        .map((block) => {
            const [index, timing, ...lines] = block.split('\n');

            return { index, timing, lines };
        });
}

const timing = (n: number): string =>
    `00:00:${String(n).padStart(2, '0')},000 --> 00:00:${String(n).padStart(2, '0')},900`;

/** Wrap one cue text between two sentinel cues so damage to neighbours is visible. */
function sandwich(text: string, eol = '\r\n'): string {
    return [`1`, timing(1), 'قبل', '', `2`, timing(2), text, '', `3`, timing(3), 'بعد', ''].join(eol);
}

async function middleCue(text: string, eol = '\r\n', options: IConvertOptions = OPTIONS): Promise<string[]> {
    const cues = parseCues(await run(sandwich(text, eol), options));

    // The neighbours must be untouched and nothing may be split off or merged
    expect(cues.map((cue) => cue.index)).toEqual(['1', '2', '3']);
    expect(cues.map((cue) => cue.timing)).toEqual([timing(1), timing(2), timing(3)]);
    expect(cues[0].lines).toEqual(['قبل']);
    expect(cues[2].lines).toEqual(['بعد']);

    return cues[1].lines;
}

const A = 'مرحبا';
const B = 'بالعالم';

describe('block-level tags are line breaks, not nothing', () => {
    const cases: Array<[string, string, string[]]> = [
        ['<p> pair', `<p>${A}</p><p>${B}</p>`, [A, B]],
        ['<div> pair', `<div>${A}</div><div>${B}</div>`, [A, B]],
        ['<DIV> uppercase with attributes', `<DIV class="x">${A}</DIV><DIV dir="rtl">${B}</DIV>`, [A, B]],
        ['<li> items', `<ul><li>${A}</li><li>${B}</li></ul>`, [A, B]],
        ['block tags already on separate lines (no blank line may appear)', `<p>${A}</p>\r\n<p>${B}</p>`, [A, B]],
        ['block tag then <br> then block tag', `<p>${A}</p><br><p>${B}</p>`, [A, B]],
        ['inline tags keep the authored space', `<i>${A}</i> <b>${B}</b>`, [`${A} ${B}`]],
        ['inline tags inside one word do not split it', `<i>مر</i>حبا ${B}`, [`${A} ${B}`]],
    ];

    it.each(cases)('%s', async (_name, text, expected) => {
        expect(await middleCue(text)).toEqual(expected);
    });

    it('a cue made only of block tags around text keeps its neighbours intact with LF and CR files too', async () => {
        expect(await middleCue(`<p>${A}</p><p>${B}</p>`, '\n')).toEqual([A, B]);
        expect(await middleCue(`<p>${A}</p><p>${B}</p>`, '\r')).toEqual([A, B]);
    });
});

describe('"<" and ">" that are not tags are text', () => {
    it('does not eat the text between a stray "<" and a later ">"', async () => {
        // The old /<[^>]+>/ matched from the "<" on line 1 to the ">" on line 2
        expect(await middleCue(`${A} < ${B}\r\nسطر > آخر`)).toEqual([`${A} < ${B}`, 'سطر > آخر']);
    });

    it('does not eat text across CUES between a stray "<" and a later ">"', async () => {
        const input = ['1', timing(1), `5 < 6 ${A}`, '', '2', timing(2), B, '', '3', timing(3), `7 > 2`, ''].join(
            '\r\n',
        );
        const cues = parseCues(await run(input));

        expect(cues).toHaveLength(3);
        expect(cues[0].lines).toEqual([`5 < 6 ${A}`]);
        expect(cues[1].lines).toEqual([B]);
        expect(cues[2].lines).toEqual(['7 > 2']);
    });

    it('keeps angle-bracket quotes and non-tag brackets', async () => {
        expect(await middleCue(`<<${A}>> ${B} <3 <-- -->`)).toEqual([`<<${A}>> ${B} <3 <-- -->`]);
    });

    it('still strips real tags that contain ">"-free attributes', async () => {
        expect(await middleCue(`<font color="#ff0000" size=12>${A}</font> ${B}`)).toEqual([`${A} ${B}`]);
    });
});

describe('HTML entities', () => {
    it('&nbsp; becomes a real space instead of staying glued between the words', async () => {
        expect(await middleCue(`${A}&nbsp;${B}`)).toEqual([`${A} ${B}`]);
    });

    it('numeric and named entities decode; bidi entities are then stripped', async () => {
        expect(await middleCue(`${A}&#160;${B} &amp; ${A}&#x20;${B}&rlm;&lrm;`)).toEqual([`${A} ${B} & ${A} ${B}`]);
    });

    it('an escaped tag decodes to literal text and is NOT stripped as a tag', async () => {
        expect(await middleCue(`&lt;i&gt;${A}&lt;/i&gt;`)).toEqual([`<i>${A}</i>`]);
    });

    it('unknown or malformed entities are left exactly as written', async () => {
        expect(await middleCue(`${A} &bogus; &#0; &#xD800; &#99999999; AT&T; ${B}`)).toEqual([
            `${A} &bogus; &#0; &#xD800; &#99999999; AT&T; ${B}`,
        ]);
    });

    it('entities are untouched when html stripping is off', async () => {
        const lines = await middleCue(`${A}&nbsp;${B}`, '\r\n', { ...OPTIONS, strip: { ...STRIP, html: false } });

        expect(lines).toEqual([`${A}&nbsp;${B}`]);
    });
});

describe('exotic line breaks that players render as nothing', () => {
    const breaks: Array<[string, string]> = [
        ['U+2028 LINE SEPARATOR', '\u2028'],
        ['U+2029 PARAGRAPH SEPARATOR', '\u2029'],
        ['U+0085 NEXT LINE', '\u0085'],
        ['U+000B VERTICAL TAB', '\u000B'],
        ['U+000C FORM FEED', '\u000C'],
    ];

    it.each(breaks)('%s between words becomes a newline', async (_name, marker) => {
        expect(await middleCue(`${A}${marker}${B}`)).toEqual([A, B]);
    });

    it.each(breaks)(
        '%s hugging a real newline never creates a blank line (which would end the cue)',
        async (_n, marker) => {
            expect(await middleCue(`${A}${marker}\r\n${marker}${B}`)).toEqual([A, B]);
        },
    );
});

describe('ASS \\n and \\h', () => {
    it('are word separators when the file carries ASS markup', async () => {
        expect(await middleCue(`{\\an8}${A}\\h${B}\\n${A}\\N${B}`)).toEqual([`${A} ${B} ${A}`, B]);
    });

    it('are left alone in a plain SRT so paths and escapes survive', async () => {
        expect(await middleCue(`C:\\new\\home ${A}`)).toEqual([`C:\\new\\home ${A}`]);
    });
});

describe('bidi controls', () => {
    it('removes marks around a real separator without touching the separator', async () => {
        expect(await middleCue(`\u202B${A}\u200F \u200F${B}\u202C\r\n\u202B${B}!\u200F\u202C`)).toEqual([
            `${A} ${B}`,
            `${B}!`,
        ]);
    });

    it('removes ARABIC LETTER MARK (U+061C) too', async () => {
        expect(await middleCue(`${A}\u061C ${B}`)).toEqual([`${A} ${B}`]);
    });

    it('keeps ZWNJ/ZWJ: they change how Persian/Arabic words are shaped', async () => {
        expect(await middleCue(`می\u200Cخواهم ${B}`)).toEqual([`می\u200Cخواهم ${B}`]);
    });
});

describe('same guarantees from legacy encodings', () => {
    it('windows-1256 bytes: block tags + &nbsp; + <br>', async () => {
        const bytes = iconv.encode(sandwich(`<p>${A}&nbsp;${B}</p><p>${B}<br>${A}</p>`), 'windows-1256');
        const cues = parseCues(await run(bytes));

        expect(cues[1].lines).toEqual([`${A} ${B}`, B, A]);
    });

    it('UTF-16LE with BOM: block tags + exotic break', async () => {
        const bytes = iconv.encode(sandwich(`<div>${A}</div><div>${B}\u2028${A}</div>`), 'utf16le', { addBOM: true });
        const cues = parseCues(await run(bytes));

        expect(cues[1].lines).toEqual([A, B, A]);
    });
});

describe('generative invariant: processing never merges, loses or invents words', () => {
    // Deterministic PRNG (mulberry32) so a failure is reproducible from its seed
    function prng(seed: number): () => number {
        let state = seed;

        return (): number => {
            state = (state + 0x6d2b79f5) | 0;

            let t = Math.imul(state ^ (state >>> 15), 1 | state);

            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;

            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    const WORDS = [
        'مرحبا',
        'بالعالم',
        'كيف',
        'حالك',
        'اليوم',
        'شكراً',
        'جزيلاً',
        'لا',
        'أعرف',
        'مَدْرَسَة',
        'OK',
        'سلام',
        'می\u200Cخواهم',
    ];

    // Everything that can legitimately sit BETWEEN two words
    const SEPARATORS = [
        ' ',
        '  ',
        '\t',
        '\r\n',
        '<br>',
        '<BR/>',
        '<br />',
        ' <br> ',
        '<br>\r\n',
        '\r\n<br>',
        '<br><br>',
        '</p><p>',
        '</div>\r\n<div>',
        '<li>',
        '&nbsp;',
        '&#160;',
        ' &rlm;',
        '\u2028',
        '\u0085',
        '\u000B',
        '\\N',
        ' \\N ',
        '\\N\r\n',
        '\u200F ',
        ' \u200F',
        '\u202C\r\n\u202B',
        '</i> <i>',
        '</b>\r\n<b>',
        '{\\i0} {\\i1}',
    ];

    // Markup that hugs a single word and must vanish without side effects
    const WRAPPERS: Array<(word: string) => string> = [
        (w): string => w,
        (w): string => w,
        (w): string => `<i>${w}</i>`,
        (w): string => `<b><i>${w}</i></b>`,
        (w): string => `<font color="#ffff00">${w}</font>`,
        (w): string => `{\\an8}${w}`,
        (w): string => `{\\c&H00FFFF&}${w}`,
        (w): string => `**${w}**`,
        (w): string => `*${w}*`,
        (w): string => `__${w}__`,
        (w): string => `~~${w}~~`,
        (w): string => `\u202B${w}\u202C`,
        (w): string => `\u200F${w}\u200F`,
        (w): string => `<p>${w}</p>`,
        (w): string => `<span dir="rtl">${w}</span>`,
    ];

    const pick = <T>(random: () => number, items: T[]): T => items[Math.floor(random() * items.length)];
    const wordsOf = (text: string): string[] => text.match(/[\p{L}\p{M}\p{N}\u200C]+/gu) ?? [];

    function generate(seed: number): { content: string; expected: string[][] } {
        const random = prng(seed);
        const eol = pick(random, ['\r\n', '\n']);
        const cueCount = 1 + Math.floor(random() * 6);
        const blocks: string[] = [];
        const expected: string[][] = [];

        for (let cue = 0; cue < cueCount; cue++) {
            const wordCount = 1 + Math.floor(random() * 7);
            const words: string[] = [];
            let text = '';

            for (let i = 0; i < wordCount; i++) {
                const word = pick(random, WORDS);

                words.push(word);
                text += (i > 0 ? pick(random, SEPARATORS) : '') + pick(random, WRAPPERS)(word);
            }

            expected.push(words);
            blocks.push(`${cue + 1}${eol}${timing(cue)}${eol}${text.replace(/\r\n/g, eol)}${eol}`);
        }

        return { content: blocks.join(eol), expected };
    }

    it('holds for 400 seeded random subtitle files', async () => {
        for (let seed = 1; seed <= 400; seed++) {
            const { content, expected } = generate(seed);
            const output = await run(content);
            const cues = parseCues(output);
            const context = `seed=${seed}\n--- input ---\n${JSON.stringify(content)}\n--- output ---\n${JSON.stringify(output)}`;

            // No cue created (blank line manufactured) or destroyed
            expect({ context, cues: cues.length }).toEqual({ context, cues: expected.length });

            cues.forEach((cue, index) => {
                expect({ context, timing: cue.timing }).toEqual({ context, timing: timing(index) });
                // Same words, same order: nothing glued, dropped, or left behind as markup debris
                expect({ context, words: cue.lines.flatMap(wordsOf) }).toEqual({ context, words: expected[index] });
                // And no markup residue of any kind
                expect({
                    context,
                    residue: cue.lines.join('\n').match(/[<>{}\\&*_~]|[\u200E\u200F\u202A-\u202E]/g),
                }).toEqual({
                    context,
                    residue: null,
                });
            });
        }
    });

    it('the invariant checker itself detects a glued pair (guards against a vacuous test)', () => {
        expect(wordsOf(`${A}${B}`)).not.toEqual([A, B]);
        expect(wordsOf(`${A}&nbsp;${B}`)).not.toEqual([A, B]);
        expect(wordsOf(`${A}\\N${B}`)).not.toEqual([A, B]);
    });
});
