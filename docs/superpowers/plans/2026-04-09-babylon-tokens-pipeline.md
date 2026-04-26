# Babylon Tokens Pipeline — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a `babylon-tokens` package as the single source of truth for all design tokens, consumed by both `bebabylon-ui` and `babylon-app` via Style Dictionary.

**Architecture:** A standalone `babylon-tokens/` directory at `D:/Repo/babylon-tokens/` exports a `dist/tokens.css` (CSS custom properties, dark + light modes) and a `dist/tailwind.tokens.js` (Tailwind config extension). Both platforms install it as a local npm package. One `npm run build` regenerates all outputs from `tokens/*.json`.

**Tech Stack:** Style Dictionary v4, Node.js, JSON token files, CSS custom properties, Tailwind CSS config extension.

---

## File Map

**New — `D:/Repo/babylon-tokens/`**
- `package.json` — package definition (`@babylon/tokens`)
- `build.js` — Style Dictionary build script
- `tokens/color.dark.json` — dark mode color tokens
- `tokens/color.light.json` — light mode color tokens
- `tokens/color.shared.json` — mode-invariant colors (accent, gain, loss)
- `tokens/typography.json` — font families, sizes, weights, tracking
- `tokens/spacing.json` — spacing scale
- `tokens/radii.json` — border radius scale
- `tokens/shadows.json` — shadow scale
- `dist/tokens.css` — generated, committed (consumers import this)
- `dist/tailwind.tokens.js` — generated, committed

**Modified — `D:/Repo/bebabylon-ui/`**
- `package.json` — add `@babylon/tokens` local dependency
- `src/styles/tokens.css` — replace contents with single `@import` from babylon-tokens

**Modified — `D:/Repo/babylon-app/`**
- `package.json` — add `@babylon/tokens` local dependency
- `tailwind.config.js` — create/extend with babylon-tokens Tailwind output
- `src/styles/tokens.css` — new file, imports babylon-tokens CSS
- `src/index.html` — add `data-theme="dark"` to `<html>` (default)
- `.ai/constraints.md` — append new design rules from spec

---

## Task 1: Scaffold babylon-tokens package

**Files:**
- Create: `D:/Repo/babylon-tokens/package.json`
- Create: `D:/Repo/babylon-tokens/.gitignore`

- [ ] **Step 1: Create the directory**

```bash
mkdir -p D:/Repo/babylon-tokens
cd D:/Repo/babylon-tokens
```

- [ ] **Step 2: Create package.json**

```json
{
  "name": "@babylon/tokens",
  "version": "1.0.0",
  "description": "Babylon design tokens — single source of truth",
  "type": "module",
  "main": "dist/tailwind.tokens.js",
  "exports": {
    "./css": "./dist/tokens.css",
    "./tailwind": "./dist/tailwind.tokens.js"
  },
  "scripts": {
    "build": "node build.js",
    "build:watch": "node --watch build.js"
  },
  "devDependencies": {
    "style-dictionary": "^4.3.0"
  }
}
```

- [ ] **Step 3: Create .gitignore**

```
node_modules/
```

- [ ] **Step 4: Install dependencies**

```bash
cd D:/Repo/babylon-tokens
npm install
```

Expected: `node_modules/style-dictionary/` created.

- [ ] **Step 5: Commit**

```bash
cd D:/Repo/babylon-tokens
git init
git add package.json .gitignore package-lock.json
git commit -m "feat: scaffold babylon-tokens package"
```

---

## Task 2: Define color tokens — shared (mode-invariant)

**Files:**
- Create: `D:/Repo/babylon-tokens/tokens/color.shared.json`

- [ ] **Step 1: Create tokens/ directory and color.shared.json**

```json
{
  "color": {
    "accent": { "value": "#7B2FBE", "type": "color", "comment": "Brand purple — identical in both modes, passes WCAG AA on black and white" },
    "accent-hover": { "value": "#9D4EDD", "type": "color" },
    "gain": {
      "dark": { "value": "#10B981", "type": "color" },
      "light": { "value": "#059669", "type": "color", "comment": "Darker for WCAG AA contrast on white bg" }
    },
    "loss": {
      "dark": { "value": "#F43F5E", "type": "color" },
      "light": { "value": "#DC2626", "type": "color" }
    },
    "warning": {
      "dark": { "value": "#F59E0B", "type": "color" },
      "light": { "value": "#D97706", "type": "color" }
    },
    "info": {
      "dark": { "value": "#818CF8", "type": "color" },
      "light": { "value": "#4F46E5", "type": "color" }
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
cd D:/Repo/babylon-tokens
git add tokens/color.shared.json
git commit -m "feat: add shared (mode-invariant) color tokens"
```

