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
            const content = '<b>Bold text</b> with colors {\\c&H0000FF&}';
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
            const content = '<b></b>{\\c&H0000FF&}{\\c}';
            const options: IStripOptions = { html: true, colors: true };

            const result = stripper.stripFormatting(content, options);

            expect(result).toBe('{\\c}'); // Only unmatched codes remain
        });
    });
});
