import { Injectable, signal, Signal, computed } from '@angular/core';
import { PortfolioItem, PortfolioInsight } from '../models/portfolio.model';
import { ApiPortfolioResponse, ApiPortfolioInsight } from '../models/api-response.model';
import { Transaction, NewTransactionData } from '../models/transaction.model';
import { mapApiTransactionsToTransactions } from '../utils/transaction-mapper.util';

const API_BASE_URL = 'https://localhost:7192';
const USER_ID = 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d';

@Injectable({
  providedIn: 'root',
})
export class PortfolioService {
  private readonly _portfolio = signal<PortfolioItem[]>([]);
  private readonly _totalInvested = signal(0);
  private readonly _loading = signal(true);
  private readonly _error = signal<string | null>(null);
  private readonly _dailyGainLoss = signal(0);
  private readonly _dailyGainLossPercentage = signal(0);
  private readonly _insights = signal<PortfolioInsight[]>([]);

  public readonly portfolio: Signal<PortfolioItem[]> = this._portfolio.asReadonly();
  public readonly totalInvested: Signal<number> = this._totalInvested.asReadonly();
  public readonly loading: Signal<boolean> = this._loading.asReadonly();
  public readonly error: Signal<string | null> = this._error.asReadonly();
  public readonly dailyGainLoss: Signal<number> = this._dailyGainLoss.asReadonly();
  public readonly dailyGainLossPercentage: Signal<number> = this._dailyGainLossPercentage.asReadonly();
  public readonly insights: Signal<PortfolioInsight[]> = this._insights.asReadonly();
  public readonly totalPortfolioValue: Signal<number> = computed(() => this.totalInvested() + this.dailyGainLoss());

  constructor() {
    this.fetchPortfolio();
  }

  async reload(): Promise<void> {
    this._loading.set(true);
    await this.fetchPortfolio();
  }