---

## Task 3: Define color tokens — dark and light modes

**Files:**
- Create: `D:/Repo/babylon-tokens/tokens/color.dark.json`
- Create: `D:/Repo/babylon-tokens/tokens/color.light.json`

- [ ] **Step 1: Create color.dark.json**

```json
{
  "color-dark": {
    "bg-base":      { "value": "#080808", "type": "color" },
    "bg-surface":   { "value": "#101010", "type": "color" },
    "bg-elevated":  { "value": "#1A1A1A", "type": "color" },
    "text-primary":   { "value": "#FFFFFF", "type": "color" },
    "text-secondary": { "value": "#A3A3A3", "type": "color" },
    "text-muted":     { "value": "#525252", "type": "color" },
    "text-ghost":     { "value": "#2E2E2E", "type": "color", "comment": "Table headers, disabled states" },
    "border":         { "value": "rgba(255,255,255,0.08)", "type": "color" },
    "border-strong":  { "value": "rgba(255,255,255,0.14)", "type": "color" },
    "gain":           { "value": "#10B981", "type": "color" },
    "loss":           { "value": "#F43F5E", "type": "color" },
    "warning":        { "value": "#F59E0B", "type": "color" },
    "info":           { "value": "#818CF8", "type": "color" }
  }
}
```

- [ ] **Step 2: Create color.light.json**

```json
{
  "color-light": {
    "bg-base":      { "value": "#F7F7F8", "type": "color" },
    "bg-surface":   { "value": "#FFFFFF", "type": "color" },
    "bg-elevated":  { "value": "#EFEFEF", "type": "color" },
    "text-primary":   { "value": "#0A0A0A", "type": "color" },
    "text-secondary": { "value": "#404040", "type": "color" },
    "text-muted":     { "value": "#888888", "type": "color" },
    "text-ghost":     { "value": "#C0C0C0", "type": "color" },
    "border":         { "value": "rgba(0,0,0,0.08)", "type": "color" },
    "border-strong":  { "value": "rgba(0,0,0,0.14)", "type": "color" },
    "gain":           { "value": "#059669", "type": "color" },
    "loss":           { "value": "#DC2626", "type": "color" },
    "warning":        { "value": "#D97706", "type": "color" },
    "info":           { "value": "#4F46E5", "type": "color" }
  }
}
```

- [ ] **Step 3: Commit**

```bash
cd D:/Repo/babylon-tokens
git add tokens/color.dark.json tokens/color.light.json
git commit -m "feat: add dark and light mode color tokens"
```

---

## Task 4: Define typography, spacing, radii, and shadow tokens

**Files:**
- Create: `D:/Repo/babylon-tokens/tokens/typography.json`
- Create: `D:/Repo/babylon-tokens/tokens/spacing.json`
- Create: `D:/Repo/babylon-tokens/tokens/radii.json`
- Create: `D:/Repo/babylon-tokens/tokens/shadows.json`

- [ ] **Step 1: Create typography.json**

```json
{
  "font": {
    "sans": { "value": "'Inter', system-ui, -apple-system, sans-serif", "type": "fontFamily" },
    "mono": { "value": "'Roboto Mono', 'Courier New', monospace", "type": "fontFamily" }
  },
  "font-size": {
    "display-1": { "value": "40px", "type": "dimension" },
    "display-2": { "value": "28px", "type": "dimension" },
    "heading-1": { "value": "22px", "type": "dimension" },
    "heading-2": { "value": "18px", "type": "dimension" },
    "heading-3": { "value": "15px", "type": "dimension" },
    "body-lg":   { "value": "15px", "type": "dimension" },
    "body":      { "value": "13px", "type": "dimension" },
    "body-sm":   { "value": "12px", "type": "dimension" },
    "label":     { "value": "11px", "type": "dimension" },
    "label-ui":  { "value": "12px", "type": "dimension" },
    "caption":   { "value": "11px", "type": "dimension" }
  },
  "font-weight": {
    "regular": { "value": "400", "type": "fontWeight" },
    "medium":  { "value": "500", "type": "fontWeight" },
    "semibold": { "value": "600", "type": "fontWeight" },
    "bold":    { "value": "700", "type": "fontWeight" }
  },
  "letter-spacing": {
    "display-1": { "value": "-0.04em", "type": "dimension" },
    "display-2": { "value": "-0.03em", "type": "dimension" },
    "heading-1": { "value": "-0.025em", "type": "dimension" },
    "heading-2": { "value": "-0.02em", "type": "dimension" },
    "heading-3": { "value": "-0.01em", "type": "dimension" },
    "label":     { "value": "0.1em", "type": "dimension" }
  },
  "line-height": {
    "display":  { "value": "1.05", "type": "number" },
    "heading":  { "value": "1.2",  "type": "number" },
    "body":     { "value": "1.55", "type": "number" },
    "body-lg":  { "value": "1.6",  "type": "number" },
    "tight":    { "value": "1.3",  "type": "number" }
  }
}
```

