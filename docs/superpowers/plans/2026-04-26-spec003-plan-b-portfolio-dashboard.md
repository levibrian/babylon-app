# Portfolio Dashboard (Plan B) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the v2 Portfolio Dashboard page — hero section (total value + asset-class filter + time filter), performance chart with shimmer/crosshair/tooltip, and holdings list with Daily/Absolute toggle and allocation indicators.

**Architecture:** A single `PortfolioDashboardV2Component` at `src/components/v2/portfolio-dashboard/` owns the page. It composes three sub-components: `PortfolioHeroComponent`, `PortfolioChartComponent`, and `HoldingsListComponent`. All data comes from existing services (`PortfolioService`, `PortfolioHistoryService`) and the existing `FilterStore`. Route at `v2/portfolio` already points to a lazy-loaded placeholder — this plan replaces that placeholder.

**Tech Stack:** Angular 20, standalone components, Signals/computed, OnPush, SCSS, SVG for chart, existing services (`PortfolioService`, `PortfolioHistoryService`, `FilterStore`)

---

## File Structure

| Path | Role |
|------|------|
| `src/components/v2/portfolio-dashboard/portfolio-dashboard.component.ts` | Page component — wires data, owns `timePeriod` signal |
| `src/components/v2/portfolio-dashboard/portfolio-dashboard.component.html` | Composes hero + chart + holdings |
| `src/components/v2/portfolio-dashboard/portfolio-dashboard.component.scss` | Page-level layout only |
| `src/components/v2/portfolio-dashboard/hero/portfolio-hero.component.ts` | Hero: label, filter pills, value, P&L, time filter tabs |
| `src/components/v2/portfolio-dashboard/hero/portfolio-hero.component.html` | Hero template |
| `src/components/v2/portfolio-dashboard/hero/portfolio-hero.component.scss` | Hero styles |
| `src/components/v2/portfolio-dashboard/chart/portfolio-chart.component.ts` | SVG chart with shimmer, crosshair, tooltip |
| `src/components/v2/portfolio-dashboard/chart/portfolio-chart.component.html` | Chart template |
| `src/components/v2/portfolio-dashboard/chart/portfolio-chart.component.scss` | Chart styles |
| `src/components/v2/portfolio-dashboard/holdings/holdings-list.component.ts` | Holdings list with Daily/Absolute toggle |
| `src/components/v2/portfolio-dashboard/holdings/holdings-list.component.html` | Holdings template |
| `src/components/v2/portfolio-dashboard/holdings/holdings-list.component.scss` | Holdings styles |
| `src/app-routes.ts` | Swap placeholder import for `PortfolioDashboardV2Component` |

---

### Task 1: PortfolioDashboardV2Component (page container)

**Files:**
- Create: `src/components/v2/portfolio-dashboard/portfolio-dashboard.component.ts`
- Create: `src/components/v2/portfolio-dashboard/portfolio-dashboard.component.html`
- Create: `src/components/v2/portfolio-dashboard/portfolio-dashboard.component.scss`

The page component owns the `timePeriod` signal (shared between hero and chart), injects `PortfolioService`, `PortfolioHistoryService`, and `FilterStore`, and calls `loadHistory()` on init.

- [ ] **Step 1: Write the failing test**

Create `src/components/v2/portfolio-dashboard/portfolio-dashboard.component.spec.ts`:
```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PortfolioDashboardV2Component } from './portfolio-dashboard.component';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';

describe('PortfolioDashboardV2Component', () => {
  let fixture: ComponentFixture<PortfolioDashboardV2Component>;
  let component: PortfolioDashboardV2Component;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PortfolioDashboardV2Component],
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(PortfolioDashboardV2Component);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should default timePeriod to 1M', () => {
    expect(component.timePeriod()).toBe('1M');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /mnt/d/Repo/babylon-app && npx ng test --include=src/components/v2/portfolio-dashboard/portfolio-dashboard.component.spec.ts --watch=false --browsers=ChromeHeadless`
Expected: FAIL — component file does not exist.

- [ ] **Step 3: Create the component files**

`src/components/v2/portfolio-dashboard/portfolio-dashboard.component.ts`:
```typescript
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { PortfolioService } from '../../../services/portfolio.service';
import { PortfolioHistoryService } from '../../../services/portfolio-history.service';
import { FilterStore } from '../../../stores/filter.store';
import { Timeframe } from '../../../models/portfolio-history.model';

@Component({
  selector: 'app-portfolio-dashboard-v2',
  standalone: true,
  imports: [],
  templateUrl: './portfolio-dashboard.component.html',
  styleUrl: './portfolio-dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PortfolioDashboardV2Component implements OnInit {
  protected portfolioService = inject(PortfolioService);
  protected historyService = inject(PortfolioHistoryService);
  protected filterStore = inject(FilterStore);

  readonly timePeriod = signal<Timeframe>('1M');

  async ngOnInit(): Promise<void> {
    await this.historyService.loadHistory();
  }
}
```

`src/components/v2/portfolio-dashboard/portfolio-dashboard.component.html`:
```html
<div class="page">
</div>
```

`src/components/v2/portfolio-dashboard/portfolio-dashboard.component.scss`:
```scss
.page {
  flex: 1;
  overflow-y: auto;
  padding: 36px 32px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

@media (max-width: 768px) {
  .page {
    padding: 24px 16px;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /mnt/d/Repo/babylon-app && npx ng test --include=src/components/v2/portfolio-dashboard/portfolio-dashboard.component.spec.ts --watch=false --browsers=ChromeHeadless`
Expected: PASS — 2 specs passing.

- [ ] **Step 5: Commit**

```bash
cd /mnt/d/Repo/babylon-app
git add src/components/v2/portfolio-dashboard/
git commit -m "feat(v2): add PortfolioDashboardV2Component page container"
```

---

### Task 2: Wire route to replace placeholder

**Files:**
- Modify: `src/app-routes.ts`

Replace the `portfolio` child route's `loadComponent` to point to `PortfolioDashboardV2Component` instead of `PlaceholderComponent`.

- [ ] **Step 1: Write the failing test**

