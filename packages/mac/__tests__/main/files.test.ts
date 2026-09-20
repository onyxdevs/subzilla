import fs from 'fs';
import os from 'os';
import path from 'path';

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

import { expandPaths } from '../../src/main/files';

/**
 * Folder drop: runs against a REAL directory tree on disk (no fs mocks), built
 * to look like a messy media library.
 */
describe('expandPaths — dropping folders', () => {
    let root: string;

    const touch = async (relativePath: string, content = 'x'): Promise<string> => {
        const fullPath = path.join(root, relativePath);

        await fs.promises.mkdir(path.dirname(fullPath), { recursive: true });
        await fs.promises.writeFile(fullPath, content);

        return fullPath;
    };

    const relative = (paths: string[]): string[] => paths.map((p) => path.relative(root, p));

    beforeEach(async () => {
        root = await fs.promises.realpath(await fs.promises.mkdtemp(path.join(os.tmpdir(), 'subzilla-drop-')));
    });

    afterEach(async () => {
        await fs.promises.chmod(path.join(root, 'locked'), 0o755).catch(() => undefined);
        await fs.promises.rm(root, { recursive: true, force: true });
    });

    it('walks a dropped folder recursively and returns only subtitle files, in natural order', async () => {
        await touch('Show/S01/ep10.srt');
        await touch('Show/S01/ep2.srt');
        await touch('Show/S01/ep2.mkv');
        await touch('Show/S01/ep1.ASS');
        await touch('Show/S02/deep/deeper/deepest/ep1.ssa');
        await touch('Show/poster.jpg');
        await touch('Show/مسلسل عربي/الحلقة 1.srt');

        const result = await expandPaths([path.join(root, 'Show')]);

        expect(relative(result.validFiles)).toEqual([
            'Show/S01/ep1.ASS',
            'Show/S01/ep2.srt',
            'Show/S01/ep10.srt',
            'Show/S02/deep/deeper/deepest/ep1.ssa',
            'Show/مسلسل عربي/الحلقة 1.srt',
        ]);
        // Non-subtitles INSIDE a folder are not "invalid files", they are just not ours
        expect(result.invalidFiles).toEqual([]);
        expect(result.scannedDirectories).toBe(7);
    });

    it('never re-processes its own output and never picks up .txt from a folder scan', async () => {
        await touch('Movie/movie.srt');
        await touch('Movie/movie.subzilla.srt');
        await touch('Movie/README.txt');
        await touch('Movie/movie.nfo');
        await touch('Movie/movie.srt.bak');

        const result = await expandPaths([path.join(root, 'Movie')]);

        expect(relative(result.validFiles)).toEqual(['Movie/movie.srt']);
    });

    it('still accepts a .txt the user picked explicitly', async () => {
        const txt = await touch('subs.txt');

        expect((await expandPaths([txt])).validFiles).toEqual([txt]);
    });

    it('skips hidden files and folders', async () => {
        await touch('Lib/.git/objects/fake.srt');
        await touch('Lib/.Trashes/old.srt');
        await touch('Lib/._resource-fork.srt');
        await touch('Lib/real.srt');

        expect(relative((await expandPaths([path.join(root, 'Lib')])).validFiles)).toEqual(['Lib/real.srt']);
    });

    it('does not follow symlinks, so a link cycle terminates and nothing is listed twice', async () => {
        await touch('Loop/a/one.srt');
        await fs.promises.symlink(path.join(root, 'Loop'), path.join(root, 'Loop/a/back-to-top'));
        await fs.promises.symlink(path.join(root, 'Loop/a/one.srt'), path.join(root, 'Loop/alias.srt'));

        expect(relative((await expandPaths([path.join(root, 'Loop')])).validFiles)).toEqual(['Loop/a/one.srt']);
    });

    it('treats a .sub with a sibling .idx as VobSub bitmap data and refuses it, dropped directly or found in a folder', async () => {
        const vobsub = await touch('Disc/movie.sub', 'binary-ish');

        await touch('Disc/movie.idx');
        await touch('Disc/microdvd.sub', '{1}{25}Hello');

        expect(relative((await expandPaths([path.join(root, 'Disc')])).validFiles)).toEqual(['Disc/microdvd.sub']);

        const direct = await expandPaths([vobsub]);

        expect(direct.validFiles).toEqual([]);
        expect(direct.invalidFiles).toEqual([vobsub]);
    });

    it('handles files and folders mixed in one drop, de-duplicating a file that arrives both ways', async () => {
        const loose = await touch('loose.srt');
        const inside = await touch('Pack/inside.srt');
        const video = await touch('video.mp4');

        const result = await expandPaths([loose, path.join(root, 'Pack'), inside, video]);

        expect(result.validFiles).toEqual([loose, inside]);
        expect(result.invalidFiles).toEqual([video]);
    });

    it('reports an empty or subtitle-free folder as scanned-with-nothing-found', async () => {
        await fs.promises.mkdir(path.join(root, 'Empty'));
        await touch('NoSubs/a.mkv');

        const result = await expandPaths([path.join(root, 'Empty'), path.join(root, 'NoSubs')]);

        expect(result).toEqual({ validFiles: [], invalidFiles: [], scannedDirectories: 2 });
    });

    it('an unreadable sub-folder is skipped without losing the rest', async () => {
        await touch('locked/secret.srt');
        await touch('open/fine.srt');
        await fs.promises.chmod(path.join(root, 'locked'), 0o000);

        const result = await expandPaths([root]);

        expect(relative(result.validFiles)).toEqual(['open/fine.srt']);
    });

    it('a folder whose NAME ends in .srt is walked, not processed as a file', async () => {
        await touch('weird.srt/actual.srt');

        expect(relative((await expandPaths([path.join(root, 'weird.srt')])).validFiles)).toEqual([
            'weird.srt/actual.srt',
        ]);
    });
});
