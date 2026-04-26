# SPEC-003 Plan A — App Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the `/v2` route shell — sidebar (desktop), mobile topbar, mobile drawer, and global filter store — that all future SPEC-003 redesign screens will mount inside, while leaving all existing routes untouched.

**Architecture:** A new `ShellComponent` acts as the layout for a `/v2` nested route tree. All redesigned screens live as lazy-loaded children of `/v2`. Existing routes (`/wealth`, `/transactions`, `/settings`, etc.) are untouched during this phase. A singleton `FilterStore` holds the global asset-class filter state (Stock · ETF · Bond · Crypto) as Angular Signals. A cleanup task at the end of the full redesign (Plans A–E complete) will remove the old routes and components.

**Tech Stack:** Angular 20 standalone components, OnPush change detection, Angular Signals, Angular Router nested routes, SCSS with `:host` CSS custom properties, Lucide Angular icons, Karma/Jasmine for unit tests.

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/stores/filter.store.ts` | **Create** | Global asset-class filter signal state |
| `src/stores/filter.store.spec.ts` | **Create** | FilterStore unit tests |
| `src/components/v2/shell/shell.component.ts` | **Create** | Layout shell — sidebar + topbar + router-outlet |
| `src/components/v2/shell/shell.component.html` | **Create** | Shell layout template |
| `src/components/v2/shell/shell.component.scss` | **Create** | Shell layout styles |
| `src/components/v2/shell/sidebar/sidebar.component.ts` | **Create** | Desktop sidebar with collapse + user submenu |
| `src/components/v2/shell/sidebar/sidebar.component.html` | **Create** | Sidebar template |
| `src/components/v2/shell/sidebar/sidebar.component.scss` | **Create** | Sidebar styles |
| `src/components/v2/shell/mobile-topbar/mobile-topbar.component.ts` | **Create** | Mobile-only top bar (hamburger + wordmark + avatar) |
| `src/components/v2/shell/mobile-topbar/mobile-topbar.component.html` | **Create** | Mobile topbar template |
| `src/components/v2/shell/mobile-topbar/mobile-topbar.component.scss` | **Create** | Mobile topbar styles |
| `src/components/v2/shell/mobile-drawer/mobile-drawer.component.ts` | **Create** | Mobile slide-in nav drawer |
| `src/components/v2/shell/mobile-drawer/mobile-drawer.component.html` | **Create** | Mobile drawer template |
| `src/components/v2/shell/mobile-drawer/mobile-drawer.component.scss` | **Create** | Mobile drawer + overlay styles |
| `src/components/v2/placeholder/placeholder.component.ts` | **Create** | Shared placeholder page for unimplemented v2 routes |
| `src/components/v2/placeholder/placeholder.component.html` | **Create** | Placeholder template |
| `src/app-routes.ts` | **Modify** | Add `/v2` nested routes with ShellComponent as layout |

---

## Design Tokens Reference

All v2 components scope these CSS custom properties on `:host`:

```scss
:host {
  --bg:           #08080A;
  --surface:      #0E0E12;
  --raised:       #141418;
  --hover:        #17171C;
  --accent:       #7B2FBE;
  --accent-dim:   rgba(123,47,190,0.07);
  --accent-mid:   rgba(123,47,190,0.18);
  --accent-bdr:   rgba(123,47,190,0.3);
  --accent-hover: #9D4EDD;
  --border:       rgba(255,255,255,0.05);
  --border-mid:   rgba(255,255,255,0.09);
  --border-hi:    rgba(255,255,255,0.14);
  --text:         #EEEEF2;
  --muted:        #52525F;
  --mid:          #8585A0;
  --sidebar-w:    220px;
  --sidebar-collapsed-w: 60px;
  --topbar-h:     54px;
  --motion:       200ms ease-out;
  --motion-drawer: 220ms cubic-bezier(0.16, 1, 0.3, 1);
}
```

---

## Task 1: FilterStore

**Files:**
- Create: `src/stores/filter.store.ts`
- Create: `src/stores/filter.store.spec.ts`

- [ ] **Step 1: Create the FilterStore**

```typescript
// src/stores/filter.store.ts
import { Injectable, computed, signal } from '@angular/core';

export type AssetClass = 'Stock' | 'ETF' | 'Bond' | 'Crypto';

export const ALL_ASSET_CLASSES: AssetClass[] = ['Stock', 'ETF', 'Bond', 'Crypto'];

@Injectable({ providedIn: 'root' })
export class FilterStore {
  private readonly _active = signal<Set<AssetClass>>(new Set(ALL_ASSET_CLASSES));

  readonly active = this._active.asReadonly();
  readonly allActive = computed(() => this._active().size === ALL_ASSET_CLASSES.length);

  toggle(cls: AssetClass): void {
    const next = new Set(this._active());
    if (next.has(cls)) {
      next.delete(cls);
    } else {
      next.add(cls);
    }
    this._active.set(next);
  }

  selectAll(): void {
    this._active.set(new Set(ALL_ASSET_CLASSES));
  }

