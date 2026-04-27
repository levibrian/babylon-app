import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { PortfolioService } from '../../../services/portfolio.service';
import { PortfolioHistoryService } from '../../../services/portfolio-history.service';
import { FilterStore } from '../../../stores/filter.store';
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
    // PortfolioService self-loads via effect() in its constructor — no explicit call needed
  }

  protected onPeriodChange(p: Timeframe): void { this.timePeriod.set(p); }

  protected navigateToAsset(ticker: string): void {
    this.router.navigate(['/v2/asset', ticker]);
  }
}
