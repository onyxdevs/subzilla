import { IStripOptions } from '@subzilla/types/core/options';

export default class FormattingStripper {
    private htmlTagRegex = /<[^>]+>/g;
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
    private richTextTags = [
        'b',
        'i',
        'u',
        's',
        'font',
        'size',
        'color',
        'ruby',
        'rt',
        'rp',
        'style',
        'class',
    ];

    public stripFormatting(content: string, options: IStripOptions): string {
        let result = content;

        if (options.html) {
            result = this.stripHtmlTags(result);
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

    private stripHtmlTags(content: string): string {
        // First, handle specific rich text tags with their content if needed
        this.richTextTags.forEach((tag) => {
            const tagRegex = new RegExp(`<${tag}[^>]*>.*?</${tag}>`, 'gi');

            content = content.replace(tagRegex, (match) => {
                // Extract text between tags
                const text = match.replace(/<[^>]+>/g, '');

                return text;
            });
        });

        // Then remove any remaining HTML tags
        return content.replace(this.htmlTagRegex, '');
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
