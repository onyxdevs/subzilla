import { IStripOptions } from '@subzilla/types';

export default class FormattingStripper {
    // Only things that really look like a tag: "<" + optional "/" + an ASCII
    // letter, closed on the same line. The old /<[^>]+>/ also swallowed plain
    // text — "5 < 6", «<<quoted>>» — and could eat whole lines between a stray
    // "<" and the next ">" further down the file.
    private htmlTagRegex = /<\/?[a-zA-Z][^<>\r\n]*>/g;
    // Tags that mean "new line" — <br> and block-level elements — collapse a run
    // (plus the inline spaces and at most one real newline hugging each side)
    // into a single real newline. Critical for RTL/Arabic: deleting them with no
    // separator ("<p>مرحبا</p><p>بالعالم</p>") glues two words into one nonsense
    // word. Absorbing the neighbouring newline keeps us from manufacturing a
    // blank line, which SRT readers treat as the end of the cue.
    private lineBreakTagRegex =
        /(?:\r\n|\r|\n)?[^\S\r\n]*<\/?(?:br|p|div|li|tr|h[1-6])(?:\s[^<>\r\n]*)?\/?>(?:[^\S\r\n]*(?:\r\n|\r|\n)?[^\S\r\n]*<\/?(?:br|p|div|li|tr|h[1-6])(?:\s[^<>\r\n]*)?\/?>)*[^\S\r\n]*(?:\r\n|\r|\n)?/gi;
    private htmlEntityRegex = /&(?:#(\d{1,7})|#[xX]([0-9a-fA-F]{1,6})|([a-zA-Z][a-zA-Z0-9]{1,9}));/g;
    private htmlEntities: Record<string, string> = {
        // A plain space: &nbsp; is the classic "two words touching" culprit when
        // a player prints the entity verbatim or drops it.
        nbsp: ' ',
        amp: '&',
        lt: '<',
        gt: '>',
        quot: '"',
        apos: "'",
        lrm: '\u200E',
        rlm: '\u200F',
        zwnj: '\u200C',
        zwj: '\u200D',
        hellip: '…',
        ndash: '–',
        mdash: '—',
        laquo: '«',
        raquo: '»',
        lsquo: '‘',
        rsquo: '’',
        ldquo: '“',
        rdquo: '”',
    };
    private srtColorRegex = /{\\\c&H[0-9A-Fa-f]{6}&}/g;
    private assColorRegex = /\{\\c&H[0-9A-Fa-f]{6}&\}/g;
    private srtStyleRegex = /{\\\w+\d*}/g;
    private assStyleRegex = /\{\\[^}]+\}/g;
    private urlRegex = /https?:\/\/[^\s<>"']+/g;
    private timestampRegex = /\d{2}:\d{2}:\d{2},\d{3} --> \d{2}:\d{2}:\d{2},\d{3}/g;
    private numbersRegex = /\d+/g;
    private punctuationRegex = /[!"#$%&'()*+,-./:;<=>?@[\]^_`{|}~]/g;
    private emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]/gu;
    private bracketsRegex = /[[\](){}⟨⟩<>]/g;
    private bidiControlRegex = /[\u061C\u200E\u200F\u202A-\u202E\u2066-\u2069]/g;

    public stripFormatting(content: string, options: IStripOptions): string {
        let result = content;

        if (options.html) {
            result = this.stripHtmlTags(result);
        }

        // Before urls, so [text](https://…) keeps its text instead of "[URL]"
        if (options.markdown) {
            result = this.stripMarkdown(result);
        }

        // After html, so bidi marks written as entities (&rlm;) are caught too
        if (options.bidiControl) {
            result = this.stripBidiControls(result);
        }

        if (options.colors) {
            result = this.stripColors(result);
        }

        if (options.styles) {
            result = this.stripStyles(result);
        }

        if (options.urls) {
            result = this.stripUrls(result);
        }

        if (options.timestamps) {
            result = this.stripTimestamps(result);
        }

        if (options.numbers) {
            result = this.stripNumbers(result);
        }

        if (options.punctuation) {
            result = this.stripPunctuation(result);
        }

        if (options.emojis) {
            result = this.stripEmojis(result);
        }

        if (options.brackets) {
            result = this.stripBrackets(result);
        }

        return result;
    }

    private stripBidiControls(content: string): string {
        return content.replace(this.bidiControlRegex, '');
    }

    private stripHtmlTags(content: string): string {
        // Line breaks carry meaning: turn <br> into a real newline BEFORE the
        // blanket tag removal below, otherwise it vanishes and the surrounding
        // words touch (e.g. Arabic "مرحبا<br>بالعالم" -> "مرحبابالعالم").
        content = content.replace(this.lineBreakTagRegex, (match: string, offset: number, whole: string) =>
            // No dangling newline when the tag opens or closes the whole text
            offset === 0 || offset + match.length === whole.length ? '' : '\n',
        );

        // Remove every remaining tag, keeping the text it wraps
        content = content.replace(this.htmlTagRegex, '');

        // Entities last: a decoded "&lt;i&gt;" is literal text, not a tag to strip
        return this.decodeHtmlEntities(content);
    }

    private decodeHtmlEntities(content: string): string {
        return content.replace(this.htmlEntityRegex, (match: string, dec?: string, hex?: string, name?: string) => {
            if (name) {
                return this.htmlEntities[name.toLowerCase()] ?? match;
            }

            const codePoint = dec ? parseInt(dec, 10) : parseInt(hex as string, 16);
            const isValid = codePoint > 0 && codePoint <= 0x10ffff && !(codePoint >= 0xd800 && codePoint <= 0xdfff);

            if (!isValid) return match;

            // &#160; is &nbsp; — same plain space
            return codePoint === 0xa0 ? ' ' : String.fromCodePoint(codePoint);
        });
    }

    /**
     * Strip inline Markdown — what machine-translated / LLM-produced subtitles
     * tend to carry: **bold**, *italic*, __bold__, _italic_, ~~strike~~, `code`,
     * [text](url), ## headings.
     *
     * Deliberately conservative, because subtitles use the same characters for
     * other things. Left alone on purpose:
     *   - "- text"      dialogue dashes, not list bullets
     *   - "# la la #"   song lyrics, not a heading (only ##+ counts as heading)
     *   - "f**k", "f***" censoring (delimiters must not be glued inside a word)
     *   - "* sighs *", "2 * 3 * 4" (delimiters must hug the text they wrap)
     *   - "snake_case_names", "[MUSIC](laughs)" (link target must be a URL)
     *   - ">> Speaker:" caption speaker markers, not blockquotes
     */
    private stripMarkdown(content: string): string {
        // One blank-line-delimited block (= one cue) at a time, so a delimiter
        // can never pair with another one several cues further down.
        return content
            .split(/((?:\r\n|\r|\n)[^\S\r\n]*(?:\r\n|\r|\n))/)
            .map((part, index) => (index % 2 === 1 ? part : this.stripMarkdownBlock(part)))
            .join('');
    }

    private stripMarkdownBlock(block: string): string {
        const unwrap = (match: string, _delimiter: string, text: string): string =>
            text.includes('-->') ? match : text;

        let result = block
            // ![alt](url) and [text](url) -> alt / text
            .replace(/!?\[([^[\]\r\n]*)\]\((?:https?:\/\/|www\.|mailto:)[^()\s]*(?:\s+"[^"\r\n]*")?\)/gi, '$1')
            // `code`
            .replace(/(?<!\\)(`)(?=[^\s`])([^`\r\n]+?)(?<=[^\s`])`/g, unwrap)
            // ~~strike~~
            .replace(/(?<!\\)(~~)(?=[^\s~])([^~]+?)(?<=[^\s~])~~(?!~)/g, unwrap)
            // ## Heading (2+ hashes only — a single "#" marks song lyrics)
            .replace(/^[^\S\r\n]*#{2,6}[^\S\r\n]+(?=\S)/gm, '');

        // Emphasis, innermost first: "**bold *italic* bold**" needs a second pass
        for (let pass = 0; pass < 3; pass++) {
            const previous = result;

            result = result
                .replace(/(?<![\p{L}\p{N}*\\])(\*{1,3})(?=[^\s*])([^*]+?)(?<=[^\s*])\1(?![\p{L}\p{N}*])/gu, unwrap)
                .replace(/(?<![\p{L}\p{N}_\\])(_{1,3})(?=[^\s_])([^_]+?)(?<=[^\s_])\1(?![\p{L}\p{N}_])/gu, unwrap);

            if (result === previous) break;
        }

        // Backslash escapes: \* -> *
        return result.replace(/\\([*_`~])/g, '$1');
    }

    private stripColors(content: string): string {
        return content.replace(this.srtColorRegex, '').replace(this.assColorRegex, '');
    }

    private stripStyles(content: string): string {
        return content.replace(this.srtStyleRegex, '').replace(this.assStyleRegex, '');
    }

    private stripUrls(content: string): string {
        return content.replace(this.urlRegex, '[URL]');
    }

    private stripTimestamps(content: string): string {
        return content.replace(this.timestampRegex, '[TIMESTAMP]');
    }

    private stripNumbers(content: string): string {
        return content.replace(this.numbersRegex, '#');
    }

    private stripPunctuation(content: string): string {
        return content.replace(this.punctuationRegex, '');
    }

    private stripEmojis(content: string): string {
        return content.replace(this.emojiRegex, '[EMOJI]');
    }

    private stripBrackets(content: string): string {
        return content.replace(this.bracketsRegex, '');
    }

    private normalizeWhitespace(content: string): string {
        return content
            .replace(/\s+/g, ' ')
            .replace(/^\s+|\s+$/gm, '')
            .replace(/\n\s*\n+/g, '\n\n');
    }
}
