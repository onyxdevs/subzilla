import fs from 'fs';
import path from 'path';
import vm from 'vm';

import { describe, it, expect, jest } from '@jest/globals';

/**
 * Executes the REAL preferences renderer script against a stub DOM and clicks
 * real buttons. Regression for: "Restore Defaults" did nothing because the
 * button element was stored as this.restoreDefaults, shadowing the method of
 * the same name — the click handler then called a DOM element as a function.
 */

type TListener = (event?: unknown) => unknown;

interface IStubElement {
    id: string;
    checked: boolean;
    value: string;
    textContent: string;
    disabled: boolean;
    dataset: Record<string, string>;
    style: Record<string, string>;
    classList: { add: () => void; remove: () => void; toggle: () => void; contains: () => boolean };
    listeners: Record<string, TListener[]>;
    addEventListener: (type: string, listener: TListener) => void;
    click: () => Promise<unknown[]>;
}

function createElement(id: string): IStubElement {
    const element: IStubElement = {
        id,
        checked: false,
        value: '',
        textContent: '',
        disabled: false,
        dataset: {},
        style: {},
        classList: { add: () => undefined, remove: () => undefined, toggle: () => undefined, contains: () => false },
        listeners: {},
        addEventListener: (type, listener) => {
            (element.listeners[type] ||= []).push(listener);
        },
        // Await handlers so async rejections surface in the test
        click: () => Promise.all((element.listeners.click || []).map((listener) => listener({ target: element }))),
    };

    return element;
}

async function bootPreferences(confirmAnswer: boolean): Promise<{
    elements: Map<string, IStubElement>;
    subzilla: { resetConfig: jest.Mock; getConfig: jest.Mock };
    confirm: jest.Mock;
    errors: unknown[][];
}> {
    const elements = new Map<string, IStubElement>();
    const documentListeners: Record<string, TListener[]> = {};
    const errors: unknown[][] = [];
    const config = { strip: { html: true }, output: { bom: true }, batch: {}, input: {} };

    const subzilla = {
        getConfig: jest.fn(async () => config),
        resetConfig: jest.fn(async () => ({ success: true })),
        saveConfig: jest.fn(async () => ({ success: true })),
        closePreferences: jest.fn(async () => undefined),
        getConfigPath: jest.fn(async () => '/tmp/preferences.json'),
        getAppVersion: jest.fn(async () => '1.0.0'),
        getAppName: jest.fn(async () => 'Subzilla'),
        showInFinder: jest.fn(async () => undefined),
        openFileExternal: jest.fn(async () => undefined),
    };
    const confirm = jest.fn(() => confirmAnswer);

    const document = {
        getElementById: (id: string): IStubElement => {
            if (!elements.has(id)) elements.set(id, createElement(id));

            return elements.get(id) as IStubElement;
        },
        querySelectorAll: (): IStubElement[] => [],
        querySelector: (): null => null,
        addEventListener: (type: string, listener: TListener): void => {
            (documentListeners[type] ||= []).push(listener);
        },
    };
    const window = { subzilla, addEventListener: (): void => undefined, close: (): void => undefined };
    const sandbox = {
        document,
        window,
        confirm,
        alert: jest.fn(),
        console: {
            log: (): void => undefined,
            warn: (): void => undefined,
            error: (...args: unknown[]): number => errors.push(args),
        },
        setTimeout,
        clearTimeout,
    };

    const source = fs.readFileSync(path.join(__dirname, '../../src/renderer/js/preferences.js'), 'utf8');

    vm.runInNewContext(source, sandbox);
    documentListeners.DOMContentLoaded.forEach((listener) => listener());

    // Let the constructor's async loadConfiguration() settle
    await new Promise((resolve) => setTimeout(resolve, 0));

    return { elements, subzilla: subzilla as never, confirm, errors };
}

describe('Preferences window — restoring defaults', () => {
    it('"Restore Defaults" resets the stored config, reloads the form, and asks exactly once', async () => {
        const { elements, subzilla, confirm, errors } = await bootPreferences(true);
        const loadsBefore = subzilla.getConfig.mock.calls.length;

        await (elements.get('restore-defaults') as IStubElement).click();

        expect(confirm).toHaveBeenCalledTimes(1);
        expect(subzilla.resetConfig).toHaveBeenCalledTimes(1);
        expect(subzilla.getConfig.mock.calls.length).toBe(loadsBefore + 1);
        expect(errors).toEqual([]);
    });

    it('"Restore Defaults" does nothing when the user cancels', async () => {
        const { elements, subzilla, confirm } = await bootPreferences(false);

        await (elements.get('restore-defaults') as IStubElement).click();

        expect(confirm).toHaveBeenCalledTimes(1);
        expect(subzilla.resetConfig).not.toHaveBeenCalled();
    });

    it('the Advanced tab "Reset to Defaults" button takes the same path', async () => {
        const { elements, subzilla } = await bootPreferences(true);

        await (elements.get('reset-config-button') as IStubElement).click();

        expect(subzilla.resetConfig).toHaveBeenCalledTimes(1);
    });
});
