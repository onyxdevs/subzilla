#!/usr/bin/env bash
# Verify a packaged Subzilla build WITHOUT launching it:
#   1. code signature of every .app in dist-electron is valid
#   2. the Electron download matches Electron's official SHA-256
#   3. every JS package bundled in app.asar is byte-identical to its npm tarball
#
#   verify-mac-bundle.sh            # checks packages/mac/dist-electron
#   verify-mac-bundle.sh --no-npm   # skip step 3 (offline / quick)
#
# Exit 0 only if everything that was checked passed.
set -uo pipefail
root="$(git rev-parse --show-toplevel)"; dist="$root/packages/mac/dist-electron"; fail=0
check_npm=1; [ "${1:-}" = "--no-npm" ] && check_npm=0

apps=(); for d in "$dist"/mac*/Subzilla.app; do [ -d "$d" ] && apps+=("$d"); done
[ "${#apps[@]}" -gt 0 ] || { echo "No packaged app in $dist. Run: yarn workspace @subzilla/mac build" >&2; exit 2; }

echo "== 1. code signatures"
for app in "${apps[@]}"; do
    id="$(codesign -dv "$app" 2>&1 | sed -n 's/^Identifier=//p')"
    if ! out="$(codesign --verify --deep --strict "$app" 2>&1)"; then
        echo "  FAIL  ${app#$dist/}: $out"; fail=1
    elif [ "$id" = "Electron" ]; then
        # Stock Electron's code hash: macOS reports it as 'contains malware' and deletes the app
        echo "  FAIL  ${app#$dist/}: still signed as stock Electron. Is scripts/adhoc-sign.js wired as afterPack?"; fail=1
    else
        echo "  ok    ${app#$dist/}  ($id)"
    fi
done

echo "== 2. Electron binary vs official checksums"
ver="$(node -p "require('$root/node_modules/electron/package.json').version")"
sums="$(curl -fsSL "https://github.com/electron/electron/releases/download/v$ver/SHASUMS256.txt" 2>/dev/null || true)"
if [ -z "$sums" ]; then echo "  SKIP  could not fetch SHASUMS256.txt for v$ver (offline?)"; else
    found=0; seen=""
    for zip in "$HOME/Library/Caches/electron"/*/electron-v"$ver"-darwin-*.zip "$HOME/Library/Caches/electron"/electron-v"$ver"-darwin-*.zip; do
        [ -f "$zip" ] || continue; found=1; name="$(basename "$zip")"
        got="$(shasum -a 256 "$zip" | cut -d' ' -f1)"
        case " $seen " in *" $name:$got "*) continue ;; esac; seen="$seen $name:$got"   # same file cached twice
        want="$(printf '%s\n' "$sums" | awk -v n="$name" '{gsub(/^\*/,"",$2)} $2==n {print $1}')"
        if [ -n "$want" ] && [ "$want" = "$got" ]; then echo "  ok    $name"; else echo "  FAIL  $name: local $got != official ${want:-<not listed>}"; fail=1; fi
    done
    [ "$found" -eq 1 ] || echo "  SKIP  no cached electron-v$ver zip found"
fi

if [ "$check_npm" -eq 1 ]; then
    echo "== 3. bundled packages vs npm"
    work="$(mktemp -d)"; trap 'rm -rf "$work"' EXIT
    (cd "$root" && npx asar extract "${apps[0]}/Contents/Resources/app.asar" "$work/asar") >/dev/null 2>&1 || { echo "  FAIL  cannot extract app.asar"; exit 1; }
    while IFS= read -r pj; do
        dir="$(dirname "$pj")"
        name="$(node -p "require('$pj').name")"; version="$(node -p "require('$pj').version")"
        case "$name" in @subzilla/*) continue ;; esac
        tgz="$(cd "$work" && npm pack "$name@$version" --silent 2>/dev/null | tail -1)"
        [ -n "$tgz" ] || { echo "  SKIP  $name@$version (not fetchable)"; continue; }
        rm -rf "$work/x" && mkdir "$work/x" && tar -xzf "$work/$tgz" -C "$work/x"
        # package.json is rewritten by electron-builder (metadata stripped); nested node_modules are checked on their own
        diffs="$(diff -rq "$work/x/package" "$dir" 2>/dev/null | grep '^Files' | grep -v '/package.json and' || true)"
        if [ -z "$diffs" ]; then echo "  ok    $name@$version"; else echo "  FAIL  $name@$version differs from npm:"; printf '%s\n' "$diffs" | head -3 | sed 's/^/          /'; fail=1; fi
    done < <(find "$work/asar/node_modules" -name package.json -not -path '*/node_modules/*/node_modules/*/node_modules/*' \( -path '*/node_modules/*/package.json' -o -path '*/node_modules/@*/*/package.json' \) -maxdepth 4 | while read -r f; do d="$(dirname "$f")"; b="$(basename "$(dirname "$d")")"; p="$(basename "$d")"; if [ "$b" = "node_modules" ] || [ "${b#@}" != "$b" ]; then echo "$f"; fi; done | sort -u)
fi

[ "$fail" -eq 0 ] && echo "RESULT: OK" || echo "RESULT: FAILED - do not publish or launch this build"
exit "$fail"
