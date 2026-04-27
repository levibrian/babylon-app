import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { PortfolioService } from '../../../services/portfolio.service';
import { PortfolioHistoryService } from '../../../services/portfolio-history.service';
import { FilterStore, ALL_ASSET_CLASSES, AssetClass } from '../../../stores/filter.store';
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

  // Items matching the active asset-class filter
  private readonly visibleItems = computed(() => {
    const items = this.portfolioService.portfolio();
    if (this.filterStore.allActive()) return items;
    return items.filter(item => {
      const cls = item.securityType as AssetClass;
      return this.filterStore.isActive(cls);
    });
  });

  // When a filter is active, derive value & P&L from position data instead of history
  readonly heroTotalValue = computed(() =>
    this.visibleItems().reduce((sum, i) => sum + (i.currentMarketValue ?? i.totalCost), 0)
  );

  readonly heroPnlAmount = computed(() => {
    if (this.filterStore.allActive()) return this.summary()?.valueChange ?? 0;
    return this.visibleItems().reduce((sum, i) => sum + (i.unrealizedPnL ?? 0), 0);
  });

  readonly heroPnlPercent = computed(() => {
    if (this.filterStore.allActive()) return this.summary()?.valueChangePercentage ?? 0;
    const totalCost = this.visibleItems().reduce((sum, i) => sum + i.totalCost, 0);
    if (totalCost === 0) return 0;
    return (this.heroPnlAmount() / totalCost) * 100;
  });

  readonly positive = computed(() => this.heroPnlAmount() >= 0);
  readonly loading = computed(() => this.portfolioService.portfolio().length === 0);

  async ngOnInit(): Promise<void> {
    await this.historyService.loadHistory();
    // PortfolioService self-loads via effect() in its constructor — no explicit call needed
  }

  protected onPeriodChange(p: Timeframe): void { this.timePeriod.set(p); }

  protected navigateToAsset(ticker: string): void {
    this.router.navigate(['/v2/asset', ticker]);
  }
}
