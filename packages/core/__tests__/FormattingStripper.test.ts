import { describe, it, expect, beforeEach } from '@jest/globals';

import { IStripOptions } from '@subzilla/types';

import FormattingStripper from '../src/FormattingStripper';

describe('FormattingStripper', () => {
    let stripper: FormattingStripper;

    beforeEach(() => {
        stripper = new FormattingStripper();
    });

    describe('stripFormatting', () => {
        it('should strip HTML tags when html option is enabled', () => {
            const content = '<b>Bold text</b> and <i>italic text</i>';
            const options: IStripOptions = { html: true };

            const result = stripper.stripFormatting(content, options);

            expect(result).toBe('Bold text and italic text');
        });

        it('should preserve content when no options are enabled', () => {
            const content = '<b>Bold text</b> with colors {c&H0000FF&}';
            const options: IStripOptions = {};

            const result = stripper.stripFormatting(content, options);

            expect(result).toBe(content);
        });

        it('should strip SRT color codes when colors option is enabled', () => {
            const content = 'Normal text {\\c&H0000FF&}Blue text{\\c}';
            const options: IStripOptions = { colors: true };

            const result = stripper.stripFormatting(content, options);

            expect(result).toBe('Normal text Blue text{\\c}');
        });

        it('should strip ASS color codes when colors option is enabled', () => {
            const content = 'Normal text {\\c&H0000FF&}Blue text';
            const options: IStripOptions = { colors: true };

            const result = stripper.stripFormatting(content, options);

            expect(result).toBe('Normal text Blue text');
        });

        it('should strip SRT style codes when styles option is enabled', () => {
            const content = 'Normal text {\\b1}Bold text{\\b0}';
            const options: IStripOptions = { styles: true };

            const result = stripper.stripFormatting(content, options);

            expect(result).toBe('Normal text Bold text');
        });

        it('should strip ASS style codes when styles option is enabled', () => {
            const content = 'Normal text {\\b1\\i1}Bold italic{\\b0\\i0}';
            const options: IStripOptions = { styles: true };

            const result = stripper.stripFormatting(content, options);

            expect(result).toBe('Normal text Bold italic');
        });

        it('should replace URLs with [URL] when urls option is enabled', () => {
            const content = 'Visit https://example.com for more info';
            const options: IStripOptions = { urls: true };

            const result = stripper.stripFormatting(content, options);

            expect(result).toBe('Visit [URL] for more info');
        });

        it('should replace timestamps with [TIMESTAMP] when timestamps option is enabled', () => {
            const content = '00:01:23,456 --> 00:01:25,789\nSubtitle text';
            const options: IStripOptions = { timestamps: true };

            const result = stripper.stripFormatting(content, options);

            expect(result).toBe('[TIMESTAMP]\nSubtitle text');
        });

        it('should replace numbers with # when numbers option is enabled', () => {
            const content = 'Episode 123 aired in 2023';
            const options: IStripOptions = { numbers: true };

            const result = stripper.stripFormatting(content, options);

            expect(result).toBe('Episode # aired in #');
        });

        it('should protect placeholders when stripping brackets', () => {
            const content = 'Visit [URL] at [TIMESTAMP] with [EMOJI] and [other brackets]';
            const options: IStripOptions = { brackets: true };

            const result = stripper.stripFormatting(content, options);

            // Our placeholders should be preserved
            expect(result).toContain('[URL]');
            expect(result).toContain('[TIMESTAMP]');
            expect(result).toContain('[EMOJI]');
            // But other brackets should be removed
            expect(result).not.toContain('[other brackets]');
            expect(result).toContain('other brackets');
        });

        it('should handle URLs and brackets together without corruption', () => {
            const content = 'Visit https://example.com and [some text]';
            const options: IStripOptions = { urls: true, brackets: true };

            const result = stripper.stripFormatting(content, options);

            // URL should be replaced and the placeholder protected from bracket stripping
            expect(result).toContain('[URL]');
            expect(result).not.toContain('https://');
            // Other brackets should be removed
            expect(result).toContain('some text');
            expect(result).not.toContain('[some text]');
        });

        it('should remove punctuation when punctuation option is enabled', () => {
            const content = 'Hello, world! How are you?';
            const options: IStripOptions = { punctuation: true };

            const result = stripper.stripFormatting(content, options);

            expect(result).toBe('Hello world How are you');
        });

        it('should replace emojis with [EMOJI] when emojis option is enabled', () => {
            const content = 'Hello 😊 world 🌍!';
            const options: IStripOptions = { emojis: true };

            const result = stripper.stripFormatting(content, options);

            expect(result).toBe('Hello [EMOJI] world [EMOJI]!');
        });

        it('should remove brackets when brackets option is enabled', () => {
            const content = 'Text [with] (various) {types} <of> brackets';
            const options: IStripOptions = { brackets: true };

            const result = stripper.stripFormatting(content, options);

            expect(result).toBe('Text with various types of brackets');
        });

        it('should remove bidi control characters when bidiControl option is enabled', () => {
            const content = 'Text\u200Ewith\u200Fbidi\u202Acontrols';
            const options: IStripOptions = { bidiControl: true };

            const result = stripper.stripFormatting(content, options);

            expect(result).toBe('Textwithbidicontrols');
        });

        it('should handle complex HTML with nested tags', () => {
            const content = '<font color="red"><b>Bold red text</b></font>';
            const options: IStripOptions = { html: true };

            const result = stripper.stripFormatting(content, options);

            expect(result).toBe('Bold red text');
        });

        it('should handle Arabic text with formatting', () => {
            const content = '<b>مرحبا</b> بالعالم {\\c&H0000FF&}أزرق';
            const options: IStripOptions = { html: true, colors: true };

            const result = stripper.stripFormatting(content, options);

            expect(result).toBe('مرحبا بالعالم أزرق');
        });

        it('should apply multiple stripping options together', () => {
            const content = '<b>Visit</b> https://example.com for episode 123! 😊';
            const options: IStripOptions = {
                html: true,
                urls: true,
                numbers: true,
                emojis: true,
                punctuation: true,
            };

            const result = stripper.stripFormatting(content, options);

            expect(result).toBe('Visit URL for episode  [EMOJI]');
        });

        it('should handle empty content', () => {
            const content = '';
            const options: IStripOptions = { html: true, colors: true };

            const result = stripper.stripFormatting(content, options);

            expect(result).toBe('');
        });

        it('should handle content with only formatting codes', () => {
            const content = '<b></b>{\\c&H0000FF&}{c}';
            const options: IStripOptions = { html: true, colors: true };

            const result = stripper.stripFormatting(content, options);

            expect(result).toBe('{c}'); // Only unmatched codes remain
        });
    });

    describe('Adjacent HTML Tags - Word Concatenation Prevention', () => {
        it('should preserve spaces when stripping adjacent HTML tags in Arabic text', () => {
            const content = '<b>مرحبا</b><i>بك</i>';
            const options: IStripOptions = { html: true };

            const result = stripper.stripFormatting(content, options);

            // Should have a space between the words
            expect(result).toBe('مرحبا بك');
            expect(result).not.toBe('مرحبابك');
        });

        it('should preserve spaces when stripping multiple adjacent font tags in Arabic', () => {
            const content = '<font color="red">هذا</font><font color="blue">نص</font><font color="green">عربي</font>';
            const options: IStripOptions = { html: true };

            const result = stripper.stripFormatting(content, options);

            expect(result).toBe('هذا نص عربي');
            expect(result).not.toBe('هذانصعربي');
        });

        it('should preserve spaces when stripping adjacent HTML tags in English text', () => {
            const content = '<b>Hello</b><i>World</i><u>Test</u>';
            const options: IStripOptions = { html: true };

            const result = stripper.stripFormatting(content, options);

            expect(result).toBe('Hello World Test');
            expect(result).not.toBe('HelloWorldTest');
        });

        it('should handle mixed adjacent tags with various formatting', () => {
            const content = '<b>Bold</b><i>Italic</i><u>Underline</u><s>Strike</s>';
            const options: IStripOptions = { html: true };

            const result = stripper.stripFormatting(content, options);

            expect(result).toBe('Bold Italic Underline Strike');
        });

        it('should not add extra spaces when tags already have spaces between them', () => {
            const content = '<b>Word1</b> <i>Word2</i> <u>Word3</u>';
            const options: IStripOptions = { html: true };

            const result = stripper.stripFormatting(content, options);

            // Should normalize to single spaces
            expect(result).toBe('Word1 Word2 Word3');
        });

        it('should handle complex nested and adjacent tags in Arabic', () => {
            const content = '<font color="red"><b>مرحبا</b></font><font color="blue"><i>بك</i></font>';
            const options: IStripOptions = { html: true };

            const result = stripper.stripFormatting(content, options);

            expect(result).toBe('مرحبا بك');
        });

        it('should preserve existing spaces and add missing ones for adjacent tags', () => {
            const content = '<b>Word1</b><i>Word2</i> <u>Word3</u><s>Word4</s>';
            const options: IStripOptions = { html: true };

            const result = stripper.stripFormatting(content, options);

            expect(result).toBe('Word1 Word2 Word3 Word4');
        });

        it('should handle adjacent tags with no content between them', () => {
            const content = '<b>Text1</b><i></i><u>Text2</u>';
            const options: IStripOptions = { html: true };

            const result = stripper.stripFormatting(content, options);

            // Empty tags should not add extra spaces
            expect(result).toBe('Text1 Text2');
        });

        it('should handle multiline content with adjacent tags', () => {
            const content = '<b>Line1</b><i>Word</i>\n<u>Line2</u><s>Word</s>';
            const options: IStripOptions = { html: true };

            const result = stripper.stripFormatting(content, options);

            expect(result).toBe('Line1 Word\nLine2 Word');
        });

        it('should trim spaces at line boundaries after tag removal', () => {
            const content = '<b>Start</b><i>Middle</i><u>End</u>';
            const options: IStripOptions = { html: true };

            const result = stripper.stripFormatting(content, options);

            // Should not have leading or trailing spaces
            expect(result).toBe('Start Middle End');
            expect(result.startsWith(' ')).toBe(false);
            expect(result.endsWith(' ')).toBe(false);
        });

        it('should handle very long Arabic sentences with many adjacent tags', () => {
            const content = `<b>هذا</b><i>نص</i><u>طويل</u><s>جدا</s><font>مع</font><b>كثير</b><i>من</i><u>العلامات</u>`;
            const options: IStripOptions = { html: true };

            const result = stripper.stripFormatting(content, options);

            expect(result).toBe('هذا نص طويل جدا مع كثير من العلامات');
            // Verify no words are concatenated
            expect(result.split(' ')).toHaveLength(8);
        });

        it('should handle self-closing and adjacent tags', () => {
            const content = '<b>Bold</b><br/><i>Italic</i>';
            const options: IStripOptions = { html: true };

            const result = stripper.stripFormatting(content, options);

            expect(result).toBe('Bold Italic');
        });

        it('should preserve sentence structure in Arabic subtitles', () => {
            const content = `<font color="red">مرحبا</font><font color="blue">بك</font> <font color="green">يا</font><font color="yellow">صديقي</font>`;
            const options: IStripOptions = { html: true };

            const result = stripper.stripFormatting(content, options);

            expect(result).toBe('مرحبا بك يا صديقي');
        });

        it('should handle tags with attributes and adjacent placement', () => {
            const content = '<font color="red" size="12">Red</font><font color="blue" size="14">Blue</font>';
            const options: IStripOptions = { html: true };

            const result = stripper.stripFormatting(content, options);

            expect(result).toBe('Red Blue');
        });
    });
});