Create `src/components/v2/portfolio-dashboard/portfolio-routing.spec.ts`:
```typescript
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { routes } from '../../../app-routes';

describe('v2/portfolio route', () => {
  it('should load PortfolioDashboardV2Component', async () => {
    await TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideRouter(routes)],
    }).compileComponents();

    const v2Route = routes.find(r => r.path === 'v2');
    const children = (v2Route as any)?.children ?? [];
    const portfolioRoute = children.find((c: any) => c.path === 'portfolio');

    expect(portfolioRoute).toBeTruthy();
    const component = await portfolioRoute.loadComponent();
    expect(component.name).toBe('PortfolioDashboardV2Component');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /mnt/d/Repo/babylon-app && npx ng test --include=src/components/v2/portfolio-dashboard/portfolio-routing.spec.ts --watch=false --browsers=ChromeHeadless`
Expected: FAIL — component name is `PlaceholderComponent`.

- [ ] **Step 3: Update `src/app-routes.ts`**

Find the `portfolio` child route inside the `v2` routes block. Change its `loadComponent` from:
```typescript
{ path: 'portfolio', loadComponent: () => import('./components/v2/placeholder/placeholder.component').then(m => m.PlaceholderComponent), data: { label: 'Portfolio — coming in Plan B' } },
```
To:
```typescript
{ path: 'portfolio', loadComponent: () => import('./components/v2/portfolio-dashboard/portfolio-dashboard.component').then(m => m.PortfolioDashboardV2Component) },
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /mnt/d/Repo/babylon-app && npx ng test --include=src/components/v2/portfolio-dashboard/portfolio-routing.spec.ts --watch=false --browsers=ChromeHeadless`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd /mnt/d/Repo/babylon-app
git add src/app-routes.ts
git commit -m "feat(v2): wire portfolio route to PortfolioDashboardV2Component"
```

---

### Task 3: PortfolioHeroComponent

**Files:**
- Create: `src/components/v2/portfolio-dashboard/hero/portfolio-hero.component.ts`
- Create: `src/components/v2/portfolio-dashboard/hero/portfolio-hero.component.html`
- Create: `src/components/v2/portfolio-dashboard/hero/portfolio-hero.component.scss`

The hero receives four inputs: `totalValue` (number), `pnlAmount` (number), `pnlPercent` (number), `activePeriod` (Timeframe), plus emits `periodChange`. It reads `FilterStore` directly for the asset-class pills. Displays: "Total portfolio" label + separator + filter pills inline; then 38px Roboto Mono value + P&L on same row; then time filter tabs.

- [ ] **Step 1: Write the failing test**

Create `src/components/v2/portfolio-dashboard/hero/portfolio-hero.component.spec.ts`:
```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PortfolioHeroComponent } from './portfolio-hero.component';
import { provideZonelessChangeDetection } from '@angular/core';

describe('PortfolioHeroComponent', () => {
  let fixture: ComponentFixture<PortfolioHeroComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PortfolioHeroComponent],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();
    fixture = TestBed.createComponent(PortfolioHeroComponent);
    fixture.componentInstance.totalValue = 48204.33;
    fixture.componentInstance.pnlAmount = 3412.18;
    fixture.componentInstance.pnlPercent = 7.61;
    fixture.detectChanges();
  });

  it('should render the hero value', () => {
    const el = fixture.nativeElement.querySelector('.hero-value');
    expect(el).toBeTruthy();
  });

  it('should show positive P&L in green', () => {
    const el = fixture.nativeElement.querySelector('.hero-perf-amount');
    expect(el.classList).toContain('pos');
  });

  it('should default time period to 1M', () => {
    const active = fixture.nativeElement.querySelector('.time-item.active');
    expect(active?.textContent?.trim()).toBe('1M');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /mnt/d/Repo/babylon-app && npx ng test --include=src/components/v2/portfolio-dashboard/hero/portfolio-hero.component.spec.ts --watch=false --browsers=ChromeHeadless`
Expected: FAIL — component does not exist.

- [ ] **Step 3: Create hero component**

`src/components/v2/portfolio-dashboard/hero/portfolio-hero.component.ts`:
```typescript
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FilterStore, ALL_ASSET_CLASSES, AssetClass } from '../../../../stores/filter.store';
import { Timeframe } from '../../../../models/portfolio-history.model';

const TIME_PERIODS: Timeframe[] = ['1D', '1W', '1M', '6M', '1Y', 'YTD', 'Max'];

@Component({
  selector: 'app-portfolio-hero',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './portfolio-hero.component.html',
  styleUrl: './portfolio-hero.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PortfolioHeroComponent {
  @Input() totalValue = 0;
  @Input() pnlAmount = 0;
  @Input() pnlPercent = 0;
  @Input() activePeriod: Timeframe = '1M';
  @Output() periodChange = new EventEmitter<Timeframe>();

  protected filterStore = inject(FilterStore);
  protected readonly assetClasses = ALL_ASSET_CLASSES;
  protected readonly timePeriods = TIME_PERIODS;

  protected formatValue(n: number): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n);
  }

  protected formatPnlAmount(n: number): string {
    const sign = n >= 0 ? '+' : '';
    return sign + new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n);
  }

  protected formatPnlPercent(n: number): string {
    const sign = n >= 0 ? '+' : '';
    return `${sign}${n.toFixed(2)}%`;
  }

  protected selectPeriod(p: Timeframe): void {
    this.periodChange.emit(p);
  }

  protected toggleAsset(cls: AssetClass): void {
    if (this.filterStore.allActive()) {
      ALL_ASSET_CLASSES.filter(c => c !== cls).forEach(c => this.filterStore.toggle(c));
    } else if (this.filterStore.isActive(cls) && this.filterStore.active().size === 1) {
      this.filterStore.selectAll();
    } else {
      this.filterStore.toggle(cls);
    }
  }

  protected toggleAll(): void {
    if (this.filterStore.allActive()) return;
    this.filterStore.selectAll();
  }
}
```

`src/components/v2/portfolio-dashboard/hero/portfolio-hero.component.html`:
```html
<div class="hero">
  <!-- Row 1: label + separator + asset filter -->
  <div class="hero-header">
    <span class="hero-label">Total portfolio</span>
    <div class="filter-sep"></div>
    <div class="filter-row">
      <button
        class="filter-pill"
        [class.active]="filterStore.allActive()"
        (click)="toggleAll()"
        type="button">All</button>
      @for (cls of assetClasses; track cls) {
        <button
          class="filter-pill"
          [class.active]="filterStore.isActive(cls)"
          (click)="toggleAsset(cls)"
          type="button">{{ cls }}</button>
      }
    </div>
  </div>

  <!-- Row 2: value + P&L -->
  <div class="hero-value-row">
    <div class="hero-value">{{ formatValue(totalValue) }}</div>
    <div class="hero-perf-row">
      <span class="hero-perf-amount" [class.pos]="pnlAmount >= 0" [class.neg]="pnlAmount < 0">
        {{ formatPnlAmount(pnlAmount) }}
      </span>
      <span class="hero-perf-sep">·</span>
      <span class="hero-perf-pct" [class.pos]="pnlPercent >= 0" [class.neg]="pnlPercent < 0">
        {{ formatPnlPercent(pnlPercent) }}
      </span>
    </div>
  </div>

  <!-- Row 3: time filter -->
  <div class="time-filter">
    @for (p of timePeriods; track p) {
      <button
        class="time-item"
        [class.active]="activePeriod === p"
        (click)="selectPeriod(p)"
        type="button">{{ p }}</button>
    }
  </div>