  isActive(cls: AssetClass): boolean {
    return this._active().has(cls);
  }
}
```

- [ ] **Step 2: Write FilterStore tests**

```typescript
// src/stores/filter.store.spec.ts
import { TestBed } from '@angular/core/testing';
import { FilterStore, ALL_ASSET_CLASSES } from './filter.store';

describe('FilterStore', () => {
  let store: FilterStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    store = TestBed.inject(FilterStore);
  });

  it('starts with all asset classes active', () => {
    expect(store.allActive()).toBeTrue();
    for (const cls of ALL_ASSET_CLASSES) {
      expect(store.isActive(cls)).toBeTrue();
    }
  });

  it('toggle removes an active class', () => {
    store.toggle('ETF');
    expect(store.isActive('ETF')).toBeFalse();
    expect(store.allActive()).toBeFalse();
  });

  it('toggle re-adds an inactive class', () => {
    store.toggle('ETF');
    store.toggle('ETF');
    expect(store.isActive('ETF')).toBeTrue();
    expect(store.allActive()).toBeTrue();
  });

  it('selectAll restores all classes after partial deselection', () => {
    store.toggle('Stock');
    store.toggle('Bond');
    store.selectAll();
    expect(store.allActive()).toBeTrue();
  });

  it('can deselect all classes', () => {
    for (const cls of ALL_ASSET_CLASSES) {
      store.toggle(cls);
    }
    expect(store.allActive()).toBeFalse();
    for (const cls of ALL_ASSET_CLASSES) {
      expect(store.isActive(cls)).toBeFalse();
    }
  });
});
```

- [ ] **Step 3: Run tests**

```bash
cd /mnt/d/Repo/babylon-app
npx ng test --include=src/stores/filter.store.spec.ts --watch=false
```

Expected: 5 specs, 0 failures.

- [ ] **Step 4: Commit**

```bash
git add src/stores/filter.store.ts src/stores/filter.store.spec.ts
git commit -m "feat(v2): add FilterStore for global asset-class filter state"
```

---

## Task 2: PlaceholderComponent

Stub pages for all v2 routes so the shell has something to render. These get replaced by Plans B–E.

**Files:**
- Create: `src/components/v2/placeholder/placeholder.component.ts`
- Create: `src/components/v2/placeholder/placeholder.component.html`

- [ ] **Step 1: Create PlaceholderComponent**

```typescript
// src/components/v2/placeholder/placeholder.component.ts
import { Component, ChangeDetectionStrategy, input } from '@angular/core';

@Component({
  selector: 'app-v2-placeholder',
  standalone: true,
  templateUrl: './placeholder.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlaceholderComponent {
  label = input<string>('Coming soon');
}
```

```html
<!-- src/components/v2/placeholder/placeholder.component.html -->
<div style="
  display:flex;
  align-items:center;
  justify-content:center;
  height:100%;
  color:#52525F;
  font-family:'Inter',sans-serif;
  font-size:13px;
  letter-spacing:0.04em;
">{{ label() }}</div>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/v2/placeholder/
git commit -m "feat(v2): add placeholder component for unimplemented v2 routes"
```

---

## Task 3: ShellComponent

The layout wrapper — sidebar on desktop, topbar on mobile, `<router-outlet>` for page content. Owns drawer-open state and passes it down to child components.

**Files:**
- Create: `src/components/v2/shell/shell.component.ts`
- Create: `src/components/v2/shell/shell.component.html`
- Create: `src/components/v2/shell/shell.component.scss`

- [ ] **Step 1: Create shell.component.ts**

```typescript
// src/components/v2/shell/shell.component.ts
import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from './sidebar/sidebar.component';
import { MobileTopbarComponent } from './mobile-topbar/mobile-topbar.component';
import { MobileDrawerComponent } from './mobile-drawer/mobile-drawer.component';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, MobileTopbarComponent, MobileDrawerComponent],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShellComponent {
  drawerOpen = signal(false);
}
```

- [ ] **Step 2: Create shell.component.html**

```html
<!-- src/components/v2/shell/shell.component.html -->
<div class="shell">
  <app-sidebar (openDrawer)="drawerOpen.set(true)" />
  <div class="shell-main">
    <app-mobile-topbar (openMenu)="drawerOpen.set(true)" />
    <div class="shell-content">
      <router-outlet />
    </div>
  </div>
  <app-mobile-drawer [open]="drawerOpen()" (close)="drawerOpen.set(false)" />
</div>
```

- [ ] **Step 3: Create shell.component.scss**

```scss
// src/components/v2/shell/shell.component.scss
:host {
  display: block;
  height: 100vh;
  overflow: hidden;
  background: #08080A;
}

.shell {
  display: flex;
  height: 100%;
  width: 100%;
}

