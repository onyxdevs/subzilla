import fs from 'fs';
import os from 'os';
import path from 'path';

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

import { IConfig } from '@subzilla/types';

/**
 * Precedence between the Preferences window and .subzillarc files.
 *
 * The rule: once Preferences has been saved, Preferences is the ONLY source of
 * truth. Until then, .subzillarc seeds the initial values over the built-in
 * defaults.
 *
 * Runs against real .subzillarc files on disk and a fake store that behaves
 * like electron-store where it matters: defaults are materialised into the
 * store on construction (which is exactly what made the old "RC < stored"
 * merge meaningless) and clear() brings them back.
 */

type TRecord = Record<string, unknown>;

class FakeElectronStore {
    public store: TRecord;
    public path = '/fake/preferences.json';
    private readonly defaults: TRecord;

    constructor(options: { defaults: TRecord }) {
        this.defaults = JSON.parse(JSON.stringify(options.defaults));
        this.store = { ...JSON.parse(JSON.stringify(this.defaults)), ...persisted };
    }

    public get(key: string, fallback?: unknown): unknown {
        return key in this.store ? this.store[key] : fallback;
    }

    public set(keyOrObject: string | TRecord, value?: unknown): void {
        if (typeof keyOrObject === 'string') {
            this.store[keyOrObject] = value;
        } else {
            this.store = { ...this.store, ...keyOrObject };
        }

        persisted = JSON.parse(JSON.stringify(this.store));
    }

    public clear(): void {
        this.store = JSON.parse(JSON.stringify(this.defaults));
        persisted = {};
    }
}

// What is "on disk" for the store; survives constructing a new ConfigMapper (= relaunching the app)
let persisted: TRecord = {};

jest.mock('electron-store', () => jest.fn().mockImplementation((options) => new FakeElectronStore(options as never)));

interface IConfigMapper {
    getConfig: () => Promise<IConfig>;
    saveConfig: (config: IConfig) => Promise<void>;
    resetConfig: () => Promise<void>;
}

