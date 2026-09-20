# Security Policy

## Reporting a vulnerability

Please report security issues privately through GitHub's **[Report a vulnerability](https://github.com/onyxdevs/subzilla/security/advisories/new)** form rather than in a public issue.

Include what you found, how to reproduce it, and the affected version or commit.

## Scope

SubZilla reads untrusted subtitle files and, in the desktop app, renders their file names. Reports of particular interest:

- A crafted subtitle file or file name that causes code execution, script injection in the Electron renderer, or writes outside the intended output path.
- Denial of service from a small input (for example catastrophic regular-expression backtracking).
- Anything that weakens the Electron security model (context isolation, the preload bridge, IPC handlers).

## Supported versions

Only the latest release and the `main` branch receive fixes.
