import { ChangeDetectionStrategy, Component, DestroyRef, EventEmitter, Input, Output, inject, signal, computed } from '@angular/core';

type PnlMode = 'absolute' | 'relative';
import { PortfolioItem } from '../../../../models/portfolio.model';
import { FilterStore, AssetClass } from '../../../../stores/filter.store';


@Component({
  selector: 'app-holdings-list',
  standalone: true,
  imports: [],
  templateUrl: './holdings-list.component.html',
  styleUrl: './holdings-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HoldingsListComponent {
  @Input() items: PortfolioItem[] = [];
  @Input() loading = false;
  @Output() rowClick = new EventEmitter<string>();

  protected readonly skeletonRows = [1, 2, 3, 4, 5];

  protected filterStore = inject(FilterStore);
  private destroyRef = inject(DestroyRef);
  protected pnlMode = signal<PnlMode>('absolute');

  protected setMode(m: PnlMode): void { this.pnlMode.set(m); }
  protected togglePnlMode(): void {
    this.pnlMode.set(this.pnlMode() === 'absolute' ? 'relative' : 'absolute');
  }

  protected tappedTicker = signal<string | null>(null);

  protected onRowClick(ticker: string): void {
    this.tappedTicker.set(ticker);
    const id = setTimeout(() => {
      this.tappedTicker.set(null);
      this.rowClick.emit(ticker);
    }, 160);
    this.destroyRef.onDestroy(() => clearTimeout(id));
  }

  private tipItem = signal<PortfolioItem | null>(null);
  private tipPos  = signal<{ x: number; y: number }>({ x: 0, y: 0 });

  protected tipVisible = computed(() => this.tipItem() !== null);
  protected tipX       = computed(() => this.tipPos().x);
  protected tipY       = computed(() => this.tipPos().y);
  protected tipCurrent = computed(() => {
    const item = this.tipItem();
    return item ? item.currentAllocationPercentage.toFixed(1) + '%' : '';
  });
  protected tipTarget  = computed(() => {
    const item = this.tipItem();
    return item ? item.targetAllocationPercentage.toFixed(1) + '%' : '';
  });
  protected tipStatus  = computed(() => { const i = this.tipItem(); return i ? this.allocClass(i) : ''; });

  protected showTip(event: MouseEvent, item: PortfolioItem): void {
    const el   = event.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    this.tipItem.set(item);
    this.tipPos.set({ x: rect.left + rect.width / 2, y: rect.top - 34 });
  }

  protected hideTip(): void { this.tipItem.set(null); }

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
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(n);
  }

  protected pnlLabel(item: PortfolioItem): string {
    if (this.pnlMode() === 'relative') {
      const amt = item.unrealizedPnL;
      if (amt === null) return '—';
      const sign = amt >= 0 ? '+' : '';
      return `${sign}${this.formatValue(amt)}`;
    }
    const pct = item.unrealizedPnLPercentage;
    if (pct === null) return '—';
    const sign = pct >= 0 ? '+' : '';
    return `${sign}${pct.toFixed(1)}%`;
  }

  protected pnlPositive(item: PortfolioItem): boolean {
    return (item.unrealizedPnL ?? 0) >= 0;
  }

  protected pricePerShare(item: PortfolioItem): number | null {
    if (item.currentMarketValue == null || item.totalShares === 0) return null;
    return item.currentMarketValue / item.totalShares;
  }

  protected trackByTicker(_: number, item: PortfolioItem): string { return item.ticker; }
}
