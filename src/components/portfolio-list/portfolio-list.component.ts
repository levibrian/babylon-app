import { Component, ChangeDetectionStrategy, input, signal } from '@angular/core';
import { CommonModule, CurrencyPipe, DecimalPipe, TitleCasePipe } from '@angular/common';
import { PortfolioItem } from '../../models/portfolio.model';
import { Transaction } from '../../models/transaction.model';

@Component({
  selector: 'app-portfolio-list',
  templateUrl: './portfolio-list.component.html',
  imports: [CommonModule, CurrencyPipe, DecimalPipe, TitleCasePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PortfolioListComponent {
  portfolio = input.required<PortfolioItem[]>();
  
  private expandedTickers = signal(new Set<string>());

  isExpanded(ticker: string): boolean {
    return this.expandedTickers().has(ticker);
  }

  toggleExpand(ticker: string): void {
    this.expandedTickers.update(tickers => {
      const newTickers = new Set(tickers);
      if (newTickers.has(ticker)) {
        newTickers.delete(ticker);
      } else {
        newTickers.add(ticker);
      }
      return newTickers;
    });
  }

  getTransactionTypePillClass(type: Transaction['transactionType']): string {
    switch (type) {
      case 'buy':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'sell':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'dividend':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  }

  getTotalValue(transaction: Transaction): number {
    return transaction.shares * transaction.sharePrice;
  }

  getValuePrefix(type: Transaction['transactionType']): string {
    if (type === 'buy') return '-';
    if (type === 'sell') return '+';
    return '+'; // Dividends are gains
  }
}