</div>
```

`src/components/v2/portfolio-dashboard/hero/portfolio-hero.component.scss`:
```scss
.hero {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.hero-header {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 14px;
}

.hero-label {
  font-size: 11px;
  font-weight: 500;
  color: var(--muted);
  letter-spacing: 0.07em;
  text-transform: uppercase;
  white-space: nowrap;
}

.filter-sep {
  width: 1px;
  height: 10px;
  background: var(--border-mid);
  flex-shrink: 0;
}

.filter-row {
  display: flex;
  align-items: center;
  gap: 4px;
}

.filter-pill {
  font-size: 11px;
  font-weight: 450;
  color: var(--muted);
  cursor: pointer;
  user-select: none;
  letter-spacing: 0.01em;
  padding: 3px 10px;
  border-radius: 999px;
  border: 1px solid transparent;
  background: transparent;
  white-space: nowrap;
  transition: color 200ms ease-out, background 200ms ease-out, border-color 200ms ease-out, opacity 200ms ease-out;

  &:not(.active) { opacity: 0.45; }
  &:hover { color: var(--mid); opacity: 1; }

  &.active {
    color: var(--accent-text);
    border-color: var(--accent-border);
    background: var(--accent-dim);
    opacity: 1;
  }
}

.hero-value-row {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
}

.hero-value {
  font-family: 'Roboto Mono', monospace;
  font-size: 38px;
  font-weight: 500;
  letter-spacing: -0.04em;
  color: var(--text);
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

.hero-perf-row {
  display: flex;
  align-items: baseline;
  gap: 0;
}

.hero-perf-amount {
  font-family: 'Roboto Mono', monospace;
  font-size: 13px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
  &.pos { color: var(--positive); }
  &.neg { color: var(--negative); }
}

.hero-perf-sep {
  font-size: 13px;
  color: var(--muted);
  padding: 0 6px;
  user-select: none;
}

.hero-perf-pct {
  font-family: 'Roboto Mono', monospace;
  font-size: 13px;
  font-weight: 400;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.01em;
  &.pos { color: var(--positive); }
  &.neg { color: var(--negative); }
}

.time-filter {
  display: flex;
  align-items: center;
  gap: 2px;
}

.time-item {
  font-size: 11px;
  font-weight: 500;
  color: var(--muted);
  cursor: pointer;
  user-select: none;
  letter-spacing: 0.02em;
  padding: 4px 9px;
  border-radius: 5px;
  border: none;
  background: transparent;
  white-space: nowrap;
  transition: color 200ms ease-out, background 200ms ease-out;

  &:hover { color: var(--mid); background: var(--hover); }
  &.active { color: var(--text); background: var(--raised); }
}

@media (max-width: 768px) {
  .hero-value { font-size: 30px; }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /mnt/d/Repo/babylon-app && npx ng test --include=src/components/v2/portfolio-dashboard/hero/portfolio-hero.component.spec.ts --watch=false --browsers=ChromeHeadless`
Expected: PASS — 3 specs.

- [ ] **Step 5: Commit**

```bash
cd /mnt/d/Repo/babylon-app
git add src/components/v2/portfolio-dashboard/hero/
git commit -m "feat(v2): add PortfolioHeroComponent with value, P&L and time filter"
```

---

### Task 4: PortfolioChartComponent

**Files:**
- Create: `src/components/v2/portfolio-dashboard/chart/portfolio-chart.component.ts`
- Create: `src/components/v2/portfolio-dashboard/chart/portfolio-chart.component.html`
- Create: `src/components/v2/portfolio-dashboard/chart/portfolio-chart.component.scss`

SVG chart. Inputs: `snapshots` (PortfolioSnapshotDto[]), `positive` (boolean for green/red line). Renders: shimmer while `snapshots` is empty, then smooth path on data; crosshair dot on mouse/touch move; fixed-position tooltip with Roboto Mono value + date; x-axis date labels inside chart at bottom.

Line color: `#27C97A` when positive, `#E8524A` when negative. Gradient fill: same color at 18% opacity to 0%. `vector-effect: non-scaling-stroke` on the line. SVG viewBox `0 0 800 120`.

The x-axis method builds DOM nodes with `document.createElement` and `textContent` — never `innerHTML`.

- [ ] **Step 1: Write the failing test**

Create `src/components/v2/portfolio-dashboard/chart/portfolio-chart.component.spec.ts`:
```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PortfolioChartComponent } from './portfolio-chart.component';
import { provideZonelessChangeDetection } from '@angular/core';

describe('PortfolioChartComponent', () => {
  let fixture: ComponentFixture<PortfolioChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PortfolioChartComponent],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();
    fixture = TestBed.createComponent(PortfolioChartComponent);
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should show shimmer when snapshots is empty', () => {
    fixture.componentInstance.snapshots = [];
    fixture.detectChanges();
    const shimmer = fixture.nativeElement.querySelector('.chart-shimmer');
    expect(shimmer).toBeTruthy();
  });

  it('should hide shimmer when snapshots has data', () => {
    fixture.componentInstance.snapshots = [
      { timestamp: 1000, totalInvested: 1000, cashBalance: 0, totalMarketValue: 1100,
        unrealizedPnL: 100, unrealizedPnLPercentage: 10, realizedPnL: 0, realizedPnLPercentage: 0 },
    ];
    fixture.detectChanges();
    const shimmer = fixture.nativeElement.querySelector('.chart-shimmer.hidden');
    expect(shimmer).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /mnt/d/Repo/babylon-app && npx ng test --include=src/components/v2/portfolio-dashboard/chart/portfolio-chart.component.spec.ts --watch=false --browsers=ChromeHeadless`
Expected: FAIL — component does not exist.

- [ ] **Step 3: Create chart component**

`src/components/v2/portfolio-dashboard/chart/portfolio-chart.component.ts`:
```typescript
import {
  ChangeDetectionStrategy, Component, ElementRef, Input, OnChanges,
  SimpleChanges, ViewChild, AfterViewInit, OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { PortfolioSnapshotDto } from '../../../../models/portfolio-history.model';

interface ChartPoint { x: number; y: number; value: number; date: Date; }

@Component({
  selector: 'app-portfolio-chart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './portfolio-chart.component.html',
  styleUrl: './portfolio-chart.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PortfolioChartComponent implements OnChanges, AfterViewInit, OnDestroy {
  @Input() snapshots: PortfolioSnapshotDto[] = [];
  @Input() positive = true;

  @ViewChild('chartSvg')     chartSvgEl!:     ElementRef<SVGSVGElement>;
  @ViewChild('chartLine')    chartLineEl!:    ElementRef<SVGPathElement>;
  @ViewChild('chartFill')    chartFillEl!:    ElementRef<SVGPathElement>;
  @ViewChild('crossDot')     crossDotEl!:     ElementRef<SVGCircleElement>;
  @ViewChild('chartAxis')    chartAxisEl!:    ElementRef<HTMLDivElement>;
  @ViewChild('chartTooltip') tooltipEl!:      ElementRef<HTMLDivElement>;
  @ViewChild('tooltipVal')   tooltipValEl!:   ElementRef<HTMLDivElement>;
  @ViewChild('tooltipDate')  tooltipDateEl!:  ElementRef<HTMLDivElement>;

  protected showShimmer = true;
  private points: ChartPoint[] = [];
  private animFrameId: number | null = null;

  private readonly W = 800;
  private readonly H = 120;
  private readonly PADDING_TOP = 12;
  private readonly PADDING_BOTTOM = 22;

  get lineColor(): string { return this.positive ? '#27C97A' : '#E8524A'; }
  get gradientId(): string { return this.positive ? 'fillGradPos' : 'fillGradNeg'; }

  ngAfterViewInit(): void {
    if (this.snapshots.length > 0) this.renderChart();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['snapshots'] && this.chartLineEl) {
      this.showShimmer = this.snapshots.length === 0;
      if (this.snapshots.length > 0) this.renderChart();
    }
  }

  ngOnDestroy(): void {
    if (this.animFrameId !== null) cancelAnimationFrame(this.animFrameId);
  }

  private renderChart(): void {
    this.showShimmer = false;
    this.points = this.buildPoints();
    if (this.points.length < 2) return;

    const linePath = this.smoothPath(this.points);
    const fillPath = linePath + ` L${this.W},${this.H} L0,${this.H} Z`;

    this.chartLineEl.nativeElement.setAttribute('stroke', this.lineColor);
    this.chartLineEl.nativeElement.setAttribute('d', linePath);
    this.chartFillEl.nativeElement.setAttribute('d', fillPath);

    this.renderXAxis();
    this.animateLineIn(this.chartLineEl.nativeElement);
  }

  private buildPoints(): ChartPoint[] {
    const snaps = this.snapshots;
    const values = snaps.map(s => s.totalMarketValue);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const usableH = this.H - this.PADDING_TOP - this.PADDING_BOTTOM;

    return snaps.map((s, i) => ({
      x: snaps.length === 1 ? this.W / 2 : (i / (snaps.length - 1)) * this.W,
      y: this.PADDING_TOP + usableH - ((s.totalMarketValue - min) / range) * usableH,
      value: s.totalMarketValue,
      date: new Date(s.timestamp * 1000),
    }));
  }

  private smoothPath(pts: ChartPoint[]): string {
    if (pts.length === 1) return `M${pts[0].x},${pts[0].y}`;
    let d = `M${pts[0].x},${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
      const prev = pts[i - 1];
      const curr = pts[i];
      const cpX = (prev.x + curr.x) / 2;
      d += ` C${cpX},${prev.y} ${cpX},${curr.y} ${curr.x},${curr.y}`;
    }
    return d;
  }

  private animateLineIn(line: SVGPathElement): void {
    const len = line.getTotalLength();
    line.style.strokeDasharray = `${len}`;
    line.style.strokeDashoffset = `${len}`;

    const start = performance.now();
    const duration = 800;

    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      line.style.strokeDashoffset = `${len * (1 - eased)}`;
      if (progress < 1) {
        this.animFrameId = requestAnimationFrame(tick);
      } else {
        line.style.strokeDasharray = '';
        line.style.strokeDashoffset = '';
      }
    };
    this.animFrameId = requestAnimationFrame(tick);
  }

  private renderXAxis(): void {
    const axis = this.chartAxisEl?.nativeElement;
    if (!axis || this.points.length < 2) return;

    while (axis.firstChild) {
      axis.removeChild(axis.firstChild);
    }

    const count = Math.min(5, this.points.length);
    const indices: number[] = [];
    for (let i = 0; i < count; i++) {
      indices.push(Math.round((i / (count - 1)) * (this.points.length - 1)));
    }

    indices.forEach(idx => {
      const pt = this.points[idx];
      const pct = (pt.x / this.W) * 100;
      const label = document.createElement('span');
      label.className = 'axis-label';
      label.textContent = this.formatAxisDate(pt.date);
      label.style.left = `${pct}%`;
      axis.appendChild(label);
    });
  }

  private formatAxisDate(d: Date): string {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  protected onMouseMove(event: MouseEvent): void {
    this.updateCrosshair(event.clientX, event.currentTarget as SVGSVGElement);
  }

  protected onTouchMove(event: TouchEvent): void {
    event.preventDefault();
    if (event.touches.length > 0) {
      this.updateCrosshair(event.touches[0].clientX, event.currentTarget as SVGSVGElement);
    }
  }

  protected onLeave(): void {
    if (!this.crossDotEl) return;
    this.chartSvgEl.nativeElement.classList.remove('crosshair-visible');
    this.tooltipEl.nativeElement.classList.remove('visible');
  }

  private updateCrosshair(clientX: number, svgEl: SVGSVGElement): void {
    if (this.points.length < 2) return;
    const rect = svgEl.getBoundingClientRect();
    const fraction = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const svgX = fraction * this.W;

    let nearest = this.points[0];
    let minDist = Math.abs(this.points[0].x - svgX);
    for (const pt of this.points) {
      const d = Math.abs(pt.x - svgX);
      if (d < minDist) { minDist = d; nearest = pt; }
    }

    this.crossDotEl.nativeElement.setAttribute('cx', `${nearest.x}`);
    this.crossDotEl.nativeElement.setAttribute('cy', `${nearest.y}`);
    this.crossDotEl.nativeElement.setAttribute('fill', this.lineColor);
    svgEl.classList.add('crosshair-visible');

    this.tooltipValEl.nativeElement.textContent = new Intl.NumberFormat('en-US', {
      style: 'currency', currency: 'USD', minimumFractionDigits: 2,
    }).format(nearest.value);
    this.tooltipDateEl.nativeElement.textContent = nearest.date.toLocaleDateString('en-US', {
      month: 'short', day: 'numeric',
    });

    const dotScreenX = rect.left + (nearest.x / this.W) * rect.width;
    this.tooltipEl.nativeElement.style.left = `${dotScreenX}px`;
    this.tooltipEl.nativeElement.style.top = `${rect.top - 52}px`;
    this.tooltipEl.nativeElement.classList.add('visible');
  }
}
```

`src/components/v2/portfolio-dashboard/chart/portfolio-chart.component.html`:
```html
<div class="chart-wrap">
  <!-- Shimmer -->
  <div class="chart-shimmer" [class.hidden]="!showShimmer">
    <div class="shimmer-inner"></div>
  </div>

  <!-- SVG chart -->
  <svg
    #chartSvg
    class="chart-svg"
    viewBox="0 0 800 120"
    preserveAspectRatio="none"
    fill="none"
    (mousemove)="onMouseMove($event)"
    (mouseleave)="onLeave()"
    (touchmove)="onTouchMove($event)"
    (touchend)="onLeave()">
    <defs>
      <linearGradient id="fillGradPos" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#27C97A" stop-opacity="0.18"/>
        <stop offset="100%" stop-color="#27C97A" stop-opacity="0"/>
      </linearGradient>
      <linearGradient id="fillGradNeg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#E8524A" stop-opacity="0.18"/>
        <stop offset="100%" stop-color="#E8524A" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <path #chartFill stroke="none" [attr.fill]="'url(#' + gradientId + ')'"/>
    <path
      #chartLine
      fill="none"
      stroke-width="1"
      stroke-linecap="round"
      stroke-linejoin="round"
      vector-effect="non-scaling-stroke"
      shape-rendering="geometricPrecision"/>
    <circle #crossDot class="crosshair-dot" cx="0" cy="0" r="2.5"/>
  </svg>

  <!-- Tooltip -->
  <div #chartTooltip class="chart-tooltip">
    <div #tooltipVal class="tooltip-val"></div>
    <div #tooltipDate class="tooltip-date"></div>
  </div>

  <!-- X-axis -->
  <div #chartAxis class="chart-axis"></div>
</div>
```

`src/components/v2/portfolio-dashboard/chart/portfolio-chart.component.scss`:
```scss
.chart-wrap {
  position: relative;
  border-radius: 10px;
  overflow: hidden;
  background: var(--surface);
  flex-shrink: 0;
  touch-action: pan-y;
  height: 160px;
}

.chart-shimmer {
  position: absolute;
  inset: 0;
  border-radius: 10px;
  overflow: hidden;
  transition: opacity 400ms ease-out;
  pointer-events: none;
  z-index: 4;

  &.hidden { display: none; }
}

.shimmer-inner {
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    var(--surface) 0%,
    var(--surface) 30%,
    rgba(255,255,255,0.04) 50%,
    var(--surface) 70%,
    var(--surface) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.6s ease-in-out infinite;
}

@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.chart-svg {
  display: block;
  width: 100%;
  height: 100%;
  cursor: crosshair;
  user-select: none;
  position: relative;
  z-index: 2;
}

.crosshair-dot {
  opacity: 0;
  transition: opacity 120ms ease-out;
  pointer-events: none;
}

.chart-svg.crosshair-visible .crosshair-dot {
  opacity: 1;
}

.chart-tooltip {
  position: fixed;
  pointer-events: none;
  opacity: 0;
  transition: opacity 120ms ease-out;
  transform: translateX(-50%);
  z-index: 999;
  text-align: center;
  background: var(--raised);
  border: 1px solid var(--border-mid);
  border-radius: 7px;
  padding: 6px 10px;
  white-space: nowrap;

  &.visible { opacity: 1; }
}

.tooltip-val {
  font-family: 'Roboto Mono', monospace;
  font-size: 12px;
  font-weight: 500;
  color: var(--text);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
}

.tooltip-date {
  font-size: 10px;
  color: var(--muted);
  letter-spacing: 0.01em;
  margin-top: 2px;
}

.chart-axis {
  position: absolute;
  bottom: 7px;
  left: 12px;
  right: 12px;
  height: 14px;
  pointer-events: none;
  z-index: 3;
}

:host ::ng-deep .axis-label {
  position: absolute;
  font-size: 10px;
  color: var(--muted);
  transform: translateX(-50%);
  white-space: nowrap;
  font-weight: 400;
  letter-spacing: 0.01em;
  line-height: 1;
  top: 0;
  font-family: 'Inter', sans-serif;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /mnt/d/Repo/babylon-app && npx ng test --include=src/components/v2/portfolio-dashboard/chart/portfolio-chart.component.spec.ts --watch=false --browsers=ChromeHeadless`
Expected: PASS — 3 specs.

- [ ] **Step 5: Commit**

```bash
cd /mnt/d/Repo/babylon-app
git add src/components/v2/portfolio-dashboard/chart/
git commit -m "feat(v2): add PortfolioChartComponent with shimmer, smooth path, crosshair"
```

---

### Task 5: HoldingsListComponent

**Files:**
- Create: `src/components/v2/portfolio-dashboard/holdings/holdings-list.component.ts`
- Create: `src/components/v2/portfolio-dashboard/holdings/holdings-list.component.html`
- Create: `src/components/v2/portfolio-dashboard/holdings/holdings-list.component.scss`

Inputs: `items` (PortfolioItem[]). Reads `FilterStore` to show/dim rows. Daily/Absolute toggle signal. Each row: left (name + allocation dot + action pill if over/underweight) + right (value + P&L). Emits `rowClick` event with ticker on tap.

- [ ] **Step 1: Write the failing test**

Create `src/components/v2/portfolio-dashboard/holdings/holdings-list.component.spec.ts`:
```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HoldingsListComponent } from './holdings-list.component';
import { provideZonelessChangeDetection } from '@angular/core';
import { PortfolioItem } from '../../../../models/portfolio.model';

const MOCK_ITEMS: PortfolioItem[] = [
  {
    ticker: 'AAPL', companyName: 'Apple', totalShares: 12, totalCost: 16600,
    averageSharePrice: 1383.33, currentMarketValue: 18420, unrealizedPnL: 1820,
    unrealizedPnLPercentage: 10.9, transactions: [],
    securityType: 'Stock' as any,
    targetAllocationPercentage: 35, currentAllocationPercentage: 38.2,
    allocationDifference: 3.2, rebalanceAmount: -1542,
    rebalancingStatus: 'Overweight',
  },
];

describe('HoldingsListComponent', () => {
  let fixture: ComponentFixture<HoldingsListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HoldingsListComponent],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();
    fixture = TestBed.createComponent(HoldingsListComponent);
    fixture.componentInstance.items = MOCK_ITEMS;
    fixture.detectChanges();
  });

  it('should render a holding row', () => {
    const rows = fixture.nativeElement.querySelectorAll('.h-row');
    expect(rows.length).toBe(1);
  });

  it('should show overweight pill for overweight holdings', () => {
    const pill = fixture.nativeElement.querySelector('.alloc-pill.overweight');
    expect(pill).toBeTruthy();
  });

  it('should render holding name', () => {
    const name = fixture.nativeElement.querySelector('.h-name');
    expect(name.textContent.trim()).toBe('Apple');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /mnt/d/Repo/babylon-app && npx ng test --include=src/components/v2/portfolio-dashboard/holdings/holdings-list.component.spec.ts --watch=false --browsers=ChromeHeadless`
Expected: FAIL — component does not exist.

- [ ] **Step 3: Create holdings component**

`src/components/v2/portfolio-dashboard/holdings/holdings-list.component.ts`:
```typescript
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PortfolioItem } from '../../../../models/portfolio.model';
import { FilterStore, AssetClass } from '../../../../stores/filter.store';

type PnlMode = 'daily' | 'absolute';

@Component({
  selector: 'app-holdings-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './holdings-list.component.html',
  styleUrl: './holdings-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HoldingsListComponent {
  @Input() items: PortfolioItem[] = [];
  @Output() rowClick = new EventEmitter<string>();

  protected filterStore = inject(FilterStore);
  protected pnlMode = signal<PnlMode>('daily');

  protected setMode(m: PnlMode): void { this.pnlMode.set(m); }

  protected isVisible(item: PortfolioItem): boolean {
    const cls = this.toAssetClass(item.securityType as string);
    return cls ? this.filterStore.isActive(cls) : true;
  }

  private toAssetClass(type: string | undefined): AssetClass | null {
    const map: Record<string, AssetClass> = { Stock: 'Stock', ETF: 'ETF', Bond: 'Bond', Crypto: 'Crypto' };
    return map[type ?? ''] ?? null;
  }

  protected allocClass(item: PortfolioItem): string {
    if (item.rebalancingStatus === 'Overweight') return 'overweight';
    if (item.rebalancingStatus === 'Underweight') return 'underweight';
    return 'balanced';
  }

  protected hasActionPill(item: PortfolioItem): boolean {
    return item.rebalancingStatus !== 'Balanced' && item.rebalanceAmount !== null;
  }

  protected pillLabel(item: PortfolioItem): string {
    const amt = item.rebalanceAmount ?? 0;
    const sign = item.rebalancingStatus === 'Overweight' ? '−' : '+';
    return `${sign}€${Math.abs(amt).toFixed(0)}`;
  }

  protected formatValue(n: number | null): string {
    if (n === null) return '—';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n);
  }

  protected pnlLabel(item: PortfolioItem): string {
    if (this.pnlMode() === 'daily') {
      const pct = item.unrealizedPnLPercentage;
      if (pct === null) return '—';
      const sign = pct >= 0 ? '+' : '';
      return `${sign}${pct.toFixed(1)}%`;
    }
    const amt = item.unrealizedPnL;
    const pct = item.unrealizedPnLPercentage;
    if (amt === null || pct === null) return '—';
    const sign = amt >= 0 ? '+' : '';
    return `${sign}${this.formatValue(amt)} · ${sign}${pct.toFixed(1)}%`;
  }

  protected pnlPositive(item: PortfolioItem): boolean {
    return (item.unrealizedPnL ?? 0) >= 0;
  }

  protected shareLabel(item: PortfolioItem): string {
    return `${item.totalShares} shares · ${this.formatValue(item.averageSharePrice)}`;
  }

  protected trackByTicker(_: number, item: PortfolioItem): string { return item.ticker; }
}
```

`src/components/v2/portfolio-dashboard/holdings/holdings-list.component.html`:
```html
<div class="holdings-section">
  <div class="holdings-hdr">
    <span class="holdings-lbl">Holdings</span>
    <div class="h-toggle">
      <button class="h-tog-opt" [class.active]="pnlMode() === 'daily'" (click)="setMode('daily')" type="button">Daily</button>
      <button class="h-tog-opt" [class.active]="pnlMode() === 'absolute'" (click)="setMode('absolute')" type="button">Absolute</button>
    </div>
  </div>

  <div class="holdings-list">
    @for (item of items; track trackByTicker($index, item)) {
      <div
        class="h-row"
        [class.dimmed]="!isVisible(item)"
        (click)="rowClick.emit(item.ticker)">
        <div class="h-left">
          <div class="h-name-row">
            <span class="h-name">{{ item.companyName }}</span>
            <span class="alloc-dot" [class]="'alloc-dot ' + allocClass(item)"></span>
            @if (hasActionPill(item)) {
              <span class="alloc-pill" [class]="'alloc-pill ' + allocClass(item)">{{ pillLabel(item) }}</span>
            }
          </div>
          <div class="h-type">{{ shareLabel(item) }}</div>
        </div>
        <div class="h-right">
          <div class="h-val">{{ formatValue(item.currentMarketValue) }}</div>
          <div class="h-pnl" [class.pos]="pnlPositive(item)" [class.neg]="!pnlPositive(item)">
            {{ pnlLabel(item) }}
          </div>
        </div>
      </div>
    }
  </div>
</div>
```

`src/components/v2/portfolio-dashboard/holdings/holdings-list.component.scss`:
```scss
.holdings-section {
  display: flex;
  flex-direction: column;
}

.holdings-hdr {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2px;
}

.holdings-lbl {
  font-size: 11px;
  font-weight: 500;
  color: var(--muted);
  letter-spacing: 0.07em;
  text-transform: uppercase;
}

.h-toggle {
  display: flex;
  align-items: center;
  gap: 0;
  user-select: none;
}

.h-tog-opt {
  font-size: 11px;
  font-weight: 450;
  color: var(--muted);
  cursor: pointer;
  padding: 3px 8px;
  border-radius: 5px;
  border: none;
  background: transparent;
  letter-spacing: 0.01em;
  white-space: nowrap;
  transition: color 200ms ease-out, background 200ms ease-out;

  &:hover { color: var(--mid); }
  &.active { color: var(--text); background: var(--raised); font-weight: 500; }
}

.holdings-list {
  display: flex;
  flex-direction: column;
}

.h-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 10px;
  border-radius: 8px;
  cursor: pointer;
  margin: 0 -10px;
  transition: background 200ms ease-out, opacity 200ms ease-out;

  &:hover { background: var(--hover); }
  &.dimmed { opacity: 0.18; pointer-events: none; }
}

