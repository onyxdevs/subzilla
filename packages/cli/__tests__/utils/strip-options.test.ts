import { describe, it, expect } from '@jest/globals';

import { createStripOptions } from '../../src/utils/strip-options';

describe('createStripOptions — markdown', () => {
    it('is off by default and the whole result is undefined when nothing is requested', () => {
        expect(createStripOptions({}, {})).toBeUndefined();
    });

    it('is enabled by the --strip-markdown flag alone', () => {
        expect(createStripOptions({ stripMarkdown: true }, {})).toMatchObject({ markdown: true, html: false });
    });

    it('is enabled from the config file without any flag', () => {
        expect(createStripOptions({}, { strip: { markdown: true } })).toMatchObject({ markdown: true, html: false });
    });

    it('is independent of --strip-html', () => {
        expect(createStripOptions({ stripHtml: true }, {})).toMatchObject({ markdown: false, html: true });
    });

    it('is part of --strip-all', () => {
        expect(createStripOptions({ stripAll: true }, {})).toMatchObject({ markdown: true });
    });
});
