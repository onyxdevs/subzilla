import fs from 'fs';
import os from 'os';
import path from 'path';

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import iconv from 'iconv-lite';

import EncodingDetectionService from '../src/EncodingDetectionService';
import SubtitleProcessor from '../src/SubtitleProcessor';

/**
 * Adversarial suite for encoding detection.
 *
 * A wrong guess is the most destructive failure this tool has: the file is
 * rewritten as mojibake, and with overwriteInput + no backup the original is
 * gone. The assertions below therefore check the DECODED TEXT round-trips —
 * not merely the label chardet returned — because e.g. ISO-8859-7 vs
 * windows-1253 are both "right" as long as every character survives.
 */

const SAMPLES: Record<string, string[]> = {
    'windows-1256': [
        'مرحبا بكم في هذا الفيلم',
        'ماذا تفعل هنا يا صديقي؟',
        'لا أعرف ماذا أقول لك',
        'هيا بنا نذهب إلى البيت',
        'أين كنت طوال هذا الوقت؟',
        'لقد انتظرتك طويلاً',
        'هذا ليس ما اتفقنا عليه',
    ],
    'windows-1252': [
        'Où étais-tu pendant tout ce temps ?',
        'Je ne sais pas quoi te dire, vraiment.',
        'C’est déjà l’été… allons à la plage.',
        'Ça ne me plaît pas du tout, désolé.',
    ],
    'windows-1251': [
        'Где ты был всё это время?',
        'Я не знаю, что тебе сказать.',
        'Пойдём домой, уже поздно.',
        'Это не то, о чём мы договаривались.',
    ],
    'windows-1253': ['Πού ήσουν όλο αυτό τον καιρό;', 'Δεν ξέρω τι να σου πω.', 'Πάμε σπίτι, είναι αργά.'],
    'windows-1255': ['איפה היית כל הזמן הזה?', 'אני לא יודע מה להגיד לך.', 'בוא נלך הביתה, כבר מאוחר.'],
    'windows-1254': [
        'Bunca zamandır neredeydin?',
        'Sana ne söyleyeceğimi bilmiyorum.',
        'Yardımın için çok teşekkür ederim.',
    ],
    Shift_JIS: ['今までどこにいたの？', '何と言えばいいのか分からない。', '助けてくれて本当にありがとう。'],
    GB18030: ['你这段时间都去哪儿了？', '我不知道该对你说什么。', '非常感谢你的帮助。'],
    'EUC-KR': ['그동안 어디에 있었어요?', '무슨 말을 해야 할지 모르겠어요.', '도와주셔서 정말 감사합니다.'],
};

const WRAPPERS: Record<string, (text: string) => string> = {
    plain: (text) => text,
    italic: (text) => `<i>${text}</i>`,
    // The killer: long ASCII markup on every line used to out-vote the real text
    font: (text) => `<font color="#ffff00" face="Arial">${text}</font>`,
    ass: (text) => `{\\an8}{\\c&H00FFFF&}${text}`,
};

function buildSrt(lines: string[], cueCount: number, wrap: (text: string) => string): string {
    return Array.from({ length: cueCount }, (_, i) => {
        const second = String(i % 60).padStart(2, '0');

        return `${i + 1}\r\n00:01:${second},000 --> 00:01:${second},900\r\n${wrap(lines[i % lines.length])}\r\n`;
    }).join('\r\n');
}

describe('detection survives markup-heavy legacy files (decoded text must round-trip)', () => {
    const matrix: Array<[string, string, number]> = [];

    for (const encoding of Object.keys(SAMPLES)) {
        for (const wrapper of Object.keys(WRAPPERS)) {
            for (const cueCount of [30, 300]) {
                matrix.push([encoding, wrapper, cueCount]);
            }
        }
    }

    it.each(matrix)('%s / %s markup / %i cues', (encoding, wrapper, cueCount) => {
        const original = buildSrt(SAMPLES[encoding], cueCount, WRAPPERS[wrapper]);
        const bytes = iconv.encode(original, encoding);
        const detected = EncodingDetectionService.detectEncodingFromBuffer(bytes);

        expect(iconv.decode(bytes, detected)).toBe(original);
    });
});

describe('tiny Arabic files (where statistics are weakest)', () => {
    it.each([1, 2, 3, 5])('windows-1256 with %i cue(s), every markup style', (cueCount) => {
        for (const wrap of Object.values(WRAPPERS)) {
            const original = buildSrt(SAMPLES['windows-1256'], cueCount, wrap);
            const bytes = iconv.encode(original, 'windows-1256');

            expect(iconv.decode(bytes, EncodingDetectionService.detectEncodingFromBuffer(bytes))).toBe(original);
        }
    });

    it('the Arabic tie-break never hijacks genuine Hebrew, however short', () => {
        for (const cueCount of [1, 2, 3, 5, 30]) {
            for (const wrap of Object.values(WRAPPERS)) {
                const original = buildSrt(SAMPLES['windows-1255'], cueCount, wrap);
                const bytes = iconv.encode(original, 'windows-1255');
                const detected = EncodingDetectionService.detectEncodingFromBuffer(bytes);

                expect(detected).not.toBe('windows-1256');
                expect(iconv.decode(bytes, detected)).toBe(original);
            }
        }
    });
});