.h-left { display: flex; flex-direction: column; gap: 4px; }

.h-name-row {
  display: flex;
  align-items: center;
  gap: 7px;
}

.h-name {
  font-size: 13.5px;
  font-weight: 500;
  color: var(--text);
  letter-spacing: -0.01em;
}

.h-type {
  font-size: 11px;
  color: var(--muted);
  letter-spacing: 0.02em;
}

.alloc-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;

  &.balanced   { background: var(--muted); }
  &.overweight { background: var(--negative); }
  &.underweight { background: var(--accent); }
}

.alloc-pill {
  font-family: 'Roboto Mono', monospace;
  font-size: 10px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.01em;
  padding: 1px 6px;
  border-radius: 999px;
  white-space: nowrap;

  &.overweight {
    color: var(--negative);
    background: rgba(232,82,74,0.1);
    border: 1px solid rgba(232,82,74,0.18);
  }

  &.underweight {
    color: var(--positive);
    background: rgba(39,201,122,0.1);
    border: 1px solid rgba(39,201,122,0.18);
  }
}

.h-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 3px;
}

.h-val {
  font-family: 'Roboto Mono', monospace;
  font-size: 13.5px;
  font-weight: 500;
  color: var(--text);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
  text-align: right;
}

.h-pnl {
  font-family: 'Roboto Mono', monospace;
  font-size: 11.5px;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.01em;
  text-align: right;
  transition: opacity 120ms ease-out;

  &.pos { color: var(--positive); }
  &.neg { color: var(--negative); }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /mnt/d/Repo/babylon-app && npx ng test --include=src/components/v2/portfolio-dashboard/holdings/holdings-list.component.spec.ts --watch=false --browsers=ChromeHeadless`
Expected: PASS — 3 specs.

- [ ] **Step 5: Commit**

```bash
cd /mnt/d/Repo/babylon-app
git add src/components/v2/portfolio-dashboard/holdings/
git commit -m "feat(v2): add HoldingsListComponent with allocation indicators and P&L toggle"
```

---

### Task 6: Wire page component — compose hero + chart + holdings

**Files:**
- Modify: `src/components/v2/portfolio-dashboard/portfolio-dashboard.component.ts`
- Modify: `src/components/v2/portfolio-dashboard/portfolio-dashboard.component.html`

The page component computes: `filteredSnapshots` (from `historyService.filterByTimeframe(timePeriod())`), `summary` (from `historyService.computeSummary(filteredSnapshots())`), `positive` (summary().valueChange >= 0). Passes these to sub-components.

- [ ] **Step 1: Write the failing test**

Create `src/components/v2/portfolio-dashboard/portfolio-dashboard.integration.spec.ts`:
```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PortfolioDashboardV2Component } from './portfolio-dashboard.component';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';

