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
      
      // Fetch portfolio data and insights in parallel
      const [portfolioResponse, insightsResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/api/v1/portfolios/${USER_ID}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }),
        fetch(`${API_BASE_URL}/api/v1/portfolios/insights?userId=${USER_ID}&limit=5`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        })
      ]);

      if (!portfolioResponse.ok) {
        throw new Error(`Failed to fetch portfolio: ${portfolioResponse.status} ${portfolioResponse.statusText}`);
      }

      const data: ApiPortfolioResponse = await portfolioResponse.json();
      const portfolioItems = this.mapApiDataToPortfolio(data);
      this._recalculateAndSetPortfolio(portfolioItems);

      this._dailyGainLoss.set(data.dailyGainLoss ?? 0);
      this._dailyGainLossPercentage.set(data.dailyGainLossPercentage ?? 0);

      // Fetch insights from dedicated endpoint
      if (insightsResponse.ok) {
        const insightsResponseData = await insightsResponse.json();
        // Handle both array response and wrapped response
        const insightsArray: ApiPortfolioInsight[] = Array.isArray(insightsResponseData) 
          ? insightsResponseData 
          : (insightsResponseData.insights || insightsResponseData.data || []);
        this._insights.set(this.mapApiInsightsToPortfolioInsights(insightsArray));
      } else {
        // Fallback to insights from portfolio response if insights endpoint fails
        this._insights.set(this.mapApiInsightsToPortfolioInsights(data.insights || []));
      }

    } catch (err) {
      this._error.set('Could not load portfolio. Please ensure the backend server is running and accessible.');
      console.error('Error fetching portfolio:', err);
    } finally {
      this._loading.set(false);
    }
  }

  /**
   * Optimistic UI update for adding a transaction.
   * NOTE: This method is NOT called directly by components. All transaction operations
   * go through TransactionService, which triggers PortfolioService.reload() after backend sync.
   * 
   * This method is kept for potential future use but currently serves as a reference.
   * It only performs simple aggregations (shares, cost, avg price) and marks the position
   * as pending sync. Allocation calculations are deferred to backend.
   */
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
            currentAllocationPercentage: 0,
            allocationDifference: 0,
            rebalanceAmount: 0,
            rebalancingStatus: 'Balanced',
            transactions: [newTransaction],
        };
        portfolioCopy.push(position);
    }
    
    // Only recalculate simple aggregations (shares, cost, avg price)
    // Allocation calculations are deferred to backend to avoid floating-point inconsistencies
    this._recalculatePositionAggregates(position);
    
    // Mark position as pending sync - allocation values will be updated when backend responds
    position.pendingSync = true;
    
    // Update total invested, but keep existing allocation values from backend
    // These will be refreshed when TransactionService triggers reload()
    const totalInvested = portfolioCopy.reduce((sum, p) => sum + p.totalCost, 0);
    this._totalInvested.set(totalInvested);
    this._portfolio.set(portfolioCopy);
  }

  /**
   * Optimistic UI update for updating a transaction.
   * NOTE: This method is NOT called directly by components. All transaction operations
   * go through TransactionService, which triggers PortfolioService.reload() after backend sync.
   * 
   * This method is kept for potential future use but currently serves as a reference.
   * It only performs simple aggregations (shares, cost, avg price) and marks the position
   * as pending sync. Allocation calculations are deferred to backend.
   */
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
    
    // Only recalculate simple aggregations (shares, cost, avg price)
    // Allocation calculations are deferred to backend to avoid floating-point inconsistencies
    this._recalculatePositionAggregates(position);
    
    // Mark position as pending sync - allocation values will be updated when backend responds
    position.pendingSync = true;
    
    // Update total invested, but keep existing allocation values from backend
    const totalInvested = portfolioCopy.reduce((sum, p) => sum + p.totalCost, 0);
    this._totalInvested.set(totalInvested);
    this._portfolio.set(portfolioCopy);
  }

  /**
   * Optimistic UI update for deleting a transaction.
   * NOTE: This method is NOT called directly by components. All transaction operations
   * go through TransactionService, which triggers PortfolioService.reload() after backend sync.
   * 
   * This method is kept for potential future use but currently serves as a reference.
   * It only performs simple aggregations (shares, cost, avg price) and marks the position
   * as pending sync. Allocation calculations are deferred to backend.
   */
  public deleteTransaction(transactionId: string, ticker: string): void {
    const portfolioCopy = JSON.parse(JSON.stringify(this._portfolio()));
    let position = portfolioCopy.find(p => p.ticker === ticker);

    if (!position) {
      console.error('Position not found for transaction deletion:', ticker);
      return;
    }

    position.transactions = position.transactions.filter(t => t.id !== transactionId);

    if (position.transactions.length === 0) {
      // Remove position entirely
      const portfolioWithoutPosition = portfolioCopy.filter(p => p.ticker !== ticker);
      const totalInvested = portfolioWithoutPosition.reduce((sum, p) => sum + p.totalCost, 0);
      this._totalInvested.set(totalInvested);
      this._portfolio.set(portfolioWithoutPosition);
    } else {
      // Only recalculate simple aggregations (shares, cost, avg price)
      // Allocation calculations are deferred to backend to avoid floating-point inconsistencies
      this._recalculatePositionAggregates(position);
      
      // Mark position as pending sync - allocation values will be updated when backend responds
      position.pendingSync = true;
      
      // Update total invested, but keep existing allocation values from backend
      const totalInvested = portfolioCopy.reduce((sum, p) => sum + p.totalCost, 0);
      this._totalInvested.set(totalInvested);
      this._portfolio.set(portfolioCopy);
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

  private _recalculateAndSetPortfolio(items: PortfolioItem[]): void {
    const totalInvested = items.reduce((sum, p) => sum + p.totalCost, 0);
    this._totalInvested.set(totalInvested);

    // Use backend's allocation calculations directly - no recalculation needed
    // Backend is the Source of Truth for allocation calculations
    // Clear pending sync flags when receiving fresh data from backend
    const itemsWithClearedPending = items.map(p => ({ ...p, pendingSync: false }));
    this._portfolio.set(itemsWithClearedPending);
  }

  /**
   * @deprecated This method duplicates backend allocation calculation logic and can cause
   * floating-point inconsistencies between JavaScript and C#. Allocation calculations should
   * only be performed by the backend. This method is kept for reference but should not be used.
   * 
   * See: PROJECT_DOCUMENTATION.md - "Architectural Risks & Recommendations" section
   */
  private _recalculateAllocations(items: PortfolioItem[]): PortfolioItem[] {
    const totalInvested = items.reduce((sum, p) => sum + p.totalCost, 0);
    
    // Recalculate allocations for local modifications (before backend sync)
    return items.map(p => {
      const currentAllocationPercentage = totalInvested > 0 ? (p.totalCost / totalInvested) * 100 : 0;
      const allocationDifference = currentAllocationPercentage - p.targetAllocationPercentage;
      const rebalanceAmount = (allocationDifference / 100) * totalInvested;
      
      // Determine rebalancing status based on allocation difference
      let rebalancingStatus = 'Balanced';
      if (allocationDifference > 0.1) {
        rebalancingStatus = 'Overweight';
      } else if (allocationDifference < -0.1) {
        rebalancingStatus = 'Underweight';
      }

      return {
        ...p,
        currentAllocationPercentage,
        allocationDifference,
        rebalanceAmount,
        rebalancingStatus
      };
    });
  }

  private mapApiDataToPortfolio(data: ApiPortfolioResponse): PortfolioItem[] {
    return data.positions.map(position => ({
      ticker: position.ticker,
      companyName: position.securityName,
      totalCost: position.totalInvested,
      totalShares: position.totalShares,
      averageSharePrice: position.averageSharePrice,
      securityType: position.securityType,
      targetAllocationPercentage: position.targetAllocationPercentage, // Already a percentage
      // Use backend's allocation calculations
      currentAllocationPercentage: position.currentAllocationPercentage ?? 0,
      allocationDifference: position.allocationDeviation, // Backend uses allocationDeviation
      rebalanceAmount: position.rebalancingAmount,
      rebalancingStatus: position.rebalancingStatus, // "Balanced", "Overweight", or "Underweight"
      transactions: mapApiTransactionsToTransactions(
        position.transactions,
        position.ticker // Fallback ticker from position if transaction doesn't have it
      ),
    }));
  }

  private mapApiInsightsToPortfolioInsights(insights: ApiPortfolioInsight[] | undefined): PortfolioInsight[] {
    if (!insights || !Array.isArray(insights)) return [];
    return insights.map(i => ({
      message: i.message,
      severity: i.severity, // 'Info' | 'Warning' | 'Critical'
      type: i.type,
      ticker: i.ticker,
      amount: i.amount,
      actionLabel: i.actionLabel,
      visualContext: i.visualContext ? {
        now: i.visualContext.now,
        target: i.visualContext.target,
        after: i.visualContext.after
      } : null
    }));
  }
}