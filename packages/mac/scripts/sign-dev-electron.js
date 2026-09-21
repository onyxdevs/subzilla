// Re-sign the development Electron binary ad hoc before `electron .` runs.
//
// Observed on macOS 26 with Electron 31.7.7: launching the STOCK Electron binary
// makes macOS report "Electron.app was not opened because it contains malware"
// and delete it. The download is authentic (it matches Electron's published
// SHA-256). Stock 31.0.0 is not flagged, and any re-signed 31.7.7 runs fine.
// The consistent discriminator is the executable's code hash (CDHash): re-signing
// gives the bundle a new one. Most likely Apple blocklists that stock hash because
// real malware ships inside unmodified Electron binaries; that part is inference.
//
// Idempotent and quick; also restores the binary if macOS already removed it.
const { execFileSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

if (process.platform !== 'darwin') process.exit(0);

const electronDir = path.dirname(require.resolve('electron/package.json'));
const appPath = path.join(electronDir, 'dist', 'Electron.app');
const binary = path.join(appPath, 'Contents', 'MacOS', 'Electron');

if (!fs.existsSync(binary)) {
    console.log('  • dev Electron binary is missing (macOS may have removed it) - reinstalling');
    fs.rmSync(path.join(electronDir, 'dist'), { recursive: true, force: true });
    fs.rmSync(path.join(electronDir, 'path.txt'), { force: true });
    execFileSync(process.execPath, [path.join(electronDir, 'install.js')], { stdio: 'inherit' });
}

// `codesign -dv` reports on stderr
const info = spawnSync('codesign', ['-dv', appPath], { encoding: 'utf8' }).stderr || '';

if (/^Identifier=net\.onyxdev\.subzilla\.dev$/m.test(info)) {
    process.exit(0); // already re-signed
}

execFileSync('codesign', ['--force', '--deep', '--sign', '-', '--identifier', 'net.onyxdev.subzilla.dev', appPath], {
    stdio: 'inherit',
});
execFileSync('codesign', ['--verify', '--deep', '--strict', appPath], { stdio: 'inherit' });
console.log('  • dev Electron re-signed ad hoc (net.onyxdev.subzilla.dev)');
