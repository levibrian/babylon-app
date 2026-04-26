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