describe('UTF-8 and UTF-16 are decided structurally, not statistically', () => {
    it('BOM-less UTF-8 that is 99% ASCII with one Arabic word is UTF-8', () => {
        const original = `${buildSrt(['Just plain English here, nothing else at all.'], 200, WRAPPERS.font)}\r\n201\r\n00:09:00,000 --> 00:09:01,000\r\nمرحبا\r\n`;

        expect(EncodingDetectionService.detectEncodingFromBuffer(Buffer.from(original, 'utf8'))).toBe('UTF-8');
    });

    it('BOM-less UTF-8 Arabic with heavy markup is UTF-8', () => {
        const bytes = Buffer.from(buildSrt(SAMPLES['windows-1256'], 5, WRAPPERS.font), 'utf8');

        expect(EncodingDetectionService.detectEncodingFromBuffer(bytes)).toBe('UTF-8');
    });

    it('a legacy file is never mistaken for UTF-8', () => {
        const bytes = iconv.encode(buildSrt(SAMPLES['windows-1256'], 5, WRAPPERS.plain), 'windows-1256');

        expect(EncodingDetectionService.detectEncodingFromBuffer(bytes)).not.toBe('UTF-8');
    });

    it.each(['utf16le', 'utf16be'])('BOM-less %s is recognised and round-trips', (encoding) => {
        const original = buildSrt(SAMPLES['windows-1256'], 10, WRAPPERS.italic);
        const bytes = iconv.encode(original, encoding);
        const detected = EncodingDetectionService.detectEncodingFromBuffer(bytes);

        expect(detected.toLowerCase().replace('-', '')).toBe(encoding);
        expect(iconv.decode(bytes, detected)).toBe(original);
    });

    it('pure ASCII, empty and 1-byte buffers do not throw and decode as UTF-8', () => {
        expect(
            EncodingDetectionService.detectEncodingFromBuffer(
                Buffer.from('1\r\n00:00:01,000 --> 00:00:02,000\r\nHi\r\n'),
            ),
        ).toBe('UTF-8');
        expect(EncodingDetectionService.detectEncodingFromBuffer(Buffer.alloc(0))).toBe('UTF-8');
        expect(EncodingDetectionService.detectEncodingFromBuffer(Buffer.from([0x41]))).toBe('UTF-8');
    });

    it('windows-1252 curly quotes and ellipsis decode as characters, not invisible C1 controls', () => {
        const original = buildSrt(SAMPLES['windows-1252'], 30, WRAPPERS.plain);
        const bytes = iconv.encode(original, 'windows-1252');
        const decoded = iconv.decode(bytes, EncodingDetectionService.detectEncodingFromBuffer(bytes));

        expect(decoded).toContain('C’est déjà l’été…');
        expect(decoded).not.toMatch(/[\u0080-\u009F]/);
    });
});

describe('end to end: the file on disk', () => {
    let tempDir: string;

    beforeAll(async () => {
        tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'subzilla-detect-'));
    });

    afterAll(async () => {
        await fs.promises.rm(tempDir, { recursive: true, force: true });
    });

    it('windows-1256 + <font> on every line, overwritten in place, comes out as readable Arabic', async () => {
        const filePath = path.join(tempDir, 'movie.srt');

        await fs.promises.writeFile(
            filePath,
            iconv.encode(buildSrt(SAMPLES['windows-1256'], 120, WRAPPERS.font), 'windows-1256'),
        );

        await new SubtitleProcessor().processFile(filePath, undefined, {
            overwriteInput: true,
            overwriteExisting: true,
            backupOriginal: false,
            bom: true,
            lineEndings: 'crlf',
            strip: { html: true },
        });

        const output = await fs.promises.readFile(filePath, 'utf8');

        expect(output.charCodeAt(0)).toBe(0xfeff);
        expect(output).not.toMatch(/[ÃÇÈÑÍ]/); // cp1256 bytes read as cp1252
        expect(output).not.toContain('�');

        const textLines = output
            .slice(1)
            .split('\r\n\r\n')
            .map((block) => block.split('\r\n')[2]);

        expect(textLines).toHaveLength(120);
        textLines.forEach((line, i) => expect(line).toBe(SAMPLES['windows-1256'][i % SAMPLES['windows-1256'].length]));
    });
});
