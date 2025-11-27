import { Component, ChangeDetectionStrategy, inject, Signal, signal, OnDestroy, effect } from '@angular/core';
import { PortfolioListComponent } from '../portfolio-list/portfolio-list.component';
import { StrategyPanelComponent } from '../strategy-panel/strategy-panel.component';
import { PortfolioDashboardComponent } from '../portfolio-dashboard/portfolio-dashboard.component';
import { PortfolioService } from '../../services/portfolio.service';
import { TransactionService } from '../../services/transaction.service';
import { PortfolioItem, PortfolioInsight } from '../../models/portfolio.model';
import { Transaction } from '../../models/transaction.model';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { PortfolioSkeletonComponent } from '../ghosting-elements/portfolio-skeleton/portfolio-skeleton.component';
import { ErrorStateComponent } from '../common/error-state/error-state.component';

@Component({
  selector: 'app-portfolio-page',
  templateUrl: './portfolio-page.component.html',
  imports: [PortfolioListComponent, StrategyPanelComponent, PortfolioDashboardComponent, RouterLink, CommonModule, PortfolioSkeletonComponent, ErrorStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PortfolioPageComponent implements OnDestroy {
  portfolioService = inject(PortfolioService);
  transactionService = inject(TransactionService);
  
  portfolio: Signal<PortfolioItem[]> = this.portfolioService.portfolio;
  transactions: Signal<Transaction[]> = this.transactionService.transactions;
  totalValue: Signal<number> = this.portfolioService.totalPortfolioValue;
  isLoading: Signal<boolean> = this.portfolioService.loading;
  error: Signal<string | null> = this.portfolioService.error;

  dailyGainLoss: Signal<number> = this.portfolioService.dailyGainLoss;
  dailyGainLossPercentage: Signal<number> = this.portfolioService.dailyGainLossPercentage;
  insights: Signal<PortfolioInsight[]> = this.portfolioService.insights;

  currentInsightIndex = signal(0);
  private insightTimeout: any;
  
  // Right pane state: 'positions' | 'strategy'
  activeView = signal<'positions' | 'strategy'>('positions');

  constructor() {
    effect(() => {
      // This effect runs whenever the insights signal changes.
      // It resets the carousel to the first slide and restarts the auto-play timer.
      this.currentInsightIndex.set(0);
      this.stopAndRestartCarousel();
    });
  }
  
  ngOnDestroy(): void {
    this.stopInsightCarousel();
  }

  private stopAndRestartCarousel(): void {
    this.stopInsightCarousel();
    if (this.insights().length > 1) {
      this.scheduleNextInsight();
    }
  }

  private scheduleNextInsight(): void {
    this.insightTimeout = setTimeout(() => {
      this.currentInsightIndex.update(i => (i + 1) % (this.insights().length || 1));
      this.scheduleNextInsight(); // Loop
    }, 5000);
  }

  private stopInsightCarousel(): void {
    if (this.insightTimeout) {
      clearTimeout(this.insightTimeout);
      this.insightTimeout = undefined;
    }
  }

  setCurrentInsight(index: number): void {
    this.currentInsightIndex.set(index);
    this.stopAndRestartCarousel(); // Reset timer on manual navigation
  }

  getInsightSeverityClass(severity: PortfolioInsight['severity']): string {
    switch (severity) {
      case 'warning':
        return 'text-red-600';
      case 'positive':
        return 'text-green-600';
      case 'info':
      default:
        return 'text-gray-600';
    }
  }

  async updateTransaction(transaction: Transaction): Promise<void> {
    await this.transactionService.updateTransaction(transaction);
  }

  async deleteTransaction(transaction: Transaction): Promise<void> {
    await this.transactionService.deleteTransaction(transaction.id, transaction.ticker);
  }

  onAssetClick(ticker: string): void {
    // Switch to positions view when an asset is clicked
    this.activeView.set('positions');
  }

  setActiveView(view: 'positions' | 'strategy'): void {
    this.activeView.set(view);
  }
}