- [ ] **Step 2: Create spacing.json**

```json
{
  "space": {
    "1":  { "value": "4px",  "type": "dimension", "comment": "Icon gaps, tight inline" },
    "2":  { "value": "8px",  "type": "dimension", "comment": "Label gaps, badge padding" },
    "3":  { "value": "12px", "type": "dimension", "comment": "Button padding-x" },
    "4":  { "value": "16px", "type": "dimension", "comment": "Card padding, input padding" },
    "6":  { "value": "24px", "type": "dimension", "comment": "Section gaps, card gaps" },
    "8":  { "value": "32px", "type": "dimension", "comment": "Page section gaps" },
    "12": { "value": "48px", "type": "dimension", "comment": "Page horizontal padding" },
    "16": { "value": "64px", "type": "dimension", "comment": "Large section breaks" }
  }
}
```

- [ ] **Step 3: Create radii.json**

```json
{
  "radius": {
    "xs":   { "value": "2px",    "type": "dimension", "comment": "Hairlines, accent strips" },
    "sm":   { "value": "4px",    "type": "dimension", "comment": "Badges, tags, chips" },
    "md":   { "value": "6px",    "type": "dimension", "comment": "Buttons, inputs, nav items" },
    "lg":   { "value": "10px",   "type": "dimension", "comment": "Cards, panels, modals — MAXIMUM" },
    "full": { "value": "9999px", "type": "dimension", "comment": "Avatars, toggles, pills" }
  }
}
```

- [ ] **Step 4: Create shadows.json**

```json
{
  "shadow": {
    "sm":    { "value": "0 1px 3px rgba(0,0,0,0.4)",  "type": "shadow", "comment": "Subtle lift — nav rows" },
    "card":  { "value": "0 4px 16px rgba(0,0,0,0.5)", "type": "shadow", "comment": "Cards, panels" },
    "modal": { "value": "0 8px 32px rgba(0,0,0,0.6)", "type": "shadow", "comment": "Modals, drawers, tooltips" },
    "focus": { "value": "0 0 0 1.5px #7B2FBE",        "type": "shadow", "comment": "All focused inputs and interactive elements" }
  }
}
```

- [ ] **Step 5: Commit**

```bash
cd D:/Repo/babylon-tokens
git add tokens/typography.json tokens/spacing.json tokens/radii.json tokens/shadows.json
git commit -m "feat: add typography, spacing, radii, and shadow tokens"
```

---

## Task 5: Write Style Dictionary build script

**Files:**
- Create: `D:/Repo/babylon-tokens/build.js`

- [ ] **Step 1: Create build.js**

