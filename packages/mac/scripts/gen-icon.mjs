// Renders assets/icon.png (1024² full-bleed, opaque) to match assets/icon.svg pixel-for-pixel,
// then builds assets/icon.icns from it on macOS (sips + iconutil — the same tools Xcode uses).
// Dependency-free PNG path: no rsvg/cairo/sharp on this machine, and the design is just two
// rounded "subtitle bars" over a flat green field, so we rasterize it directly. Full-bleed is
// deliberate — opaque to every edge, no transparent margin (macOS 26 Tahoe "icon jail").
// Run: node packages/mac/scripts/gen-icon.mjs   (or: yarn workspace @subzilla/mac icon)
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';

const S = 1024;
const BASE = [0x27, 0xae, 0x60]; // #27ae60 — gecko green (nods to the 🦎 mascot)
const BAR = [0xff, 0xff, 0xff]; // #ffffff — the subtitle/caption lines

// Two pill-shaped subtitle bars (mirror icon.svg exactly): a long line + a short line, centred
// horizontally near the middle. hh == r == 48 makes each bar a full pill.
const BARS = [
    { cx: 512, cy: 444, hw: 262, hh: 48, r: 48 }, // long line  (svg: x250 y396 w524 h96)
    { cx: 512, cy: 580, hw: 152, hh: 48, r: 48 }, // short line (svg: x360 y532 w304 h96)
];

// Signed distance to a rounded rect (<0 inside). Standard SDF — cheap and exact for the pills.
function sdRoundRect(px, py, b) {
    const qx = Math.abs(px - b.cx) - b.hw + b.r;
    const qy = Math.abs(py - b.cy) - b.hh + b.r;
    const ax = Math.max(qx, 0);
    const ay = Math.max(qy, 0);
    return Math.hypot(ax, ay) + Math.min(Math.max(qx, qy), 0) - b.r;
}

const N = 4; // 4×4 supersampling so the pill edges land crisp, not jaggy.
const [bgR, bgG, bgB] = BASE; // flat green field — bars composite over it by coverage
const raw = Buffer.alloc(S * (S * 4 + 1)); // +1 filter byte per scanline
let p = 0;
for (let y = 0; y < S; y++) {
    raw[p++] = 0; // filter: none
    for (let x = 0; x < S; x++) {
        let hits = 0;
        for (let sy = 0; sy < N; sy++) {
            const py = y + (sy + 0.5) / N;
            for (let sx = 0; sx < N; sx++) {
                const px = x + (sx + 0.5) / N;
                if (BARS.some((b) => sdRoundRect(px, py, b) < 0)) hits++;
            }
        }
        const cov = hits / (N * N);
        raw[p++] = Math.round(bgR * (1 - cov) + BAR[0] * cov);
        raw[p++] = Math.round(bgG * (1 - cov) + BAR[1] * cov);
        raw[p++] = Math.round(bgB * (1 - cov) + BAR[2] * cov);
        raw[p++] = 255; // opaque — full-bleed, no transparent margin
    }
}

// minimal PNG writer
const crcTable = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        t[n] = c >>> 0;
    }
    return t;
})();
function crc32(buf) {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(td));
    return Buffer.concat([len, td, crc]);
}
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(S, 0);
ihdr.writeUInt32BE(S, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 6; // color type RGBA
const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
]);

const assets = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets');
const pngPath = join(assets, 'icon.png');
writeFileSync(pngPath, png);
console.log('wrote', pngPath, png.length, 'bytes');

// macOS: turn the 1024² master into a multi-resolution .icns (what electron-builder consumes).
if (process.platform === 'darwin') {
    const iconset = mkdtempSync(join(tmpdir(), 'subzilla-icon-')) + '/icon.iconset';
    execFileSync('mkdir', ['-p', iconset]);
    // name → pixel size; @2x variants are the Retina renditions of the same point size.
    const renditions = [
        ['icon_16x16.png', 16],
        ['icon_16x16@2x.png', 32],
        ['icon_32x32.png', 32],
        ['icon_32x32@2x.png', 64],
        ['icon_128x128.png', 128],
        ['icon_128x128@2x.png', 256],
        ['icon_256x256.png', 256],
        ['icon_256x256@2x.png', 512],
        ['icon_512x512.png', 512],
        ['icon_512x512@2x.png', 1024],
    ];
    for (const [name, size] of renditions) {
        execFileSync('sips', ['-z', String(size), String(size), pngPath, '--out', join(iconset, name)], {
            stdio: 'ignore',
        });
    }
    const icnsPath = join(assets, 'icon.icns');
    execFileSync('iconutil', ['-c', 'icns', iconset, '-o', icnsPath]);
    rmSync(dirname(iconset), { recursive: true, force: true });
    console.log('wrote', icnsPath);
} else {
    console.log('skipping .icns (not macOS) — electron-builder can generate it from icon.png');
}