describe('PortfolioDashboardV2Component integration', () => {
  let fixture: ComponentFixture<PortfolioDashboardV2Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PortfolioDashboardV2Component],
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(PortfolioDashboardV2Component);
    fixture.detectChanges();
  });

  it('should render hero component', () => {
    const hero = fixture.nativeElement.querySelector('app-portfolio-hero');
    expect(hero).toBeTruthy();
  });

  it('should render chart component', () => {
    const chart = fixture.nativeElement.querySelector('app-portfolio-chart');
    expect(chart).toBeTruthy();
  });

  it('should render holdings list component', () => {
    const holdings = fixture.nativeElement.querySelector('app-holdings-list');
    expect(holdings).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /mnt/d/Repo/babylon-app && npx ng test --include=src/components/v2/portfolio-dashboard/portfolio-dashboard.integration.spec.ts --watch=false --browsers=ChromeHeadless`
Expected: FAIL — sub-components not yet imported/used.

- [ ] **Step 3: Check PortfolioService for public load method**

```bash
grep -n "loadPortfolio\|async load\|public load" /mnt/d/Repo/babylon-app/src/services/portfolio.service.ts
```

Note the method name if it exists. If no public `load` method is found, the service self-loads via an internal effect — remove the portfolio load call from ngOnInit.

- [ ] **Step 4: Update page component**

`src/components/v2/portfolio-dashboard/portfolio-dashboard.component.ts` — full replacement:
```typescript
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { PortfolioService } from '../../../services/portfolio.service';
import { PortfolioHistoryService } from '../../../services/portfolio-history.service';
import { FilterStore, AssetClass } from '../../../stores/filter.store';
import { Timeframe } from '../../../models/portfolio-history.model';
import { PortfolioHeroComponent } from './hero/portfolio-hero.component';
import { PortfolioChartComponent } from './chart/portfolio-chart.component';
import { HoldingsListComponent } from './holdings/holdings-list.component';
import { Router } from '@angular/router';

@Component({
  selector: 'app-portfolio-dashboard-v2',
  standalone: true,
  imports: [PortfolioHeroComponent, PortfolioChartComponent, HoldingsListComponent],
  templateUrl: './portfolio-dashboard.component.html',
  styleUrl: './portfolio-dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PortfolioDashboardV2Component implements OnInit {
  protected portfolioService = inject(PortfolioService);
  protected historyService = inject(PortfolioHistoryService);
  protected filterStore = inject(FilterStore);
  private router = inject(Router);

  readonly timePeriod = signal<Timeframe>('1M');

  readonly filteredSnapshots = computed(() =>
    this.historyService.filterByTimeframe(this.timePeriod())
  );

  readonly summary = computed(() =>
    this.historyService.computeSummary(this.filteredSnapshots())
  );

  readonly positive = computed(() => (this.summary()?.valueChange ?? 0) >= 0);

  async ngOnInit(): Promise<void> {
    await this.historyService.loadHistory();
  }

  protected onPeriodChange(p: Timeframe): void { this.timePeriod.set(p); }

  protected navigateToAsset(ticker: string): void {
    this.router.navigate(['/v2/asset', ticker]);
  }
}
```

`src/components/v2/portfolio-dashboard/portfolio-dashboard.component.html`:
```html
<div class="page">
  <app-portfolio-hero
    [totalValue]="portfolioService.totalPortfolioValue()"
    [pnlAmount]="summary()?.valueChange ?? 0"
    [pnlPercent]="summary()?.valueChangePercentage ?? 0"
    [activePeriod]="timePeriod()"
    (periodChange)="onPeriodChange($event)"/>

  <app-portfolio-chart
    [snapshots]="filteredSnapshots()"
    [positive]="positive()"/>

  <app-holdings-list
    [items]="portfolioService.portfolio()"
    (rowClick)="navigateToAsset($event)"/>
</div>
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd /mnt/d/Repo/babylon-app && npx ng test --include=src/components/v2/portfolio-dashboard/portfolio-dashboard.integration.spec.ts --watch=false --browsers=ChromeHeadless`
Expected: PASS — 3 specs.

- [ ] **Step 6: Commit**

```bash
cd /mnt/d/Repo/babylon-app
git add src/components/v2/portfolio-dashboard/
git commit -m "feat(v2): wire PortfolioDashboardV2Component with hero, chart, and holdings"
```

---

### Task 7: CSS variables — ensure shared tokens are defined globally

**Files:**
- Modify: global styles file (check `src/styles.scss`)

The hero filter pills use `--accent-text`, `--accent-border`, `--accent-dim`. The chart tooltip uses `--border-mid`. Verify these exist in the global `:root` block and add if missing.

- [ ] **Step 1: Check existing CSS variables**

```bash
grep -n "accent-text\|accent-border\|accent-dim\|border-mid" /mnt/d/Repo/babylon-app/src/styles.scss 2>/dev/null
grep -rn "accent-text\|accent-border\|accent-dim\|border-mid" /mnt/d/Repo/babylon-app/src/components/v2/shell/
```

- [ ] **Step 2: Add missing variables to `src/styles.scss` if not already in `:root`**

Add any missing variables to the global `:root` block:
```scss
:root {
  /* ... existing vars ... */
  --accent-text:   rgba(187,148,230,0.9);
  --accent-border: rgba(123,47,190,0.3);
  --accent-dim:    rgba(123,47,190,0.12);
  --border-mid:    rgba(255,255,255,0.09);
}
```

If variables are defined inside a component (e.g. `.sidebar-inner`), add them to the global `:root` instead so all v2 components can access them.

- [ ] **Step 3: Build check**

```bash
cd /mnt/d/Repo/babylon-app && npx ng build --configuration=development 2>&1 | tail -20
```
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
cd /mnt/d/Repo/babylon-app
git add src/styles.scss
git commit -m "feat(v2): promote shared CSS variables to global :root"
```

---

### Task 8: Push branch and create PR

**Files:** none

- [ ] **Step 1: Create feature branch if not already on one**

```bash
cd /mnt/d/Repo/babylon-app && git status
```

If on `main`, create the branch:
```bash
cd /mnt/d/Repo/babylon-app && git checkout -b feature/spec003-plan-b-portfolio-dashboard
```

If already on `feature/spec003-plan-b-portfolio-dashboard`, skip.

- [ ] **Step 2: Push branch from Windows terminal**

The push must be done from a Windows terminal (GitHub credentials not available in WSL):
```
git -C "D:\Repo\babylon-app" push -u origin feature/spec003-plan-b-portfolio-dashboard
```

- [ ] **Step 3: Create PR via gh**

```bash
cd /mnt/d/Repo/babylon-app && gh pr create \
  --title "feat(v2): Portfolio Dashboard — hero, chart, holdings (Plan B)" \
  --body "$(cat <<'EOF'
## Summary
- Adds PortfolioDashboardV2Component at route /v2/portfolio
- PortfolioHeroComponent: total value (38px Roboto Mono), P&L row, asset-class filter pills connected to global FilterStore, time filter tabs
- PortfolioChartComponent: SVG with shimmer animate-in, green/red line per period direction, 18% gradient fill, crosshair dot + fixed tooltip, x-axis date labels
- HoldingsListComponent: name + allocation dot/pill, share count + unit price, Daily/Absolute P&L toggle, dimming on filter change

## Test Plan
- [ ] Navigate to /v2/portfolio — hero renders with total value and P&L
- [ ] Toggle time periods — chart re-renders with filtered snapshots
- [ ] Toggle asset-class filter pills — holdings rows dim/restore
- [ ] Hover chart — crosshair dot tracks, tooltip shows value + date
- [ ] Toggle Daily/Absolute — P&L label updates per row
- [ ] Mobile (max-width 768px) — hero value shrinks to 30px, page padding reduces

Generated with Claude Code
EOF
)"
```