```js
import StyleDictionary from 'style-dictionary';
import { promises as fs } from 'fs';

// --- CSS Variables output ---
// Generates dist/tokens.css with:
//   :root { light mode tokens }
//   [data-theme="dark"] { dark mode overrides }

const sharedSd = new StyleDictionary({
  source: [
    'tokens/color.shared.json',
    'tokens/typography.json',
    'tokens/spacing.json',
    'tokens/radii.json',
    'tokens/shadows.json',
  ],
  platforms: {
    css: {
      transformGroup: 'css',
      buildPath: 'dist/',
      files: [
        {
          destination: 'tokens.shared.css',
          format: 'css/variables',
          options: { selector: ':root' },
        },
      ],
    },
  },
});

const lightSd = new StyleDictionary({
  source: ['tokens/color.light.json'],
  platforms: {
    css: {
      transformGroup: 'css',
      buildPath: 'dist/',
      files: [
        {
          destination: 'tokens.light.css',
          format: 'css/variables',
          // Remap color-light-* → --color-* for clean consumer names
          filter: (token) => token.path[0] === 'color-light',
          options: { selector: ':root' },
        },
      ],
    },
  },
});

const darkSd = new StyleDictionary({
  source: ['tokens/color.dark.json'],
  platforms: {
    css: {
      transformGroup: 'css',
      buildPath: 'dist/',
      files: [
        {
          destination: 'tokens.dark.css',
          format: 'css/variables',
          filter: (token) => token.path[0] === 'color-dark',
          options: { selector: '[data-theme="dark"]' },
        },
      ],
    },
  },
});

await sharedSd.buildAllPlatforms();
await lightSd.buildAllPlatforms();
await darkSd.buildAllPlatforms();

// Merge into single tokens.css
const shared = await fs.readFile('dist/tokens.shared.css', 'utf8');
const light  = await fs.readFile('dist/tokens.light.css',  'utf8');
const dark   = await fs.readFile('dist/tokens.dark.css',   'utf8');

// Rename color-light- and color-dark- prefixes to color- in the merged file
const cleanLight = light.replace(/--color-light-/g, '--color-');
const cleanDark  = dark.replace(/--color-dark-/g,  '--color-');

const merged = [
  '/* Babylon Design Tokens — generated by babylon-tokens */',
  '/* DO NOT EDIT — run npm run build to regenerate */',
  '',
  cleanLight,  // :root — light mode (default)
  '',
  cleanDark,   // [data-theme="dark"] — dark mode override
  '',
  shared,      // :root — shared tokens (accent, typography, spacing, etc.)
].join('\n');

await fs.writeFile('dist/tokens.css', merged);

// Clean up intermediate files
await fs.unlink('dist/tokens.shared.css');
await fs.unlink('dist/tokens.light.css');
await fs.unlink('dist/tokens.dark.css');

// --- Tailwind config output ---
// Generates dist/tailwind.tokens.js — extend() object for tailwind.config.js

const tailwindTokens = {
  colors: {
    accent:         'var(--color-accent)',
    'accent-hover': 'var(--color-accent-hover)',
    gain:           'var(--color-gain)',
    loss:           'var(--color-loss)',
    warning:        'var(--color-warning)',
    info:           'var(--color-info)',
    bg: {
      base:     'var(--color-bg-base)',
      surface:  'var(--color-bg-surface)',
      elevated: 'var(--color-bg-elevated)',
    },
    text: {
      primary:   'var(--color-text-primary)',
      secondary: 'var(--color-text-secondary)',
      muted:     'var(--color-text-muted)',
      ghost:     'var(--color-text-ghost)',
    },
    border: {
      DEFAULT: 'var(--color-border)',
      strong:  'var(--color-border-strong)',
    },
  },
  fontFamily: {
    sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
    mono: ['Roboto Mono', 'Courier New', 'monospace'],
  },
  spacing: {
    '1':  '4px',
    '2':  '8px',
    '3':  '12px',
    '4':  '16px',
    '6':  '24px',
    '8':  '32px',
    '12': '48px',
    '16': '64px',
  },
  borderRadius: {
    xs:   '2px',
    sm:   '4px',
    md:   '6px',
    lg:   '10px',
    full: '9999px',
  },
  boxShadow: {
    sm:    '0 1px 3px rgba(0,0,0,0.4)',
    card:  '0 4px 16px rgba(0,0,0,0.5)',
    modal: '0 8px 32px rgba(0,0,0,0.6)',
    focus: '0 0 0 1.5px #7B2FBE',
  },
};

await fs.mkdir('dist', { recursive: true });
await fs.writeFile(
  'dist/tailwind.tokens.js',
  `// Babylon Design Tokens — generated by babylon-tokens\n// DO NOT EDIT — run npm run build to regenerate\nexport default ${JSON.stringify(tailwindTokens, null, 2)};\n`
);

console.log('✓ babylon-tokens build complete');
console.log('  dist/tokens.css         — CSS custom properties');
console.log('  dist/tailwind.tokens.js — Tailwind config extension');
```

- [ ] **Step 2: Run the build**

```bash
cd D:/Repo/babylon-tokens
npm run build
```

Expected output:
```
✓ babylon-tokens build complete
  dist/tokens.css         — CSS custom properties
  dist/tailwind.tokens.js — Tailwind config extension
```

- [ ] **Step 3: Verify dist/tokens.css contains expected variables**

Open `dist/tokens.css` and confirm it contains:
- `:root` block with `--color-bg-base: #F7F7F8` (light mode default)
- `[data-theme="dark"]` block with `--color-bg-base: #080808`
- `:root` block with `--color-accent: #7B2FBE`
- `--space-4: 16px`, `--radius-lg: 10px`, `--shadow-focus`

