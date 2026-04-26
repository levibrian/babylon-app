# Babylon — Brand & Design System Spec

**Date:** 2026-04-09  
**Scope:** Design system only (tokens, typography, spacing, components). No screens.  
**Status:** Approved — ready for implementation.

---

## 1. Design Vision

**Aesthetic Tech Minimalism.**

Babylon is a precision wealth management tool. The UI should feel like the instrument panel of something expensive — calm, data-dense, and completely in control. Every visual decision favors restraint over expression. Space and contrast do the work that lines and decorations used to do.

**Inspiration:** checkout.com — tight letter-spacing, high contrast, Inter family, zero visual noise.

---

## 2. Typography

### Typefaces

| Role | Typeface | Usage |
|------|----------|-------|
| UI text | **Inter** | Headings, labels, nav, body, buttons — everything that is interface |
| Financial data | **Roboto Mono** | Prices, percentages, P&L values, dates, transaction IDs, allocation figures |

### Inter Scale

| Token | Size | Weight | Tracking | Line Height | Usage |
|-------|------|--------|----------|-------------|-------|
| `display-1` | 40px | 700 | -0.04em | 1.05 | Hero portfolio value |
| `display-2` | 28px | 700 | -0.03em | 1.1 | Section hero values |
| `heading-1` | 22px | 700 | -0.025em | 1.2 | Page titles |
| `heading-2` | 18px | 600 | -0.02em | 1.25 | Card headings |
| `heading-3` | 15px | 600 | -0.01em | 1.3 | Sub-section titles |
| `body-lg` | 15px | 400 | 0 | 1.6 | Descriptive body text |
| `body-default` | 13px | 400 | 0 | 1.55 | Default UI text |
| `body-sm` | 12px | 400 | 0 | 1.5 | Secondary text |
| `label` | 11px | 600 | 0.1em | — | Uppercase section labels |
| `label-ui` | 12px | 500 | 0 | — | Buttons, tabs |
| `caption` | 11px | 400 | 0 | — | Helper text, timestamps |

### Roboto Mono Scale

| Token | Size | Weight | Usage |
|-------|------|--------|-------|
| `mono-hero` | 40px | 700 | Main portfolio value |
| `mono-lg` | 28px | 600 | Section totals |
| `mono-table` | 14px | 600 | Table cell values |
| `mono-delta` | 13px–18px | 500 | Percentage deltas |
| `mono-sm` | 13px | 400 | Dates, IDs |
| `mono-xs` | 11px | 400 | Transaction IDs, metadata |

**All Mono values use `font-variant-numeric: tabular-nums`.** Columns always align.

---

## 3. Color Tokens

### Dark Mode

| Token | Value | Usage |
|-------|-------|-------|
| `--color-bg-base` | `#080808` | App background |
| `--color-bg-surface` | `#101010` | Cards, panels |
| `--color-bg-elevated` | `#1A1A1A` | Dropdowns, modals |
| `--color-text-primary` | `#FFFFFF` | Primary text |
| `--color-text-secondary` | `#A3A3A3` | Supporting text |
| `--color-text-muted` | `#525252` | Labels, hints |
| `--color-text-ghost` | `#2E2E2E` | Table headers, disabled |
| `--color-accent` | `#7B2FBE` | CTAs, active states, focus |
| `--color-accent-hover` | `#9D4EDD` | Hover state of accent |
| `--color-gain` | `#10B981` | Positive P&L, gains |
| `--color-loss` | `#F43F5E` | Negative P&L, losses |
| `--color-warning` | `#F59E0B` | Overweight, alerts |
| `--color-info` | `#818CF8` | Informational, underweight |
| `--color-border` | `rgba(255,255,255,0.08)` | Subtle borders (use sparingly) |
| `--color-border-strong` | `rgba(255,255,255,0.14)` | Emphasized borders |

### Light Mode

| Token | Value | Usage |
|-------|-------|-------|
| `--color-bg-base` | `#F7F7F8` | App background |
| `--color-bg-surface` | `#FFFFFF` | Cards, panels |
| `--color-bg-elevated` | `#EFEFEF` | Dropdowns, modals |
| `--color-text-primary` | `#0A0A0A` | Primary text |
| `--color-text-secondary` | `#404040` | Supporting text |
| `--color-text-muted` | `#888888` | Labels, hints |
| `--color-accent` | `#7B2FBE` | Identical to dark — passes contrast on both |
| `--color-gain` | `#059669` | Darker for WCAG AA on white |
| `--color-loss` | `#DC2626` | Darker for WCAG AA on white |
| `--color-warning` | `#D97706` | Darker for light mode |
| `--color-border` | `rgba(0,0,0,0.08)` | Subtle borders |
| `--color-border-strong` | `rgba(0,0,0,0.14)` | Emphasized borders |

### Rules

