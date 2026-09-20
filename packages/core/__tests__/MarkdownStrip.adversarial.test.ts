import fs from 'fs';
import os from 'os';
import path from 'path';

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';

import FormattingStripper from '../src/FormattingStripper';
import SubtitleProcessor from '../src/SubtitleProcessor';

/**
 * Markdown stripping is a minefield in subtitles: *, _, #, -, > and [] all
 * have established NON-Markdown meanings there. Half of this suite is about
 * what must be left alone. Every assertion is on the exact resulting text.
 */

const md = (text: string): string => new FormattingStripper().stripFormatting(text, { markdown: true });

describe('strips inline Markdown', () => {
    it.each([
        ['**bold**', 'bold'],
        ['*italic*', 'italic'],
        ['***both***', 'both'],
        ['__bold__', 'bold'],
        ['_italic_', 'italic'],
        ['~~gone~~', 'gone'],
        ['`code`', 'code'],
        ['say **this** and *that*, _ok_?', 'say this and that, ok?'],
        ['**bold with *nested italic* inside**', 'bold with nested italic inside'],
        ['*italic with **nested bold** inside*', 'italic with nested bold inside'],
        ['**two\nlines**', 'two\nlines'],
        ['## Chapter One', 'Chapter One'],
        ['[the site](https://example.com/a?b=c)', 'the site'],
        ['[the site](https://example.com "Title")', 'the site'],
        ['![poster](https://example.com/p.png)', 'poster'],
        ['escaped \\*not italic\\* and \\_this\\_', 'escaped *not italic* and _this_'],
        ['**مرحبا** *بالعالم*', 'مرحبا بالعالم'],
        ['**مرحبا**، كيف _حالك_؟', 'مرحبا، كيف حالك؟'],
        ['(**bold**) "*quoted*"', '(bold) "quoted"'],
        // Accepted trade-off: indistinguishable from real bold, and CommonMark agrees
        ['__init__.py', 'init.py'],
    ])('%j -> %j', (input, expected) => {
        expect(md(input)).toBe(expected);
    });
});

describe('leaves subtitle conventions that only LOOK like Markdown alone', () => {
    it.each([
        ['- Hello.\n- Hi there.', 'dialogue dashes are not list bullets'],
        ['# la la la #', 'song lyrics'],
        ['# Just the two of us', 'song lyric with only a leading #'],
        ['>> ANNOUNCER: Welcome back.', 'caption speaker marker is not a blockquote'],
        ['What the f**k is this s**t', 'censoring inside words'],
        ['f*** you, you f***', 'censoring with trailing stars'],
        ['* sighs *', 'spaced asterisks'],
        ['2 * 3 * 4 = 24', 'arithmetic'],
        ['a * b and c * d', 'spaced operators'],
        ['snake_case_name and file_name_here and a_b_c', 'identifiers'],
        ['مرحبا_بالعالم_اليوم', 'Arabic words joined by underscores'],
        ['[MUSIC](laughs)', 'bracketed sound cue followed by parenthetical is not a link'],
        ['[sighs] (quietly)', 'sound cue + aside'],
        ['1. First\n2. Second', 'numbered lines'],
        ['5 * 5', 'single star'],
        ['*unclosed italic', 'no closing delimiter'],
        ['**', 'bare delimiters'],
        ['~ approx ~', 'tildes'],
        ['C:\\Users\\name', 'backslashes that escape nothing'],
        ['rated ***** by critics', 'a run of stars'],
    ])('%j (%s)', (input) => {
        expect(md(input)).toBe(input);
    });

    it('does nothing at all unless the option is on', () => {
        const stripper = new FormattingStripper();

        expect(stripper.stripFormatting('**bold** _it_', {})).toBe('**bold** _it_');
        expect(stripper.stripFormatting('**bold** _it_', { html: true, styles: true })).toBe('**bold** _it_');
    });
});

describe('interplay with other strip options', () => {
    it('link text survives when urls are being replaced too', () => {
        const result = new FormattingStripper().stripFormatting(
            'see [the site](https://example.com) or https://x.org',
            {
                markdown: true,
                urls: true,
            },
        );

        expect(result).toBe('see the site or [URL]');
    });

    it('html + markdown on the same words', () => {
        const result = new FormattingStripper().stripFormatting('<i>**مرحبا**</i> <b>_بالعالم_</b>', {
            html: true,
            markdown: true,
        });

        expect(result).toBe('مرحبا بالعالم');
    });
});

describe('through the real pipeline', () => {
    let tempDir: string;

    beforeAll(async () => {
        tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'subzilla-md-'));
    });

    afterAll(async () => {
        await fs.promises.rm(tempDir, { recursive: true, force: true });
    });

    async function run(name: string, content: string): Promise<string> {
        const input = path.join(tempDir, `${name}.srt`);
        const output = path.join(tempDir, `${name}.out.srt`);

        await fs.promises.writeFile(input, content, 'utf8');
        await new SubtitleProcessor().processFile(input, output, {
            strip: { markdown: true },
            overwriteExisting: true,
            lineEndings: 'lf',
        });

        return fs.promises.readFile(output, 'utf8');
    }

    it('a lone delimiter never pairs with one in a LATER cue (would swallow nothing but must not unwrap across cues)', async () => {
        const content = [
            '1',
            '00:00:01,000 --> 00:00:02,000',
            '*whispering',
            '',
            '2',
            '00:00:03,000 --> 00:00:04,000',
            'plain text',
            '',
            '3',
            '00:00:05,000 --> 00:00:06,000',
            'she said* loudly',
            '',
        ].join('\r\n');

        expect(await run('cross-cue', content)).toBe(
            '1\n00:00:01,000 --> 00:00:02,000\n*whispering\n\n2\n00:00:03,000 --> 00:00:04,000\nplain text\n\n3\n00:00:05,000 --> 00:00:06,000\nshe said* loudly\n',
        );
    });

    it('strips across the two lines of one cue and leaves numbering and timing byte-identical', async () => {
        const content =
            '7\n00:00:01,000 --> 00:00:02,000\n**مرحبا\nبالعالم**\n\n8\n00:00:03,000 --> 00:00:04,000\n_حسناً_\n';

        expect(await run('two-line', content)).toBe(
            '7\n00:00:01,000 --> 00:00:02,000\nمرحبا\nبالعالم\n\n8\n00:00:03,000 --> 00:00:04,000\nحسناً\n',
        );
    });

    it('a cue whose only line was a delimiter pair around nothing keeps the file well-formed', async () => {
        const content = '1\n00:00:01,000 --> 00:00:02,000\n## \nنص\n\n2\n00:00:03,000 --> 00:00:04,000\nتمام\n';
        const output = await run('heading-only', content);

        expect(output).toBe('1\n00:00:01,000 --> 00:00:02,000\n##\nنص\n\n2\n00:00:03,000 --> 00:00:04,000\nتمام\n');
    });
});
