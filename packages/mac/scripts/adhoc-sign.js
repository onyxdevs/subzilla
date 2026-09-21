// electron-builder "afterPack" hook: re-sign the bundle ad hoc.
//
// Without a Developer ID certificate electron-builder skips code signing, so the
// app ships with STOCK Electron's executable and signature (Identifier=Electron).
//
// Observed on macOS 26: a bundle carrying stock Electron 31.7.7's code hash is
// reported as "was not opened because it contains malware" and deleted - even a
// pristine Electron.app whose download matches Electron's published SHA-256.
// Stock 31.0.0 is not flagged; any re-signed 31.7.7 runs fine (7 of 7 launches).
// The discriminator is the executable's CDHash, which re-signing replaces. Most
// likely Apple blocklists that stock hash because real malware ships inside
// unmodified Electron binaries - that last step is inference, the rest is measured.
//
// NOT the cause, despite looking like it: `codesign --verify` on stock Electron
// says "code has no resources but signature indicates they must be present". Every
// stock Electron ships like that, including versions that run without complaint.
//
// Re-signing is not a substitute for a Developer ID (Gatekeeper still asks users
// to approve the app once). With a real certificate configured (CSC_LINK /
// CSC_NAME), electron-builder signs after this hook and replaces the signature.
const { execFileSync } = require('child_process');
const path = require('path');

exports.default = async function adhocSign(context) {
    if (context.electronPlatformName !== 'darwin') return;

    const appPath = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`);

    execFileSync('codesign', ['--force', '--deep', '--sign', '-', appPath], { stdio: 'inherit' });

    // Fail the build rather than ship a bundle macOS will flag
    execFileSync('codesign', ['--verify', '--deep', '--strict', appPath], { stdio: 'inherit' });

    console.log(`  • ad-hoc signed and verified  path=${appPath}`);
};
