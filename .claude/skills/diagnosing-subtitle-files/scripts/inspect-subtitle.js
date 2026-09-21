#!/usr/bin/env node
/* eslint-disable */
// Inspect a subtitle file the way SubZilla sees it, then show what the real
// pipeline does to it. Read-only: the input is never modified; conversion
// happens on a temp copy.
//
//   node inspect-subtitle.js <file> [--json]
//
// Requires the compiled core package (npx tsc --build).
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.resolve(__dirname, '../../../..');
const file = process.argv[2];
const asJson = process.argv.includes('--json');

if (!file || !fs.existsSync(file)) {
    console.error('usage: inspect-subtitle.js <subtitle-file> [--json]');
    process.exit(2);
}

let core, chardet, iconv;
try {
    core = require(path.join(ROOT, 'packages/core/dist'));
    chardet = require(path.join(ROOT, 'node_modules/chardet'));
    iconv = require(path.join(ROOT, 'node_modules/iconv-lite'));
} catch (error) {
    console.error(`Cannot load the compiled core package. Run "npx tsc --build" in ${ROOT} first.\n(${error.message})`);
    process.exit(2);
}

// Invisible / ambiguous characters worth naming. Anything here that sits BETWEEN
// two words with no real space is a prime suspect for "words touching".
const NOTABLE = {
    0x00a0: 'NBSP',
    0x200b: 'ZWSP',
    0x200c: 'ZWNJ (keep: shapes words)',
    0x200d: 'ZWJ (keep: shapes words)',
    0x200e: 'LRM',
    0x200f: 'RLM',
    0x061c: 'ALM',
    0x202a: 'LRE',
    0x202b: 'RLE',
    0x202c: 'PDF',
    0x202d: 'LRO',
    0x202e: 'RLO',
    0x2066: 'LRI',
    0x2067: 'RLI',
    0x2068: 'FSI',
    0x2069: 'PDI',
    0x0085: 'NEL (line break)',
    0x2028: 'LINE SEPARATOR',
    0x2029: 'PARAGRAPH SEPARATOR',
    0x000b: 'VERTICAL TAB',
    0x000c: 'FORM FEED',
    0xfeff: 'BOM/ZWNBSP',
    0xfffd: 'REPLACEMENT CHAR (decoding already failed upstream)',
    0x00ad: 'SOFT HYPHEN',
};
const STRIP = { html: true, markdown: true, colors: true, styles: true, urls: false, bidiControl: true };
const wordsOf = (text) => text.match(/[\p{L}\p{M}\p{N}\u200C\u200D]+/gu) || [];
const hex = (cp) => 'U+' + cp.toString(16).toUpperCase().padStart(4, '0');

const buffer = fs.readFileSync(file);
const report = { file: path.resolve(file), bytes: buffer.length };

// --- encoding --------------------------------------------------------------
const detected = core.EncodingDetectionService.detectEncodingFromBuffer(buffer);
report.encoding = {
    detected,
    bom:
        buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf
            ? 'UTF-8'
            : buffer[0] === 0xff && buffer[1] === 0xfe
              ? 'UTF-16LE'
              : buffer[0] === 0xfe && buffer[1] === 0xff
                ? 'UTF-16BE'
                : 'none',
    rawChardetTop3: (chardet.analyse(buffer) || []).slice(0, 3).map((m) => `${m.name}:${m.confidence}`),
};
const text = iconv.decode(buffer, detected).replace(/^\uFEFF/, '');
report.encoding.replacementChars = (text.match(/�/g) || []).length;

