// electron-builder "afterPack" hook.
//
// Without a Developer ID certificate electron-builder skips code signing and
// leaves Electron's ORIGINAL ad-hoc signature on a bundle whose contents it has
// just changed (Info.plist, icon, app.asar). That signature no longer matches:
//
//   codesign --verify: "code has no resources but signature indicates they must be present"
//
// Apple Silicon refuses to run code with an invalid signature, and macOS reports
// it as: "Subzilla.app was not opened because it contains malware" — then deletes
// the app. Re-signing ad hoc ("-") makes the signature valid again. It is not a
// substitute for a Developer ID (Gatekeeper still asks users to approve the app
// once), but the app is no longer treated as tampered.
//
// When a real certificate is configured (CSC_LINK / CSC_NAME), electron-builder
// signs after this hook and simply replaces the ad-hoc signature.
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
