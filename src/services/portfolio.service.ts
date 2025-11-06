import { Injectable, computed, inject, Signal } from '@angular/core';
import { TransactionService } from './transaction.service';
import { PortfolioItem } from '../models/portfolio.model';
import { Transaction } from '../models/transaction.model';

@Injectable({
  providedIn: 'root',
})
export class PortfolioService {
  private transactionService = inject(TransactionService);

  public portfolio: Signal<PortfolioItem[]> = computed(() => {
    const transactions = this.transactionService.transactions();
    const groupedByTicker = this.groupTransactions(transactions);

    const portfolioItems = Object.keys(groupedByTicker).map(ticker => {
      const tickerTransactions = groupedByTicker[ticker];
      let totalShares = 0;
      let totalCost = 0;
      let totalSharesBought = 0;
      let totalCostOfBuys = 0;

      tickerTransactions.forEach(t => {
        if (t.transactionType === 'buy') {
          totalShares += t.shares;
          totalSharesBought += t.shares;
          const costOfThisTransaction = t.shares * t.sharePrice;
          totalCostOfBuys += costOfThisTransaction;
          totalCost += costOfThisTransaction + t.fees;
        } else if (t.transactionType === 'sell') {
          totalShares -= t.shares;
        }
      });
      
      const averageSharePrice = totalSharesBought > 0 ? totalCostOfBuys / totalSharesBought : 0;

      // Filter out positions that have been completely sold
      if (totalShares < 0.000001) {
          return null;
      }

      // Sort transactions by date, earliest to oldest for the detail view
      const sortedTransactions = [...tickerTransactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      return {
        ticker,
        totalShares,
        totalCost,
        averageSharePrice,
        transactions: sortedTransactions,
      };
    }).filter((item): item is PortfolioItem => item !== null);

    // Order portfolio by total investment amount, descending
    return portfolioItems.sort((a, b) => b.totalCost - a.totalCost);
  });

  public totalPortfolioValue: Signal<number> = computed(() => {
    return this.portfolio().reduce((acc, item) => acc + item.totalCost, 0);
  });

  private groupTransactions(transactions: Transaction[]): { [key: string]: Transaction[] } {
    return transactions.reduce((acc, transaction) => {
      if (!acc[transaction.ticker]) {
        acc[transaction.ticker] = [];
      }
      acc[transaction.ticker].push(transaction);
      return acc;
    }, {} as { [key: string]: Transaction[] });
  }
}