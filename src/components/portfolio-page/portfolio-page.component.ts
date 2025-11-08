import { Component, ChangeDetectionStrategy, inject, Signal } from '@angular/core';
import { PortfolioListComponent } from '../portfolio-list/portfolio-list.component';
import { PortfolioService } from '../../services/portfolio.service';
import { TransactionService } from '../../services/transaction.service';
import { PortfolioItem } from '../../models/portfolio.model';
import { Transaction } from '../../models/transaction.model';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-portfolio-page',
  templateUrl: './portfolio-page.component.html',
  imports: [PortfolioListComponent, RouterLink, CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PortfolioPageComponent {
  private portfolioService = inject(PortfolioService);
  private transactionService = inject(TransactionService);
  
  portfolio: Signal<PortfolioItem[]> = this.portfolioService.portfolio;
  totalValue: Signal<number> = this.portfolioService.totalPortfolioValue;
  isLoading: Signal<boolean> = this.portfolioService.loading;
  error: Signal<string | null> = this.portfolioService.error;

  updateTransaction(transaction: Transaction): void {
    this.transactionService.updateTransaction(transaction);
  }

  deleteTransaction(transaction: Transaction): void {
    this.transactionService.deleteTransaction(transaction.id, transaction.ticker);
  }
}