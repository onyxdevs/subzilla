import fs from 'fs/promises';
import path from 'path';

// Extensions accepted when the user hands us a file explicitly
export const SUPPORTED_EXTENSIONS = ['.srt', '.sub', '.ass', '.ssa', '.txt'];

// Extensions picked up when scanning a dropped folder. No .txt here: a movie
// folder is full of readme/NFO-style text files that are not subtitles, and
// converting them (possibly in place) would be a nasty surprise.
export const DIRECTORY_SCAN_EXTENSIONS = ['.srt', '.sub', '.ass', '.ssa'];

export interface IExpandedPaths {
    validFiles: string[];
    invalidFiles: string[];
    scannedDirectories: number;
}

function isAlreadyProcessed(fileName: string): boolean {
    return fileName.includes('.subzilla.');
}

/**
 * A .sub next to an .idx of the same name is a VobSub *bitmap* stream, not
 * MicroDVD text. Re-encoding it as text would destroy it.
 */
async function isVobSub(filePath: string): Promise<boolean> {
    if (path.extname(filePath).toLowerCase() !== '.sub') return false;

    const base = filePath.slice(0, -path.extname(filePath).length);

    for (const idx of [`${base}.idx`, `${base}.IDX`]) {
        try {
            await fs.access(idx);

            return true;
        } catch {
            // keep looking
        }
    }

    return false;
}

async function collectFromDirectory(directory: string, found: string[]): Promise<number> {
    let scanned = 1;
    let entries;

    try {
        entries = await fs.readdir(directory, { withFileTypes: true });
    } catch (error) {
        console.warn(`⚠️ Cannot read directory ${directory}:`, error);

        return scanned;
    }

    entries.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

    for (const entry of entries) {
        // Hidden files/folders (.git, .Trashes, ._resource forks) are never subtitles
        if (entry.name.startsWith('.')) continue;

        const entryPath = path.join(directory, entry.name);

        // Dirent types come from lstat: symlinks are neither file nor directory
        // here, so they are skipped and a link cycle can never trap the walk.
        if (entry.isDirectory()) {
            scanned += await collectFromDirectory(entryPath, found);
        } else if (entry.isFile()) {
            const ext = path.extname(entry.name).toLowerCase();

            if (!DIRECTORY_SCAN_EXTENSIONS.includes(ext) || isAlreadyProcessed(entry.name)) continue;

            if (await isVobSub(entryPath)) continue;

            found.push(entryPath);
        }
    }

    return scanned;
}

/**
 * Turn whatever the user dropped/selected — files, folders, or a mix — into a
 * flat list of subtitle files. Folders are walked recursively; anything inside
 * them that is not a subtitle is ignored silently (only explicitly chosen
 * files are reported back as invalid).
 */
export async function expandPaths(inputPaths: string[]): Promise<IExpandedPaths> {
    const validFiles: string[] = [];
    const invalidFiles: string[] = [];
    let scannedDirectories = 0;

    for (const inputPath of inputPaths) {
        // A path we cannot stat is judged by its extension alone; processing
        // will surface the real error (missing file, permissions) per file.
        const stats = await fs.stat(inputPath).catch(() => null);

        if (stats?.isDirectory()) {
            scannedDirectories += await collectFromDirectory(inputPath, validFiles);

            continue;
        }

        const ext = path.extname(inputPath).toLowerCase();
        const fileName = path.basename(inputPath);

        if (!SUPPORTED_EXTENSIONS.includes(ext)) {
            invalidFiles.push(inputPath);
        } else if (isAlreadyProcessed(fileName)) {
            console.log(`⏭️ Skipping already processed file: ${fileName}`);
            invalidFiles.push(inputPath);
        } else if (await isVobSub(inputPath)) {
            console.log(`⏭️ Skipping VobSub bitmap subtitle: ${fileName}`);
            invalidFiles.push(inputPath);
        } else {
            validFiles.push(inputPath);
        }
    }

    return { validFiles: [...new Set(validFiles)], invalidFiles, scannedDirectories };
}
