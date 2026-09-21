#!/usr/bin/env bash
# Prove that a test discriminates: run it against the OLD version of the source
# files and require that it FAILS there, then restore the new files.
#
#   mutation-check.sh <base-ref> <jest-project> <test-path-pattern> <src-file>...
#
#   mutation-check.sh main core WordBoundary \
#       packages/core/src/FormattingStripper.ts packages/core/src/SubtitleProcessor.ts
#
# Safe by construction: your versions are copied aside first and ALWAYS restored
# on exit (success, failure, or Ctrl-C). Files that do not exist at <base-ref>
# are removed for the run and put back afterwards.
set -euo pipefail

if [ "$#" -lt 4 ]; then
    sed -n '2,12p' "$0" | sed 's/^# \{0,1\}//'
    exit 2
fi

base="$1"; project="$2"; pattern="$3"; shift 3
root="$(git rev-parse --show-toplevel)"
cd "$root"
git rev-parse --verify --quiet "$base^{commit}" >/dev/null || { echo "mutation-check: unknown ref '$base'" >&2; exit 2; }

stash="$(mktemp -d)"
restore() {
    for f in "$@"; do
        if [ -f "$stash/$f" ]; then mkdir -p "$(dirname "$f")"; cp "$stash/$f" "$f"; fi
    done
    rm -rf "$stash"
}
trap 'restore "$@"' EXIT

for f in "$@"; do
    [ -f "$f" ] || { echo "mutation-check: no such file: $f" >&2; exit 2; }
    mkdir -p "$stash/$(dirname "$f")"; cp "$f" "$stash/$f"
    if git cat-file -e "$base:$f" 2>/dev/null; then git show "$base:$f" > "$f"; else rm -f "$f"; fi
done

echo "== running '$pattern' ($project) against sources from $base =="
set +e
npx jest --selectProjects "$project" --testPathPatterns "$pattern" --testTimeout=20000 > "$stash/out.log" 2>&1
status=$?
set -e

summary="$(grep -E '^Tests:' "$stash/out.log" | tail -1 || true)"
failed="$(printf '%s' "$summary" | sed -nE 's/.* ([0-9]+) failed.*/\1/p')"; failed="${failed:-0}"
passed="$(printf '%s' "$summary" | sed -nE 's/.* ([0-9]+) passed.*/\1/p')"; passed="${passed:-0}"
# Names of the tests that fail on the old code
grep -E '^  ● ' "$stash/out.log" | sed -E 's/^  ● /  fails on old: /' | sort -u | head -40 || true
echo "${summary:-<no jest summary>}"

if grep -qE 'error TS[0-9]+|Test suite failed to run' "$stash/out.log"; then
    echo "RESULT: INCONCLUSIVE - the suite did not compile/run against the old sources:"
    grep -E 'error TS[0-9]+|Cannot find|is not a function' "$stash/out.log" | head -5
    echo "(An API the test uses may not exist at $base. A compile error is not a discriminating failure.)"
    exit 3
fi

if [ "$status" -eq 0 ]; then
    echo "RESULT: NOT DISCRIMINATING - every test passes on the old code too ($passed passed). These tests prove nothing about the change."
    exit 1
fi
echo "RESULT: OK - $failed test(s) fail on the old code and $passed pass. Sources restored; now run the suite normally and confirm it is green."