- [ ] **Step 4: Commit**

```bash
cd D:/Repo/babylon-tokens
git add build.js dist/tokens.css dist/tailwind.tokens.js
git commit -m "feat: add Style Dictionary build, generate dist outputs"
```

---

## Task 6: Integrate into bebabylon-ui

**Files:**
- Modify: `D:/Repo/bebabylon-ui/package.json`
- Modify: `D:/Repo/bebabylon-ui/src/styles/tokens.css`

- [ ] **Step 1: Add @babylon/tokens as a local dependency**

In `D:/Repo/bebabylon-ui/package.json`, add to `dependencies`:

```json
"@babylon/tokens": "file:../babylon-tokens"
```

Then install:

```bash
cd D:/Repo/bebabylon-ui
npm install
```

Expected: `node_modules/@babylon/tokens/` created as a symlink to `../babylon-tokens`.

- [ ] **Step 2: Replace tokens.css with import**

Replace the entire contents of `D:/Repo/bebabylon-ui/src/styles/tokens.css` with:

```css
/* Babylon Design Tokens — imported from @babylon/tokens */
/* To update: cd ../babylon-tokens && npm run build */
@import '@babylon/tokens/css';
```

- [ ] **Step 3: Verify Vite resolves the import**

```bash
cd D:/Repo/bebabylon-ui
npm run dev
```

Open the browser, inspect `<html>` element. Confirm CSS custom properties are present in `:root` (e.g. `--color-accent: #7B2FBE`, `--space-4: 16px`).

If Vite can't resolve `@babylon/tokens/css`, add to `vite.config.ts`:

```ts
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@babylon/tokens': resolve(__dirname, '../babylon-tokens'),
    },
  },
});
```

- [ ] **Step 4: Remove old hardcoded token values**

The old `tokens.css` had hardcoded hex values. Now they come from `@babylon/tokens`. Confirm no other CSS file in `bebabylon-ui/src/styles/` defines `--color-*`, `--space-*`, `--radius-*`, or `--shadow-*` variables independently.

If duplicates exist, delete them — the imported file is the authority.

- [ ] **Step 5: Commit**

```bash
cd D:/Repo/bebabylon-ui
git add package.json package-lock.json src/styles/tokens.css vite.config.ts
git commit -m "feat: consume @babylon/tokens as single source of truth for CSS variables"
```

---

## Task 7: Integrate into babylon-app

**Files:**
- Modify: `D:/Repo/babylon-app/package.json`
- Create: `D:/Repo/babylon-app/src/styles/tokens.css`
- Create/Modify: `D:/Repo/babylon-app/tailwind.config.js`
- Modify: `D:/Repo/babylon-app/src/index.html`

- [ ] **Step 1: Add @babylon/tokens as a local dependency**

In `D:/Repo/babylon-app/package.json`, add to `dependencies`:

```json
"@babylon/tokens": "file:../babylon-tokens"
```

Then install:

```bash
cd D:/Repo/babylon-app
npm install
```

- [ ] **Step 2: Create src/styles/tokens.css**

```css
/* Babylon Design Tokens — imported from @babylon/tokens */
/* To update: cd ../babylon-tokens && npm run build */
@import '@babylon/tokens/css';
```

- [ ] **Step 3: Import tokens.css in the app**

In `D:/Repo/babylon-app/src/styles.css` (the Angular global styles file), add at the top:

```css
@import './styles/tokens.css';
```

- [ ] **Step 4: Create/update tailwind.config.js**

Check if `tailwind.config.js` exists at `D:/Repo/babylon-app/tailwind.config.js`. If not, create it. Either way, set its contents to:

```js
import babylonTokens from '@babylon/tokens/tailwind';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: babylonTokens,
  },
  plugins: [],
};
```

- [ ] **Step 5: Set default theme on html element**

In `D:/Repo/babylon-app/src/index.html`, update the `<html>` tag:

```html
<html lang="en" data-theme="dark">
```

This sets dark mode as default. The theme toggle component will switch this attribute at runtime.

- [ ] **Step 6: Verify the build**

```bash
cd D:/Repo/babylon-app
npm run build
```

Expected: build completes with no errors. Tailwind purges correctly — no warnings about missing config.

- [ ] **Step 7: Verify tokens in browser**

```bash
npm start
```

Open browser devtools, inspect `<html>` element. Confirm:
- `[data-theme="dark"]` block is active
- `--color-bg-base` resolves to `#080808`
- `--color-accent` resolves to `#7B2FBE`