.shell-main {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.shell-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/v2/shell/shell.component.*
git commit -m "feat(v2): add ShellComponent layout skeleton"
```

---

## Task 4: SidebarComponent

Desktop sidebar: 220px expanded / 60px collapsed, left 2px accent bar on active item, user profile at bottom with Profile · Settings · Log out submenu.

**Files:**
- Create: `src/components/v2/shell/sidebar/sidebar.component.ts`
- Create: `src/components/v2/shell/sidebar/sidebar.component.html`
- Create: `src/components/v2/shell/sidebar/sidebar.component.scss`

- [ ] **Step 1: Create sidebar.component.ts**

```typescript
// src/components/v2/shell/sidebar/sidebar.component.ts
import {
  Component, ChangeDetectionStrategy, output, signal, inject,
  HostListener,
} from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { UserStore } from '../../../../services/user.store';
import { AuthService } from '../../../../services/auth.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarComponent {
  openDrawer = output<void>();

  private userStore = inject(UserStore);
  private authService = inject(AuthService);

  collapsed = signal(false);
  submenuOpen = signal(false);

  user = this.userStore.currentUser;

  get initials(): string {
    const u = this.user();
    if (!u) return '?';
    const name = u.username ?? u.email ?? '';
    return name.slice(0, 2).toUpperCase();
  }

  toggleCollapse(): void {
    this.collapsed.update(v => !v);
    if (this.submenuOpen()) this.submenuOpen.set(false);
  }

  toggleSubmenu(): void {
    this.submenuOpen.update(v => !v);
  }

  closeSubmenu(): void {
    this.submenuOpen.set(false);
  }

  logout(): void {
    this.authService.logout();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.submenuOpen()) return;
    const target = event.target as Element;
    if (!target.closest('.user-item') && !target.closest('.user-submenu')) {
      this.submenuOpen.set(false);
    }
  }
}
```

- [ ] **Step 2: Create sidebar.component.html**

```html
<!-- src/components/v2/shell/sidebar/sidebar.component.html -->
<aside class="sidebar" [class.collapsed]="collapsed()">
  <div class="sidebar-inner">

    <!-- Brand -->
    <div class="sidebar-brand">
      <span class="brand-letter">B</span>
      <span class="brand-wordmark">Babylon</span>
    </div>

    <!-- Primary nav -->
    <nav class="sidebar-nav">

      <a class="nav-item" routerLink="/v2/portfolio" routerLinkActive="active" [routerLinkActiveOptions]="{exact:true}">
        <span class="nav-icon">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M2 12 L5 8 L8 10 L11 5 L14 7"/>
            <path d="M2 14 L14 14" stroke-width="1.2" opacity="0.5"/>
          </svg>
        </span>
        <span class="nav-label">Portfolio</span>
        <span class="tooltip">Portfolio</span>
      </a>

      <a class="nav-item" routerLink="/v2/transactions" routerLinkActive="active">
        <span class="nav-icon">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 5 L13 5"/>
            <path d="M10.5 2.5 L13 5 L10.5 7.5"/>
            <path d="M13 11 L3 11"/>
            <path d="M5.5 8.5 L3 11 L5.5 13.5"/>
          </svg>
        </span>
        <span class="nav-label">Transactions</span>
        <span class="tooltip">Transactions</span>
      </a>

      <a class="nav-item" routerLink="/v2/recurring" routerLinkActive="active">
        <span class="nav-icon">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M13 3.5 A6 6 0 1 1 5.5 2"/>
            <path d="M5.5 2 L5.5 5.5 L9 5.5" stroke-width="1.5"/>
          </svg>
        </span>
        <span class="nav-label">Recurring</span>
        <span class="tooltip">Recurring</span>
      </a>

    </nav>

    <div class="sidebar-divider"></div>

    <!-- User profile -->
    <div class="sidebar-bottom">
      <div class="user-item" (click)="toggleSubmenu()">
        <div class="avatar">{{ initials }}</div>
        <div class="user-info">
          <span class="user-name">{{ user()?.username ?? user()?.email }}</span>
          <span class="user-email">{{ user()?.email }}</span>
        </div>
      </div>

      @if (submenuOpen()) {
        <div class="user-submenu">
          <div class="submenu-header">
            <div class="submenu-header-name">{{ user()?.username ?? user()?.email }}</div>
            <div class="submenu-header-email">{{ user()?.email }}</div>
          </div>

          <a class="submenu-item" routerLink="/v2/settings" (click)="closeSubmenu()">
            <span class="submenu-item-icon">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="7" cy="4.5" r="2.5"/>
                <path d="M1.5 12.5 C1.5 10 4 8.5 7 8.5 C10 8.5 12.5 10 12.5 12.5"/>
              </svg>
            </span>
            <span class="submenu-item-label">Profile</span>
          </a>

          <a class="submenu-item" routerLink="/v2/settings" (click)="closeSubmenu()">
            <span class="submenu-item-icon">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="7" cy="7" r="1.8"/>
                <path d="M7 1.5 L7 2.6"/><path d="M7 11.4 L7 12.5"/>
                <path d="M1.5 7 L2.6 7"/><path d="M11.4 7 L12.5 7"/>
                <path d="M3.1 3.1 L3.9 3.9"/><path d="M10.1 10.1 L10.9 10.9"/>
                <path d="M10.9 3.1 L10.1 3.9"/><path d="M3.9 10.1 L3.1 10.9"/>
              </svg>
            </span>
            <span class="submenu-item-label">Settings</span>
          </a>

          <div class="submenu-sep"></div>

          <button class="submenu-item danger" type="button" (click)="logout()">
            <span class="submenu-item-icon">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M5.5 2 L2 2 L2 12 L5.5 12"/>
                <path d="M9 4.5 L12 7 L9 9.5"/>
                <path d="M5.5 7 L12 7"/>
              </svg>
            </span>
            <span class="submenu-item-label">Log out</span>
          </button>
        </div>
      }
    </div>

  </div>

  <!-- Collapse toggle — outside inner so it's not clipped -->
  <button class="collapse-btn" (click)="toggleCollapse()" [title]="collapsed() ? 'Expand sidebar' : 'Collapse sidebar'">
    <svg width="9" height="9" viewBox="0 0 9 9" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M5.5 1.5 L2.5 4.5 L5.5 7.5"/>
    </svg>
  </button>

