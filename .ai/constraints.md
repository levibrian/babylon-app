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

- **DON'T**: Assume any colour, font, spacing, or visual style when building a new component.
- **Why**: Babylon has a defined brand identity. Arbitrary choices (e.g. using Tailwind `emerald` for chart bars) break visual consistency and cause corrective rework.
- **Instead**: Always ask the user for colour/style before implementing any visible UI. Babylon design tokens: Primary `#7B248D`, Accent `#2ECC71`, Bg dark `#181818`, Bg light `#FFFFFF`, Alt dark `#262932`, Alt light `#EEEEEE`, Font: JetBrains Mono.

---

---

## Services / HTTP

_(empty — add entries as anti-patterns are discovered)_

---

## State / Signals

_(empty — add entries as anti-patterns are discovered)_

---

## Testing

_(empty — add entries as anti-patterns are discovered)_

---

## Design / Styling

- **DON'T**: Use raw hex values, hardcoded px sizes, or literal font names anywhere in component code.
- **Why**: babylon-tokens is the single source of truth. Raw values break when tokens update and create visual inconsistency across platforms.
- **Instead**: Reference CSS custom properties (`var(--color-accent)`) or Tailwind token classes (`bg-accent`, `text-gain`).

---

- **DON'T**: Add borders to cards, table rows, or panels.
- **Why**: Babylon's aesthetic is border-free. Elevation and separation come from background contrast and spacing only.
- **Instead**: Use `bg-surface` background on cards. Use spacing to separate rows. Hover states use `rgba(255,255,255,0.025)` background.

---

- **DON'T**: Use `--color-gain` or `--color-loss` for anything except financial P&L values.
- **Why**: These colors are semantic — they communicate financial meaning. Using them decoratively trains users to misread them.
- **Instead**: Use `--color-accent` for interactive highlights, `--color-info` for informational states.

---

- **DON'T**: Use `--color-accent` for body text or decorative elements.
- **Why**: Accent is reserved for interactive states (buttons, active nav, focus rings). Overuse dilutes its meaning.
- **Instead**: Use `--color-text-primary` or `--color-text-secondary` for text.

---

- **DON'T**: Use border-radius larger than `var(--radius-lg)` (10px) on any component.
- **Why**: Larger radii make Babylon feel playful rather than precise. 10px is the maximum.
- **Instead**: `radius-lg` for cards and modals. `radius-md` (6px) for buttons and inputs.

---

- **DON'T**: Use JetBrains Mono for UI text (labels, headings, nav, body copy, buttons).
- **Why**: Mono is reserved for financial data — prices, percentages, P&L, dates, transaction IDs.
- **Instead**: Inter for all UI text. Mono only where the content is a number, date, percentage, or identifier.

---

- **DON'T**: Use spacing values not in the 4px scale (e.g. 5px, 7px, 10px, 15px).
- **Why**: The 4px grid keeps the layout precise and intentional.
- **Instead**: Always use `var(--space-N)` tokens. Scale: 4, 8, 12, 16, 24, 32, 48, 64px.
