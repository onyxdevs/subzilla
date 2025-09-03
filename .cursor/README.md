# Cursor Rules Structure

This directory contains optimized rules for Cursor AI assistance in the SubZilla project.

## 📁 Rule Files

### `subzilla-essentials.mdc`

Main development rules covering:

- Core execution principles (SEARCH FIRST, REUSE PATTERNS)
- Architecture patterns and monorepo structure
- TypeScript conventions
- Development workflow

### `ai-corrections.mdc`

Specific corrections for common AI mistakes:

- Prevents unnecessary file creation
- Enforces emoji logging
- Blocks skeleton code generation
- Maintains existing patterns

### `quick-reference.mdc`

Copy-paste examples for:

- Service class patterns
- CLI command structure
- Import conventions
- Error handling templates

## 🚀 Usage

These rules are automatically loaded by Cursor based on file globs:

- `subzilla-essentials.mdc`: Manual reference (not always applied)
- `ai-corrections.mdc`: Always applied to prevent common mistakes
- `quick-reference.mdc`: Manual reference for code examples

## 📝 Maintenance

- Keep rules focused on AI behavior, not documentation
- Update `ai-corrections.mdc` when noticing repeated AI mistakes
- Add new patterns to `quick-reference.mdc` as they emerge
- Review quarterly and remove outdated rules

## 🔄 Migration

Old verbose rules are backed up in `.cursor/rules.backup/` if needed for reference.