describe('Mac app: Preferences vs .subzillarc', () => {
    let rcDir: string;
    let launchApp: () => IConfigMapper;

    const writeRc = (content: string, name = '.subzillarc'): void => fs.writeFileSync(path.join(rcDir, name), content);

    beforeEach(async () => {
        persisted = {};
        rcDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'subzilla-rc-'));

        const { ConfigMapper } = await import('../../src/main/preferences');

        // Point the RC search at our temp dir only, so neither the developer's
        // home directory nor this repository's own .subzillarc leaks into the test
        class TestConfigMapper extends ConfigMapper {
            protected async getRcSearchDirs(): Promise<string[]> {
                return [rcDir];
            }
        }

        launchApp = (): IConfigMapper => new TestConfigMapper() as unknown as IConfigMapper;
    });

    afterEach(async () => {
        await fs.promises.rm(rcDir, { recursive: true, force: true });
    });

    describe('before Preferences has ever been saved', () => {
        it('.subzillarc overrides the built-in defaults, including keys that HAVE a default', async () => {
            writeRc('output:\n  lineEndings: crlf\n  bom: false\nstrip:\n  html: true\n  markdown: true\n');

            const config = await launchApp().getConfig();

            // These are the values the old code silently ignored
            expect(config.output?.lineEndings).toBe('crlf');
            expect(config.output?.bom).toBe(false);
            expect(config.strip?.html).toBe(true);
            expect(config.strip?.markdown).toBe(true);
        });

        it('keys the file does not mention keep their built-in defaults', async () => {
            writeRc('strip:\n  html: true\n');

            const config = await launchApp().getConfig();

            expect(config.strip?.bidiControl).toBe(true);
            expect(config.strip?.colors).toBe(false);
            expect(config.output?.bom).toBe(true);
            expect(config.output?.overwriteExisting).toBe(true);
            expect(config.batch?.chunkSize).toBe(5);
        });

        it('is already applied on the very first getConfig() call (no race with the async file load)', async () => {
            writeRc('output:\n  lineEndings: crlf\n');

            const app = launchApp();

            expect((await app.getConfig()).output?.lineEndings).toBe('crlf');
        });

        it('with no .subzillarc at all, the built-in defaults apply', async () => {
            const config = await launchApp().getConfig();

            expect(config.output?.lineEndings).toBe('auto');
            expect(config.strip?.html).toBe(false);
        });

        it('never exposes app-only or bookkeeping keys as conversion options', async () => {
            writeRc('strip:\n  html: true\n');

            expect(Object.keys(await launchApp().getConfig()).sort()).toEqual(['batch', 'input', 'output', 'strip']);
        });
    });

    describe('after Preferences has been saved', () => {
        it('Preferences wins on every key, including one explicitly set back to its default value', async () => {
            writeRc('output:\n  lineEndings: crlf\nstrip:\n  html: true\n  urls: true\n');

            const app = launchApp();
            const shown = await app.getConfig();

            // The user unticks HTML (its built-in default!) and picks LF, then saves
            await app.saveConfig({
                ...shown,
                output: { ...shown.output, lineEndings: 'lf' },
                strip: { ...shown.strip, html: false },
            });

            const config = await app.getConfig();

            expect(config.strip?.html).toBe(false); // not resurrected by the file
            expect(config.output?.lineEndings).toBe('lf');
            expect(config.strip?.urls).toBe(true); // what the window showed was saved
        });

        it('.subzillarc no longer leaks keys that have no built-in default', async () => {
            const app = launchApp();

            await app.saveConfig(await app.getConfig());

            // The file appears (or changes) AFTER the user saved their preferences
            writeRc('output:\n  directory: /tmp/somewhere-else\n  format: ass\nbatch:\n  maxDepth: 2\n');

            const config = await launchApp().getConfig();

            expect(config.output?.directory).toBeUndefined();
            expect(config.output?.format).toBeUndefined();
            expect(config.batch?.maxDepth).toBeUndefined();
        });

        it('still wins after the app is relaunched', async () => {
            writeRc('strip:\n  html: true\n');

            const first = launchApp();
            const shown = await first.getConfig();

            await first.saveConfig({ ...shown, strip: { ...shown.strip, html: false } });

            expect((await launchApp().getConfig()).strip?.html).toBe(false);
        });

        it('Restore Defaults hands control back: built-in defaults, seeded by .subzillarc again', async () => {
            writeRc('strip:\n  html: true\n');

            const app = launchApp();
            const shown = await app.getConfig();

            await app.saveConfig({ ...shown, strip: { ...shown.strip, html: false, emojis: true } });
            await app.resetConfig();

            const config = await app.getConfig();

            expect(config.strip?.html).toBe(true); // from the file again
            expect(config.strip?.emojis).toBe(false); // built-in default again
        });
    });

    describe('installs that predate this rule', () => {
        it('stored values that differ from the defaults count as saved Preferences and win', async () => {
            // An existing preferences.json with a customised value, but no "saved" marker
            persisted = { strip: { html: false, colors: true, bidiControl: true } };
            writeRc('strip:\n  html: true\n  colors: false\n');

            const config = await launchApp().getConfig();

            expect(config.strip?.colors).toBe(true);
            expect(config.strip?.html).toBe(false);
        });
    });

    describe('a broken .subzillarc cannot break conversion', () => {
        it.each([
            ['not YAML at all', '{{{{ : ::: \n\t- ]['],
            ['wrong types', 'strip: yes-please\noutput:\n  lineEndings: sideways\n'],
            ['a list instead of a map', '- a\n- b\n'],
            ['empty file', ''],
        ])('%s is ignored and the built-in defaults apply', async (_name, content) => {
            writeRc(content);

            const config = await launchApp().getConfig();

            expect(config.output?.lineEndings).toBe('auto');
            expect(config.strip).toEqual(expect.objectContaining({ html: false, bidiControl: true }));
            expect(typeof config.strip).toBe('object');
        });
    });
});