</aside>
```

- [ ] **Step 3: Create sidebar.component.scss**

```scss
// src/components/v2/shell/sidebar/sidebar.component.scss
:host {
  --sidebar-w:            220px;
  --sidebar-collapsed-w:  60px;
  --accent:               #7B2FBE;
  --accent-dim:           rgba(123,47,190,0.07);
  --border:               rgba(255,255,255,0.05);
  --border-mid:           rgba(255,255,255,0.09);
  --hover:                #17171C;
  --text:                 #EEEEF2;
  --mid:                  #8585A0;
  --muted:                #52525F;
  --motion:               200ms ease-out;

  display: none; // hidden on mobile — shown via media query below
}

@media (min-width: 768px) {
  :host { display: block; }
}

.sidebar {
  position: relative;
  width: var(--sidebar-w);
  flex-shrink: 0;
  height: 100%;
  background: #0A0A0E;
  border-right: 1px solid var(--border);
  transition: width var(--motion);
  overflow: visible;
}

.sidebar.collapsed {
  width: var(--sidebar-collapsed-w);
}

/* Inner clips overflow without hiding the collapse button */
.sidebar-inner {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

/* Brand */
.sidebar-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 20px 18px 16px;
}

.brand-letter {
  font-family: 'Inter', sans-serif;
  font-size: 15px;
  font-weight: 500;
  color: var(--text);
  opacity: 0;
  width: 0;
  overflow: hidden;
  transition: opacity var(--motion), width var(--motion);
}

.sidebar.collapsed .brand-letter {
  opacity: 1;
  width: 14px;
}

.brand-wordmark {
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  font-weight: 300;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--text);
  white-space: nowrap;
  transition: opacity var(--motion);
}

.sidebar.collapsed .brand-wordmark {
  opacity: 0;
}

/* Nav */
.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 4px 8px;
  flex: 1;
}

.nav-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 6px;
  cursor: pointer;
  color: var(--muted);
  text-decoration: none;
  transition: background var(--motion), color var(--motion);
  white-space: nowrap;
}

.nav-item:hover {
  background: var(--hover);
  color: var(--mid);
}

.nav-item.active {
  background: var(--accent-dim);
  color: var(--text);
}

.nav-item.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 6px;
  bottom: 6px;
  width: 2px;
  border-radius: 0 2px 2px 0;
  background: var(--accent);
}

.nav-icon {
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-item.active .nav-icon { color: var(--accent); }
.nav-item:hover .nav-icon  { color: var(--mid); }

.nav-label {
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  transition: opacity var(--motion);
}

.sidebar.collapsed .nav-label {
  opacity: 0;
}

/* Tooltip (collapsed state) */
.tooltip {
  display: none;
  position: absolute;
  left: calc(var(--sidebar-collapsed-w) + 8px);
  top: 50%;
  transform: translateY(-50%);
  background: #1A1A22;
  border: 1px solid var(--border-mid);
  color: var(--text);
  font-family: 'Inter', sans-serif;
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 5px;
  white-space: nowrap;
  pointer-events: none;
  z-index: 100;
}

.sidebar.collapsed .nav-item:hover .tooltip {
  display: block;
}

/* Divider */
.sidebar-divider {
  height: 1px;
  background: var(--border);
  margin: 6px 12px;
}

/* Bottom / user */
.sidebar-bottom {
  position: relative;
  padding: 8px;
}

.user-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: background var(--motion);
}

.user-item:hover { background: var(--hover); }