  private async fetchPortfolio(): Promise<void> {
    try {
      this._error.set(null);
      this._loading.set(true);
      
      // Real API call to fetch portfolio data
      const response = await fetch(`${API_BASE_URL}/api/v1/portfolios/${USER_ID}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch portfolio: ${response.status} ${response.statusText}`);
      }

      const data: ApiPortfolioResponse = await response.json();

      const portfolioItems = this.mapApiDataToPortfolio(data);
      this._recalculateAndSetPortfolio(portfolioItems);

      this._dailyGainLoss.set(data.dailyGainLoss ?? 0);
      this._dailyGainLossPercentage.set(data.dailyGainLossPercentage ?? 0);
      this._insights.set(this.mapApiInsightsToPortfolioInsights(data.insights));

    } catch (err) {
      this._error.set('Could not load portfolio. Please ensure the backend server is running and accessible.');
      console.error('Error fetching portfolio:', err);
    } finally {
      this._loading.set(false);
    }
  }

  public addTransaction(transactionData: NewTransactionData): void {
    const totalAmount = transactionData.shares * transactionData.sharePrice;
    const newTransaction: Transaction = {
        ...transactionData,
        id: `txn_${new Date().getTime()}`,
        totalAmount,
        ticker: transactionData.ticker.toUpperCase(),
    };
    
    const portfolioCopy = JSON.parse(JSON.stringify(this._portfolio()));
    let position = portfolioCopy.find(p => p.ticker === newTransaction.ticker);

    if (position) {
        position.transactions.push(newTransaction);
    } else {
        position = {
            ticker: newTransaction.ticker,
            companyName: `${newTransaction.ticker} (New)`,
            totalShares: 0,
            totalCost: 0,
            averageSharePrice: 0,
            targetAllocationPercentage: 0, // Default target
            transactions: [newTransaction],
        };
        portfolioCopy.push(position);
    }
    
    this._recalculatePositionAggregates(position);
    this._recalculateAndSetPortfolio(portfolioCopy);
  }

  public updateTransaction(updatedTx: Transaction): void {
    const portfolioCopy = JSON.parse(JSON.stringify(this._portfolio()));
    const position = portfolioCopy.find(p => p.ticker === updatedTx.ticker);

    if (!position) {
      console.error('Position not found for transaction update:', updatedTx);
      return;
    }

    const txIndex = position.transactions.findIndex(t => t.id === updatedTx.id);
    if (txIndex === -1) {
      console.error('Transaction not found for update:', updatedTx);
      return;
    }

    // Recalculate totalAmount before updating
    const totalAmount = updatedTx.shares * updatedTx.sharePrice;
    const finalUpdatedTx: Transaction = { ...updatedTx, totalAmount };
    position.transactions[txIndex] = finalUpdatedTx;
    
    this._recalculatePositionAggregates(position);
    this._recalculateAndSetPortfolio(portfolioCopy);
  }

  public deleteTransaction(transactionId: string, ticker: string): void {
    const portfolioCopy = JSON.parse(JSON.stringify(this._portfolio()));
    let position = portfolioCopy.find(p => p.ticker === ticker);

    if (!position) {
      console.error('Position not found for transaction deletion:', ticker);
      return;
    }

    position.transactions = position.transactions.filter(t => t.id !== transactionId);

    if (position.transactions.length === 0) {
      const portfolioWithoutPosition = portfolioCopy.filter(p => p.ticker !== ticker);
      this._recalculateAndSetPortfolio(portfolioWithoutPosition);
    } else {
      this._recalculatePositionAggregates(position);
      this._recalculateAndSetPortfolio(portfolioCopy);
    }
  }

  private _recalculatePositionAggregates(position: PortfolioItem): void {
    const buys = position.transactions.filter(t => t.transactionType === 'buy');
    const totalBuyShares = buys.reduce((sum, t) => sum + t.shares, 0);
    const totalBuyCost = buys.reduce((sum, t) => sum + t.totalAmount + t.fees, 0);
    const averageBuyPrice = totalBuyShares > 0 ? totalBuyCost / totalBuyShares : 0;
    
    let finalShares = 0;
    let finalCost = 0;
    position.transactions.forEach(t => {
        if (t.transactionType === 'buy') {
            finalShares += t.shares;
            finalCost += t.totalAmount + t.fees;
        } else if (t.transactionType === 'sell') {
            finalShares -= t.shares;
            // When selling, reduce total cost by the original average cost of the shares sold
            finalCost -= t.shares * averageBuyPrice;
        }
        // Dividends don't affect share count or cost basis in this model
    });

    position.totalShares = finalShares > 0 ? finalShares : 0;
    position.totalCost = finalCost > 0 ? finalCost : 0;
    position.averageSharePrice = position.totalShares > 0 ? position.totalCost / position.totalShares : 0;
  }

  private _recalculateAndSetPortfolio(items: Omit<PortfolioItem, 'currentAllocationPercentage' | 'allocationDifference' | 'rebalanceAmount'>[]): void {
    const totalInvested = items.reduce((sum, p) => sum + p.totalCost, 0);
    this._totalInvested.set(totalInvested);

    const calculatedPortfolio = items.map(p => {
        const currentAllocationPercentage = totalInvested > 0 ? (p.totalCost / totalInvested) * 100 : 0;
        const allocationDifference = currentAllocationPercentage - p.targetAllocationPercentage;
        const rebalanceAmount = (allocationDifference / 100) * totalInvested;

        return {
            ...p,
            currentAllocationPercentage,
            allocationDifference,
            rebalanceAmount
        };
    });
    this._portfolio.set(calculatedPortfolio);
  }

  private mapApiDataToPortfolio(data: ApiPortfolioResponse): Omit<PortfolioItem, 'currentAllocationPercentage' | 'allocationDifference' | 'rebalanceAmount'>[] {
    return data.positions.map(position => ({
      ticker: position.ticker,
      companyName: position.securityName,
      totalCost: position.totalInvested,
      totalShares: position.totalShares,
      averageSharePrice: position.averageSharePrice,
      targetAllocationPercentage: position.targetAllocationPercentage, // Already a percentage
      transactions: mapApiTransactionsToTransactions(
        position.transactions,
        position.ticker // Fallback ticker from position if transaction doesn't have it
      ),
    }));
  }

  private mapApiInsightsToPortfolioInsights(insights: ApiPortfolioInsight[] | undefined): PortfolioInsight[] {
    if (!insights) return [];
    return insights.map(i => ({
      message: i.message,
      severity: i.severity
    }));
  }
}