// --- structure -------------------------------------------------------------
const eol = {
    crlf: (text.match(/\r\n/g) || []).length,
    lf: (text.match(/(?<!\r)\n/g) || []).length,
    cr: (text.match(/\r(?!\n)/g) || []).length,
};
const normalized = text.replace(/\r\n|\r/g, '\n');
const blocks = normalized.trim().split(/\n\s*\n/);
const timing = /^\d{1,2}:\d{2}:\d{2}[,.]\d{1,3}\s*-->/;
const cues = blocks.filter((b) => timing.test((b.split('\n')[1] || '').trim()));
report.structure = {
    lineEndings: eol,
    blocks: blocks.length,
    cues: cues.length,
    // Text blocks with no timing line: usually the tail of a cue that an empty line cut off
    orphanBlocks: blocks
        .filter(
            (b) =>
                !timing.test((b.split('\n')[1] || '').trim()) &&
                !/^\d+$/.test(b.trim()) &&
                !/^(WEBVTT|\[Script Info\])/.test(b),
        )
        .slice(0, 5)
        .map((b) => b.slice(0, 80)),
};

// --- characters and markup -------------------------------------------------
const chars = {};
for (const ch of text) {
    const cp = ch.codePointAt(0);
    if (NOTABLE[cp]) chars[cp] = (chars[cp] || 0) + 1;
}
report.notableCharacters = Object.entries(chars).map(([cp, count]) => ({ char: hex(+cp), name: NOTABLE[cp], count }));

