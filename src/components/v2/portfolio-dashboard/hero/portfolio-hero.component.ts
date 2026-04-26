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