.avatar {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: rgba(123,47,190,0.25);
  border: 1px solid rgba(123,47,190,0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Inter', sans-serif;
  font-size: 10px;
  font-weight: 500;
  color: #C084FC;
}

.user-info {
  display: flex;
  flex-direction: column;
  gap: 1px;
  overflow: hidden;
  transition: opacity var(--motion);
}

.sidebar.collapsed .user-info { opacity: 0; }

.user-name {
  font-family: 'Inter', sans-serif;
  font-size: 12px;
  font-weight: 500;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-email {
  font-family: 'Inter', sans-serif;
  font-size: 11px;
  color: var(--muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* User submenu */
.user-submenu {
  position: absolute;
  bottom: calc(100% + 6px);
  left: 8px;
  right: 8px;
  min-width: 190px;
  background: #141418;
  border: 1px solid var(--border-mid);
  border-radius: 8px;
  padding: 6px;
  z-index: 200;
  box-shadow: 0 8px 24px rgba(0,0,0,0.5);
}

.submenu-header {
  padding: 6px 8px 8px;
  border-bottom: 1px solid var(--border);
  margin-bottom: 4px;
}

.submenu-header-name {
  font-family: 'Inter', sans-serif;
  font-size: 12px;
  font-weight: 500;
  color: var(--text);
}

.submenu-header-email {
  font-family: 'Inter', sans-serif;
  font-size: 11px;
  color: var(--muted);
  margin-top: 1px;
}

.submenu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 8px;
  border-radius: 5px;
  cursor: pointer;
  background: none;
  border: none;
  width: 100%;
  text-decoration: none;
  transition: background var(--motion);
}

.submenu-item:hover { background: var(--hover); }

.submenu-item-icon {
  color: var(--muted);
  display: flex;
  align-items: center;
  transition: color var(--motion);
}

.submenu-item-label {
  font-family: 'Inter', sans-serif;
  font-size: 12px;
  color: var(--mid);
  transition: color var(--motion);
}

.submenu-item:hover .submenu-item-label { color: var(--text); }
.submenu-item:hover .submenu-item-icon  { color: var(--mid); }

.submenu-sep {
  height: 1px;
  background: var(--border);
  margin: 4px 0;
}

.submenu-item.danger .submenu-item-label { color: #9E4040; }
.submenu-item.danger .submenu-item-icon  { color: #6B3030; }
.submenu-item.danger:hover               { background: rgba(180,60,60,0.07); }
.submenu-item.danger:hover .submenu-item-label { color: #E05555; }
.submenu-item.danger:hover .submenu-item-icon  { color: #C04444; }

/* Collapse toggle */
.collapse-btn {
  position: absolute;
  right: -10px;
  top: 50%;
  transform: translateY(-50%);
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 1px solid var(--border-mid);
  background: #141418;
  color: var(--muted);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 10;
  transition: background var(--motion), color var(--motion);
}

.collapse-btn:hover {
  background: var(--hover);
  color: var(--text);
}

.sidebar.collapsed .collapse-btn svg {
  transform: rotate(180deg);
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/v2/shell/sidebar/
git commit -m "feat(v2): add SidebarComponent with collapse and user submenu"
```

---

## Task 5: MobileTopbarComponent

Mobile-only top bar: hamburger button (left) · Babylon wordmark (center) · avatar (right). Hidden on desktop via media query.

**Files:**
- Create: `src/components/v2/shell/mobile-topbar/mobile-topbar.component.ts`
- Create: `src/components/v2/shell/mobile-topbar/mobile-topbar.component.html`
- Create: `src/components/v2/shell/mobile-topbar/mobile-topbar.component.scss`

- [ ] **Step 1: Create mobile-topbar.component.ts**

```typescript
// src/components/v2/shell/mobile-topbar/mobile-topbar.component.ts
import { Component, ChangeDetectionStrategy, output, inject } from '@angular/core';
import { UserStore } from '../../../../services/user.store';

@Component({
  selector: 'app-mobile-topbar',
  standalone: true,
  templateUrl: './mobile-topbar.component.html',
  styleUrl: './mobile-topbar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MobileTopbarComponent {
  openMenu = output<void>();

  private userStore = inject(UserStore);
  user = this.userStore.currentUser;

  get initials(): string {
    const u = this.user();
    if (!u) return '?';
    const name = u.username ?? u.email ?? '';
    return name.slice(0, 2).toUpperCase();
  }
}
```

- [ ] **Step 2: Create mobile-topbar.component.html**

```html
<!-- src/components/v2/shell/mobile-topbar/mobile-topbar.component.html -->
<div class="topbar">
  <button class="hamburger-btn" (click)="openMenu.emit()" aria-label="Open menu">
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">
      <line x1="2" y1="4.5"  x2="14" y2="4.5"/>
      <line x1="2" y1="8"    x2="14" y2="8"/>
      <line x1="2" y1="11.5" x2="14" y2="11.5"/>
    </svg>
  </button>

  <span class="topbar-wordmark">babylon</span>

  <div class="topbar-avatar">{{ initials }}</div>
</div>
```

- [ ] **Step 3: Create mobile-topbar.component.scss**

```scss
// src/components/v2/shell/mobile-topbar/mobile-topbar.component.scss
:host {
  --topbar-h: 54px;
  --border:   rgba(255,255,255,0.05);
  --text:     #EEEEF2;
  --muted:    #52525F;
  --accent:   #7B2FBE;

  display: flex; // visible on mobile
}

@media (min-width: 768px) {
  :host { display: none; } // hidden on desktop — sidebar takes over
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: var(--topbar-h);
  padding: 0 16px;
  background: #0A0A0E;
  border-bottom: 1px solid var(--border);
  width: 100%;
}

.hamburger-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: none;
  border: none;
  color: var(--muted);
  cursor: pointer;
  border-radius: 6px;
  transition: background 200ms ease-out, color 200ms ease-out;
}

.hamburger-btn:hover {
  background: rgba(255,255,255,0.05);
  color: var(--text);
}

.topbar-wordmark {
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  font-weight: 300;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--text);
}

.topbar-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: rgba(123,47,190,0.25);
  border: 1px solid rgba(123,47,190,0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Inter', sans-serif;
  font-size: 10px;
  font-weight: 500;
  color: #C084FC;
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/v2/shell/mobile-topbar/
git commit -m "feat(v2): add MobileTopbarComponent"
```

---

## Task 6: MobileDrawerComponent

Slide-in drawer from the left on mobile. Same nav items as sidebar. Overlay dims content behind it.

**Files:**
- Create: `src/components/v2/shell/mobile-drawer/mobile-drawer.component.ts`
- Create: `src/components/v2/shell/mobile-drawer/mobile-drawer.component.html`
- Create: `src/components/v2/shell/mobile-drawer/mobile-drawer.component.scss`

- [ ] **Step 1: Create mobile-drawer.component.ts**

```typescript
// src/components/v2/shell/mobile-drawer/mobile-drawer.component.ts
import {
  Component, ChangeDetectionStrategy, input, output,
  inject, signal, effect,
} from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { UserStore } from '../../../../services/user.store';
import { AuthService } from '../../../../services/auth.service';

@Component({
  selector: 'app-mobile-drawer',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './mobile-drawer.component.html',
  styleUrl: './mobile-drawer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MobileDrawerComponent {
  open = input<boolean>(false);
  close = output<void>();

  // Two-frame render trick: visible controls display:flex, open controls transform.
  // We set visible=true one frame before open=true so the CSS transition fires.
  visible = signal(false);
  animating = signal(false);

  private userStore = inject(UserStore);
  private authService = inject(AuthService);

  user = this.userStore.currentUser;

  get initials(): string {
    const u = this.user();
    if (!u) return '?';
    const name = u.username ?? u.email ?? '';
    return name.slice(0, 2).toUpperCase();
  }

  constructor() {
    effect(() => {
      const isOpen = this.open();
      if (isOpen) {
        this.visible.set(true);
        // One frame delay so transition triggers
        requestAnimationFrame(() => this.animating.set(true));
      } else {
        this.animating.set(false);
        // Hide after transition completes (220ms)
        setTimeout(() => this.visible.set(false), 230);
      }
    });
  }

  closeDrawer(): void {
    this.close.emit();
  }

  logout(): void {
    this.authService.logout();
    this.closeDrawer();
  }
}
```

- [ ] **Step 2: Create mobile-drawer.component.html**

```html
<!-- src/components/v2/shell/mobile-drawer/mobile-drawer.component.html -->
@if (visible()) {
  <div class="drawer-overlay" [class.open]="animating()" (click)="closeDrawer()"></div>

  <nav class="mobile-drawer" [class.open]="animating()">

    <div class="drawer-brand">
      <span class="brand-wordmark">Babylon</span>
    </div>

    <div class="drawer-nav">

      <a class="nav-item" routerLink="/v2/portfolio" routerLinkActive="active"
         [routerLinkActiveOptions]="{exact:true}" (click)="closeDrawer()">
        <span class="nav-icon">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M2 12 L5 8 L8 10 L11 5 L14 7"/>
            <path d="M2 14 L14 14" stroke-width="1.2" opacity="0.5"/>
          </svg>
        </span>
        <span class="nav-label">Portfolio</span>
      </a>

      <a class="nav-item" routerLink="/v2/transactions" routerLinkActive="active" (click)="closeDrawer()">
        <span class="nav-icon">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 5 L13 5"/>
            <path d="M10.5 2.5 L13 5 L10.5 7.5"/>
            <path d="M13 11 L3 11"/>
            <path d="M5.5 8.5 L3 11 L5.5 13.5"/>
          </svg>
        </span>
        <span class="nav-label">Transactions</span>
      </a>

      <a class="nav-item" routerLink="/v2/recurring" routerLinkActive="active" (click)="closeDrawer()">
        <span class="nav-icon">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M13 3.5 A6 6 0 1 1 5.5 2"/>
            <path d="M5.5 2 L5.5 5.5 L9 5.5" stroke-width="1.5"/>
          </svg>
        </span>
        <span class="nav-label">Recurring</span>
      </a>

    </div>

    <div class="sidebar-divider"></div>

    <div class="drawer-bottom">
      <div class="user-item">
        <div class="avatar">{{ initials }}</div>
        <div class="user-info">
          <span class="user-name">{{ user()?.username ?? user()?.email }}</span>
          <span class="user-email">{{ user()?.email }}</span>
        </div>
      </div>

      <a class="submenu-item" routerLink="/v2/settings" (click)="closeDrawer()">
        <span class="submenu-item-label">Settings</span>
      </a>

      <button class="submenu-item danger" type="button" (click)="logout()">
        <span class="submenu-item-label">Log out</span>
      </button>
    </div>

  </nav>
}
```

- [ ] **Step 3: Create mobile-drawer.component.scss**

```scss
// src/components/v2/shell/mobile-drawer/mobile-drawer.component.scss
:host {
  --motion-drawer: 220ms cubic-bezier(0.16, 1, 0.3, 1);
  --border:        rgba(255,255,255,0.05);
  --border-mid:    rgba(255,255,255,0.09);
  --hover:         #17171C;
  --text:          #EEEEF2;
  --mid:           #8585A0;
  --muted:         #52525F;
  --accent:        #7B2FBE;
  --accent-dim:    rgba(123,47,190,0.07);

  display: contents;
}

.drawer-overlay {
  position: fixed;
  inset: 0;
  background: transparent;
  transition: background var(--motion-drawer);
  z-index: 300;
}

.drawer-overlay.open {
  background: rgba(0,0,0,0.65);
}

.mobile-drawer {
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  width: 260px;
  background: #0A0A0E;
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  transform: translateX(-100%);
  transition: transform var(--motion-drawer);
  z-index: 400;
}

.mobile-drawer.open {
  transform: translateX(0);
}

.drawer-brand {
  padding: 20px 18px 16px;
}

.brand-wordmark {
  font-family: 'Inter', sans-serif;
  font-size: 13px;
  font-weight: 300;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--text);
}

.drawer-nav {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 4px 8px;
  flex: 1;
}

.nav-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 10px;
  border-radius: 6px;
  cursor: pointer;
  color: var(--muted);
  text-decoration: none;
  transition: background 200ms ease-out;
}

.nav-item:hover { background: var(--hover); color: var(--mid); }

.nav-item.active {
  background: var(--accent-dim);
  color: var(--text);
}

.nav-item.active::before {
  content: '';
  position: absolute;
  left: 0; top: 6px; bottom: 6px;
  width: 2px;
  border-radius: 0 2px 2px 0;
  background: var(--accent);
}

.nav-icon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
}

.nav-item.active .nav-icon { color: var(--accent); }

.nav-label {
  font-family: 'Inter', sans-serif;
  font-size: 13px;
}

.sidebar-divider {
  height: 1px;
  background: var(--border);
  margin: 6px 12px;
}

.drawer-bottom {
  padding: 8px 8px 16px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.user-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 6px;
}

.avatar {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: rgba(123,47,190,0.25);
  border: 1px solid rgba(123,47,190,0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Inter', sans-serif;
  font-size: 10px;
  font-weight: 500;
  color: #C084FC;
}

.user-info {
  display: flex;
  flex-direction: column;
  gap: 1px;
  overflow: hidden;
}

.user-name {
  font-family: 'Inter', sans-serif;
  font-size: 12px;
  font-weight: 500;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-email {
  font-family: 'Inter', sans-serif;
  font-size: 11px;
  color: var(--muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.submenu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 5px;
  cursor: pointer;
  background: none;
  border: none;
  width: 100%;
  text-decoration: none;
  transition: background 200ms ease-out;
}

.submenu-item:hover { background: var(--hover); }

.submenu-item-label {
  font-family: 'Inter', sans-serif;
  font-size: 12px;
  color: var(--mid);
}

.submenu-item:hover .submenu-item-label { color: var(--text); }
.submenu-item.danger .submenu-item-label { color: #9E4040; }
.submenu-item.danger:hover               { background: rgba(180,60,60,0.07); }
.submenu-item.danger:hover .submenu-item-label { color: #E05555; }
```

- [ ] **Step 4: Commit**

```bash
git add src/components/v2/shell/mobile-drawer/
git commit -m "feat(v2): add MobileDrawerComponent with slide-in animation"
```

---

## Task 7: Route Registration

Wire up the `/v2` nested routes with `ShellComponent` as the layout and lazy-loaded placeholder pages for each child.

**Files:**
- Modify: `src/app-routes.ts`

- [ ] **Step 1: Update app-routes.ts**

Open `src/app-routes.ts` and add the v2 route block after the existing routes:

```typescript
// src/app-routes.ts
import { Routes } from '@angular/router';
import { TransactionsPageComponent } from './components/transactions-page/transactions-page.component';
import { TransactionsPageV2Component } from './components/transactions-page-v2/transactions-page-v2.component';
import { WealthPageComponent } from './components/wealth-page/wealth-page.component';
import { PortfolioDesignDemoComponent } from './components/portfolio-design-demo/portfolio-design-demo.component';
import { LoginComponent } from './components/auth/login/login.component';
import { ShellComponent } from './components/v2/shell/shell.component';
import { authGuard, publicGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'wealth', pathMatch: 'full' },
  {
    path: 'login',
    component: LoginComponent,
    canActivate: [publicGuard],
    data: { mode: 'login' },
  },
  {
    path: 'register',
    component: LoginComponent,
    canActivate: [publicGuard],
    data: { mode: 'register' },
  },
  { path: 'transactions', component: TransactionsPageV2Component, canActivate: [authGuard] },
  { path: 'transactions-legacy', component: TransactionsPageComponent, canActivate: [authGuard] },
  { path: 'wealth', component: WealthPageComponent, canActivate: [authGuard] },
  {
    path: 'settings',
    loadComponent: () =>
      import('./components/profile-settings/profile-settings.component').then(
        (m) => m.ProfileSettingsComponent
      ),
    canActivate: [authGuard],
  },
  { path: 'portfolio-design-demo', component: PortfolioDesignDemoComponent, canActivate: [authGuard] },

  // ── SPEC-003 redesign — live alongside old routes until full rollout ──
  {
    path: 'v2',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'portfolio', pathMatch: 'full' },
      {
        path: 'portfolio',
        loadComponent: () =>
          import('./components/v2/placeholder/placeholder.component').then(m => m.PlaceholderComponent),
        data: { label: 'Portfolio — coming in Plan B' },
      },
      {
        path: 'transactions',
        loadComponent: () =>
          import('./components/v2/placeholder/placeholder.component').then(m => m.PlaceholderComponent),
        data: { label: 'Transactions — coming in Plan D' },
      },
      {
        path: 'recurring',
        loadComponent: () =>
          import('./components/v2/placeholder/placeholder.component').then(m => m.PlaceholderComponent),
        data: { label: 'Recurring Investments — coming in Plan E' },
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./components/v2/placeholder/placeholder.component').then(m => m.PlaceholderComponent),
        data: { label: 'Settings — coming in Plan E' },
      },
      {
        path: 'asset/:ticker',
        loadComponent: () =>
          import('./components/v2/placeholder/placeholder.component').then(m => m.PlaceholderComponent),
        data: { label: 'Asset Detail — coming in Plan C' },
      },
    ],
  },
];
```

> **Note:** The placeholder routes pass `data.label` but the `PlaceholderComponent` reads it via the `label` input. To wire this up, update `PlaceholderComponent` to read from `ActivatedRoute.snapshot.data`:

```typescript
// src/components/v2/placeholder/placeholder.component.ts
import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-v2-placeholder',
  standalone: true,
  imports: [],
  template: `
    <div style="
      display:flex;
      align-items:center;
      justify-content:center;
      height:100%;
      color:#52525F;
      font-family:'Inter',sans-serif;
      font-size:13px;
      letter-spacing:0.04em;
    ">{{ label }}</div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlaceholderComponent {
  private route = inject(ActivatedRoute);
  label = this.route.snapshot.data['label'] ?? 'Coming soon';
}
```

- [ ] **Step 2: Build to verify no compile errors**

```bash
cd /mnt/d/Repo/babylon-app
npx ng build --configuration development 2>&1 | tail -20
```

Expected: build succeeds with no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app-routes.ts src/components/v2/placeholder/placeholder.component.ts
git commit -m "feat(v2): register /v2 shell routes with placeholder child pages"
```

---

## Task 8: Smoke Test in Browser

Verify the shell renders correctly at `http://localhost:4200/v2/portfolio`.

- [ ] **Step 1: Start dev server**

```bash
cd /mnt/d/Repo/babylon-app
npx ng serve --open
```

- [ ] **Step 2: Navigate to `/v2/portfolio`**

Check:
- Desktop (> 768px): sidebar visible at 220px width, wordmark "Babylon", three nav items (Portfolio active), user avatar at bottom
- Desktop: clicking the `·` collapse button collapses sidebar to 60px, tooltips appear on hover
- Desktop: clicking user avatar opens submenu above it (Profile, Settings, Log out)
- Mobile (< 768px): sidebar hidden, top bar visible with hamburger + "babylon" wordmark + avatar
- Mobile: tapping hamburger opens drawer from left with overlay behind
- Mobile: tapping overlay or a nav item closes drawer
- Navigating to `/v2/transactions` updates active state in sidebar/drawer

- [ ] **Step 3: Fix any visual issues found, then commit**

```bash
git add -p
git commit -m "fix(v2): shell smoke test fixes"
```

---

## Cleanup Note (Post Plans A–E)

Once all redesign plans (A through E) are complete and the v2 routes cover all screens:

1. Remove old route registrations: `/wealth`, `/transactions`, `/transactions-legacy`, `/settings`, `/portfolio-design-demo`
2. Delete old components: `wealth-page`, `transactions-page`, `transactions-page-v2`, `transactions-dashboard`, `portfolio-dashboard`, `portfolio-design-demo`, `portfolio-list`, `strategy-panel`, `portfolio-history-chart`, `insight-card`, `milestone-tracker`, `planning`, `portfolio-list`, `recurring-investments-list`, `dividend-tracker-chart`, `ghosting-elements/`, `common/`
3. Update `publicGuard` redirect from `/wealth` → `/v2/portfolio`
4. Remove `portfolio-design-demo` route
5. Rename `/v2` → `/` (make new shell the root)

---

*Plan A of 5 — App Shell. Next: Plan B — Portfolio Dashboard (hero, chart, holdings row).*