- **No raw hex values anywhere in code.** Every color reference is a token.
- **Gain/loss never decorative** — only used for financial meaning.
- **Accent never used for text** — only interactive elements and focus states.
- **No borders on cards or tables** — background contrast and spacing carry separation.

---

## 4. Spacing (4px Base Grid)

| Token | Value | Usage |
|-------|-------|-------|
| `--space-1` | 4px | Icon gaps, tight inline |
| `--space-2` | 8px | Label gaps, badge padding |
| `--space-3` | 12px | Button padding-x |
| `--space-4` | 16px | Card padding, input padding |
| `--space-6` | 24px | Section gaps, card gaps |
| `--space-8` | 32px | Page section gaps |
| `--space-12` | 48px | Page horizontal padding |
| `--space-16` | 64px | Large section breaks |

**Rule: every spacing value in code must reference a token. No arbitrary px values.**

---

## 5. Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-xs` | 2px | Hairlines, accent strips |
| `--radius-sm` | 4px | Badges, tags, chips |
| `--radius-md` | 6px | Buttons, inputs, nav items |
| `--radius-lg` | 10px | Cards, panels, modals — maximum |
| `--radius-full` | 9999px | Avatars, toggles, pills |

**Maximum card radius is 10px.** No 16px+ rounding — keeps Babylon precise, not playful.

---

## 6. Shadows

| Token | Value | Usage |
|-------|-------|-------|
| `--shadow-sm` | `0 1px 3px rgba(0,0,0,0.4)` | Subtle lift — nav rows |
| `--shadow-card` | `0 4px 16px rgba(0,0,0,0.5)` | Cards, panels |
| `--shadow-modal` | `0 8px 32px rgba(0,0,0,0.6)` | Modals, drawers, tooltips |
| `--shadow-focus` | `0 0 0 1.5px #7B2FBE` | All focused inputs and interactive elements |

**Focus shadow is the only place accent purple appears in shadow form.**

---

## 7. Navigation

**Expanded sidebar.** Always visible, icon + label, never collapses.

- Width: 190px
- Logo + wordmark at top
- Nav items: icon + label, active state via `rgba(accent, 0.12)` background
- User avatar + name pinned to bottom
- Dark/light mode toggle in sidebar footer

Rationale: Babylon is a dashboard, not a flow. Users navigate freely between parallel sections. Top nav is for linear flows. Sidebar scales as features are added (Recurring Investments, Tax Reports, etc.).

---

## 8. Token Pipeline — Single Source of Truth

```
Figma Variables (dark + light modes)
  ↓ "Export Variables to JSON" plugin
tokens.json  ←  single source of truth
  ↓ Style Dictionary (npm run build:tokens)
  ├── tokens.css     → imported by bebabylon-ui
  └── tailwind.config.tokens.js  → extended by babylon-app
```

**Workflow:** Change a value in Figma → export JSON → `npm run build:tokens` → both platforms update.  
**Repository:** `babylon-tokens/` directory (or dedicated repo when a third platform is added).

---

## 9. Component Inventory (Figma File Structure)

### Page 1 — Tokens
Color swatches (both modes), type specimens (Inter + Mono), spacing grid, radius scale, shadow scale, icon set (Lucide, 20px grid).

### Page 2 — Atoms
Button (Primary, Ghost, Danger · Default/Hover/Disabled), Input (Text, Select, Date · Default/Focus/Error), Badge (Gain, Loss, Neutral, Balanced, Overweight, Underweight), Avatar, Toggle (dark/light), Divider, Skeleton (Text, Card, Row), Toast (Success, Error, Info), Tooltip.

### Page 3 — Molecules
Stat Card (with delta), Table Row (Position, Transaction · Default/Hover/Edit), Form Field (Label+Input+Helper), Nav Item, Insight Card (Warning, Info, Positive), Allocation Bar, Empty State, Error State.

### Page 4 — Organisms
Sidebar (full + collapsed), Portfolio Header, Positions Table, Transaction Form (Add + Edit inline), Chart Panel, Modal (Confirm, Form, Alert).

**Each component has dark and light variants via Figma Variable modes — not duplicated frames.**

---

## 10. Design Rules (enforced in constraints.md)

1. **No raw values.** Every color, spacing, font size, and radius in code references a token.
2. **No lines on tables.** Spacing and hover state carry row separation.
3. **No card borders.** Background contrast creates elevation — no `border: 1px solid`.
4. **Gain/loss are semantic**, not decorative. Never use green/red for anything except financial meaning.
5. **Accent is interactive-only.** Never use `--color-accent` for text or decorative elements.
6. **Mono for data, Inter for everything else.** The rule applies to every component, every screen.
7. **Maximum radius-lg (10px).** No exceptions without explicit design sign-off.
8. **4px grid.** All spacing values must be multiples of 4.