Toggle `data-theme` to `"light"` in devtools. Confirm `--color-bg-base` switches to `#F7F7F8`.

- [ ] **Step 8: Commit**

```bash
cd D:/Repo/babylon-app
git add package.json package-lock.json src/styles/tokens.css src/styles.css tailwind.config.js src/index.html
git commit -m "feat: consume @babylon/tokens for CSS variables and Tailwind config"
```

---

## Task 8: Update constraints.md with design rules

**Files:**
- Modify: `D:/Repo/babylon-app/.ai/constraints.md`

- [ ] **Step 1: Append design rules section**

Add the following section to the end of `D:/Repo/babylon-app/.ai/constraints.md`:

```markdown
---

## Design / Styling

- **DON'T**: Use raw hex values, hardcoded px sizes, or literal font names anywhere in component code.
- **Why**: babylon-tokens is the single source of truth. Raw values break when tokens update and create visual inconsistency across platforms.
- **Instead**: Reference CSS custom properties (`var(--color-accent)`) or Tailwind token classes (`bg-accent`, `text-gain`).

---

- **DON'T**: Add borders to cards, table rows, or panels.
- **Why**: Babylon's aesthetic is border-free. Elevation and separation come from background contrast (`bg-surface` on `bg-base`) and spacing only.
- **Instead**: Use `bg-surface` background on cards. Use spacing (`space-6`) to separate rows. Hover states use `rgba(255,255,255,0.025)` background.

---

- **DON'T**: Use `--color-gain` or `--color-loss` for anything except financial P&L values.
- **Why**: These colors are semantic — they communicate financial meaning. Using them decoratively trains users to misread them.
- **Instead**: Use `--color-accent` for interactive highlights, `--color-info` for informational states.

---

- **DON'T**: Use `--color-accent` for body text or decorative elements.
- **Why**: Accent is reserved for interactive states (buttons, active nav, focus rings). Overuse dilutes its meaning.
- **Instead**: Use `--color-text-primary` or `--color-text-secondary` for text. Accent only on interactive elements.

---

- **DON'T**: Use border-radius larger than `var(--radius-lg)` (10px) on any component.
- **Why**: Larger radii make Babylon feel playful rather than precise. 10px is the maximum.
- **Instead**: `radius-lg` for cards and modals. `radius-md` (6px) for buttons and inputs.

---

- **DON'T**: Use Roboto Mono for UI text (labels, headings, nav, body copy, buttons).
- **Why**: Mono is reserved for financial data — prices, percentages, P&L, dates, transaction IDs. Mixing fonts for non-data text breaks the visual contract.
- **Instead**: Inter for all UI text. Mono only where the content is a number, date, percentage, or identifier.

---

- **DON'T**: Use spacing values not in the 4px scale (e.g. 5px, 7px, 10px, 15px).
- **Why**: The 4px grid is what keeps the layout feeling precise and intentional. Arbitrary values create misalignment.
- **Instead**: Always use `var(--space-N)` tokens. Nearest grid value: 4, 8, 12, 16, 24, 32, 48, 64px.
```

- [ ] **Step 2: Verify constraints.md still has its original sections intact**

Read the file and confirm the General, Components, Services/HTTP, State/Signals, and Testing sections are all present above the new Design section.

- [ ] **Step 3: Commit**

```bash
cd D:/Repo/babylon-app
git add .ai/constraints.md
git commit -m "docs: add design system rules to constraints.md"
```

---

## Task 9: End-to-end verification

- [ ] **Step 1: Rebuild tokens from source**

```bash
cd D:/Repo/babylon-tokens
npm run build
```

Confirm `dist/tokens.css` and `dist/tailwind.tokens.js` are regenerated with correct timestamps.

- [ ] **Step 2: Verify bebabylon-ui picks up a token change**

In `tokens/color.shared.json`, temporarily change `--color-accent` to `#FF0000`.  
Run `npm run build` in `babylon-tokens/`.  
Start `bebabylon-ui` dev server — confirm buttons and accent elements show red.  
Revert the change, rebuild.

- [ ] **Step 3: Verify babylon-app picks up a token change**

Repeat the same test in `babylon-app`. Confirm Tailwind `bg-accent` class resolves to the updated value.  
Revert and rebuild.

- [ ] **Step 4: Final commit**

```bash
cd D:/Repo/babylon-tokens
git add .
git commit -m "chore: verified end-to-end token pipeline across both platforms"
```