const count = (re) => (text.match(re) || []).length;
report.markup = {
    htmlTags: [
        ...new Set(
            (text.match(/<\/?[a-zA-Z][^<>\r\n]*>/g) || []).map((t) => t.replace(/\s.*?(?=\/?>)/, '').toLowerCase()),
        ),
    ].slice(0, 20),
    htmlEntities: [...new Set(text.match(/&(?:#\d+|#x[0-9a-f]+|[a-z][a-z0-9]+);/gi) || [])].slice(0, 15),
    assOverrides: count(/\{\\[^{}\r\n]+\}/g),
    assBreaks: { '\\N': count(/\\N/g), '\\n': count(/\\n/g), '\\h': count(/\\h/g) },
    markdownLike: {
        bold: count(/\*\*[^*\n]+\*\*/g),
        italicStar: count(/(?<![\p{L}*])\*[^*\s][^*\n]*\*(?![\p{L}*])/gu),
        underscore: count(/(?<![\p{L}_])_[^_\s][^_\n]*_(?![\p{L}_])/gu),
    },
    strayAngleBrackets: count(/<(?![a-zA-Z/])|(?<![a-zA-Z"'/\-])>/g),
};

// Separator-less joins: a notable invisible character directly between two letters
report.suspectJoins = [];
const joinRe =
    /([\p{L}\p{M}]{1,12})([\u00A0\u200B\u200E\u200F\u061C\u202A-\u202E\u2066-\u2069\u0085\u2028\u2029\u000B\u000C]+)([\p{L}\p{M}]{1,12})/gu;
for (const m of normalized.matchAll(joinRe)) {
    if (report.suspectJoins.length >= 10) break;
    report.suspectJoins.push({
        left: m[1],
        between: [...m[2]].map((c) => hex(c.codePointAt(0))).join(' '),
        right: m[3],
    });
}

// --- what the real pipeline does --------------------------------------------
(async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'subzilla-inspect-'));
    const input = path.join(dir, 'input' + path.extname(file));
    const output = path.join(dir, 'output.srt');
    fs.copyFileSync(file, input);

    const log = console.log;
    console.log = () => {}; // the processor is chatty
    try {
        await new core.SubtitleProcessor().processFile(input, output, {
            strip: STRIP,
            overwriteExisting: true,
            lineEndings: 'lf',
            bom: false,
        });
    } catch (error) {
        report.pipeline = { error: error.message };
    } finally {
        console.log = log;
    }

    if (!report.pipeline) {
        const out = fs.readFileSync(output, 'utf8');
        const outBlocks = out.trim().split(/\n\s*\n/);
        const outCues = outBlocks.filter((b) => timing.test((b.split('\n')[1] || '').trim()));
        const changed = [];

        cues.forEach((cue, i) => {
            const before = cue.split('\n').slice(2).join('\n');
            const after = (outCues[i] || '').split('\n').slice(2).join('\n');
            // Compare against what a reader SEES: markup and entities resolved to separators first
            const visible = before
                .replace(/<\/?(?:br|p|div|li|tr|h[1-6])\b[^<>\n]*>|\\N|[\u0085\u2028\u2029\u000B\u000C]/gi, '\n')
                .replace(/&nbsp;|&#160;|\\h|\\n/gi, ' ')
                .replace(/<\/?[a-zA-Z][^<>\n]*>|\{\\[^{}\n]+\}|&(?:lrm|rlm|zwnj|zwj);|[*_~`]/gi, '');
            const a = wordsOf(visible).join(' ');
            const b = wordsOf(after).join(' ');
            if (a !== b && changed.length < 10)
                changed.push({
                    cue: cue.split('\n')[0].trim(),
                    before: before.slice(0, 160),
                    after: after.slice(0, 160),
                    wordsBefore: a.slice(0, 160),
                    wordsAfter: b.slice(0, 160),
                });
        });

        report.pipeline = {
            cuesIn: cues.length,
            cuesOut: outCues.length,
            cueCountPreserved: cues.length === outCues.length,
            cuesWhoseWordsChanged: changed,
        };
    }
    fs.rmSync(dir, { recursive: true, force: true });

    if (asJson) return console.log(JSON.stringify(report, null, 2));

    const p = report.pipeline;
    console.log(`File      ${report.file} (${report.bytes} bytes)`);
    console.log(
        `Encoding  detected=${report.encoding.detected}  bom=${report.encoding.bom}  raw chardet=${report.encoding.rawChardetTop3.join(', ')}  U+FFFD=${report.encoding.replacementChars}`,
    );
    console.log(
        `Structure cues=${report.structure.cues} blocks=${report.structure.blocks}  EOL crlf=${eol.crlf} lf=${eol.lf} cr=${eol.cr}`,
    );
    if (report.structure.orphanBlocks.length)
        console.log(
            `  ! ${report.structure.orphanBlocks.length} text block(s) with no timing line — a blank line is cutting cues short:`,
            report.structure.orphanBlocks.map((b) => JSON.stringify(b)).join(' | '),
        );
    console.log(
        `Invisible ${report.notableCharacters.map((c) => `${c.char} ${c.name} ×${c.count}`).join('; ') || 'none'}`,
    );
    console.log(
        `Markup    tags=[${report.markup.htmlTags.join(' ')}] entities=[${report.markup.htmlEntities.join(' ')}] assOverrides=${report.markup.assOverrides} \\N=${report.markup.assBreaks['\\N']} \\n=${report.markup.assBreaks['\\n']} \\h=${report.markup.assBreaks['\\h']} md=${JSON.stringify(report.markup.markdownLike)} strayAngles=${report.markup.strayAngleBrackets}`,
    );
    if (report.suspectJoins.length) {
        console.log(
            'Suspect   words separated ONLY by an invisible character (they touch on screen in the source itself):',
        );
        report.suspectJoins.forEach((j) => console.log(`            ${j.left} [${j.between}] ${j.right}`));
    }
    if (p.error) return console.log(`Pipeline  FAILED: ${p.error}`);
    console.log(
        `Pipeline  cues ${p.cuesIn} -> ${p.cuesOut} ${p.cueCountPreserved ? '(preserved)' : '!! CUE COUNT CHANGED'}; cues whose visible words changed: ${p.cuesWhoseWordsChanged.length}`,
    );
    p.cuesWhoseWordsChanged.forEach((c) =>
        console.log(
            `  cue ${c.cue}\n    before: ${JSON.stringify(c.before)}\n    after : ${JSON.stringify(c.after)}\n    words : ${c.wordsBefore}\n         -> ${c.wordsAfter}`,
        ),
    );
})();
