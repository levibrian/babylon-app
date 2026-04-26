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
