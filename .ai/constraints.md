# Constraints — DON'T DO Rules for Claude (babylon-app)

## Purpose

This file records specific failed approaches, loop traps, and efficiency rules discovered during real sessions working in this codebase. Each entry exists to prevent repeating a mistake or wasting tokens on an approach that won't work.

**This file grows over time. Add new entries whenever a session reveals a pattern worth avoiding.**

---

## Format

Each rule follows:

- **DON'T**: [specific action to avoid]
- **Why**: [what went wrong / why it wastes tokens or causes loops]
- **Instead**: [what to do instead, if applicable]

---

## General

- **DON'T**: Put architectural rules or "how the system works" content in this file.
- **Why**: This file is for Claude-specific anti-patterns and efficiency rules only. Mixing it with architecture turns it into a second architecture.md and both files drift.
- **Instead**: Architectural rules go in `.ai/architecture.md`. Feature-specific rules go in `.ai/features/{feature}.md`.

---

- **DON'T**: Maintain a manual "load these files for task X" navigation guide anywhere in the `.ai/` folder.
- **Why**: These guides go stale immediately after any restructuring and can point to non-existent files.
- **Instead**: The `@import` structure in root `CLAUDE.md` handles context loading automatically. Trust it.

---

## Components

_(empty — add entries as anti-patterns are discovered)_

---

## Services / HTTP

_(empty — add entries as anti-patterns are discovered)_

---

## State / Signals

_(empty — add entries as anti-patterns are discovered)_

---

## Testing

_(empty — add entries as anti-patterns are discovered)_
