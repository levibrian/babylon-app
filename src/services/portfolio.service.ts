import { Injectable, signal, Signal, computed, inject, effect } from '@angular/core';
import { AuthService } from './auth.service';
import { PortfolioItem, PortfolioInsight } from '../models/portfolio.model';
import { ApiPortfolioResponse, ApiPortfolioInsight } from '../models/api-response.model';
import { Transaction, NewTransactionData } from '../models/transaction.model';
import { mapApiTransactionsToTransactions } from '../utils/transaction-mapper.util';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';

import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class PortfolioService {
  private http = inject(HttpClient);
  private readonly _portfolio = signal<PortfolioItem[]>([]);
  private readonly _totalInvested = signal(0);
  private readonly _cashAmount = signal(0); // NEW
  private readonly _totalMarketValue = signal<number | null>(null); // NEW
  private readonly _totalPnL = signal<number | null>(null); // NEW
  private readonly _totalPnLPercentage = signal<number | null>(null); // NEW
  private readonly _loading = signal(true);
  private readonly _error = signal<string | null>(null);
  private readonly _dailyGainLoss = signal(0);
  private readonly _dailyGainLossPercentage = signal(0);
  private readonly _insights = signal<PortfolioInsight[]>([]);

  public readonly portfolio: Signal<PortfolioItem[]> = this._portfolio.asReadonly();
  public readonly totalInvested: Signal<number> = this._totalInvested.asReadonly();
  public readonly cashAmount: Signal<number> = this._cashAmount.asReadonly(); // NEW
  public readonly loading: Signal<boolean> = this._loading.asReadonly();
  public readonly error: Signal<string | null> = this._error.asReadonly();
  public readonly dailyGainLoss: Signal<number> = this._dailyGainLoss.asReadonly();
  public readonly dailyGainLossPercentage: Signal<number> = this._dailyGainLossPercentage.asReadonly();
  public readonly insights: Signal<PortfolioInsight[]> = this._insights.asReadonly();
  /**
   * Total portfolio value calculated from current market values of all positions.
   * Uses currentMarketValue from each position if available, otherwise falls back to cost basis.
   * This provides the most accurate portfolio value based on current/last close prices.
   */
  public readonly totalPortfolioValue: Signal<number> = computed(() => {
    // 1. Use backend-provided total market value if available
    const backendTotal = this._totalMarketValue();
    if (backendTotal !== null) return backendTotal;

    // 2. Fallback to client-side calculation from positions
    const items = this._portfolio();
    const totalMarketValue = items.reduce((sum, item) => {
      return sum + (item.currentMarketValue ?? item.totalCost);
    }, 0);
    return totalMarketValue;
  });

  /**
   * All-time P&L calculated as total market value minus total invested.
   * This represents unrealized gains/losses across all positions.
   */
  public readonly totalPnL: Signal<number> = computed(() => {
    // 1. Use backend-provided total P&L if available
    const backendPnL = this._totalPnL();
    if (backendPnL !== null) return backendPnL;

    // 2. Fallback to client-side calculation
    return this.totalPortfolioValue() - this.totalInvested();
  });

  /**
   * All-time P&L percentage.
   */
  public readonly totalPnLPercentage: Signal<number> = computed(() => {
    // 1. Use backend-provided total P&L % if available
    const backendPnLPercentage = this._totalPnLPercentage();
    if (backendPnLPercentage !== null) return backendPnLPercentage;

    // 2. Fallback to client-side calculation
    const invested = this.totalInvested();
    if (invested === 0) return 0;
    return (this.totalPnL() / invested) * 100;
  });

  private authService = inject(AuthService);

  constructor() {
    // Reactive data fetching based on auth state
    effect(() => {
      if (this.authService.isAuthenticated()) {
        this.fetchPortfolio();
      } else {
        this.reset();
      }
    });
  }

  /**
   * Clears all portfolio state. Called on logout.
   */
  public reset(): void {
    this._portfolio.set([]);
    this._totalInvested.set(0);
    this._cashAmount.set(0);
    this._totalMarketValue.set(null);
    this._totalPnL.set(null);
    this._totalPnLPercentage.set(null);
    this._loading.set(false);
    this._error.set(null);
    this._dailyGainLoss.set(0);
    this._dailyGainLossPercentage.set(0);
    this._insights.set([]);
  }

  async reload(): Promise<void> {
    this._loading.set(true);
    await this.fetchPortfolio();
  }

  /**
   * Silent reload - refreshes data without triggering loading state.
   * Use this after operations where we want to update data in the background
   * without showing loading spinners (e.g., after submitting new transactions).
   */
  async reloadSilent(): Promise<void> {
    await this.fetchPortfolioSilent();
  }

  private async fetchPortfolio(): Promise<void> {
    try {
      this._error.set(null);
      this._loading.set(true);
      
      const portfolioResponse = await lastValueFrom(
        this.http.get<ApiPortfolioResponse>(`${environment.apiUrl}/api/v1/portfolios`)
      );

      const portfolioItems = this.mapApiDataToPortfolio(portfolioResponse);
      this._recalculateAndSetPortfolio(portfolioItems);

      // Set backend totals
      this._totalInvested.set(portfolioResponse.totalInvested ?? portfolioResponse.TotalInvested ?? 0);
      this._cashAmount.set(portfolioResponse.cashAmount ?? portfolioResponse.CashAmount ?? 0);
      this._totalMarketValue.set(portfolioResponse.totalMarketValue ?? portfolioResponse.TotalMarketValue ?? null);
      this._totalPnL.set(portfolioResponse.totalUnrealizedPnL ?? portfolioResponse.TotalUnrealizedPnL ?? null);
      this._totalPnLPercentage.set(portfolioResponse.totalUnrealizedPnLPercentage ?? portfolioResponse.TotalUnrealizedPnLPercentage ?? null);

      this._dailyGainLoss.set(portfolioResponse.dailyGainLoss ?? portfolioResponse.DailyGainLoss ?? 0);
      this._dailyGainLossPercentage.set(portfolioResponse.dailyGainLossPercentage ?? portfolioResponse.DailyGainLossPercentage ?? 0);

      const rawInsights = portfolioResponse.insights || portfolioResponse.Insights || [];
      this._insights.set(this.mapApiInsightsToPortfolioInsights(rawInsights));

    } catch (err) {
      this._error.set('Could not load portfolio data. Please ensure the backend server is running and accessible.');
      console.error('Error fetching portfolio:', err);
    } finally {
      this._loading.set(false);
    }
  }

  /**
   * Silent fetch - refreshes portfolio data without updating loading state.
   * Used for background refreshes after operations to avoid UI flicker.
   */
  private async fetchPortfolioSilent(): Promise<void> {
    try {
      const portfolioResponse = await lastValueFrom(
        this.http.get<ApiPortfolioResponse>(`${environment.apiUrl}/api/v1/portfolios`)
      );

      const portfolioItems = this.mapApiDataToPortfolio(portfolioResponse);
      this._recalculateAndSetPortfolio(portfolioItems);

      // Set backend totals
      this._totalInvested.set(portfolioResponse.totalInvested ?? portfolioResponse.TotalInvested ?? 0);
      this._cashAmount.set(portfolioResponse.cashAmount ?? portfolioResponse.CashAmount ?? 0);
      this._totalMarketValue.set(portfolioResponse.totalMarketValue ?? portfolioResponse.TotalMarketValue ?? null);
      this._totalPnL.set(portfolioResponse.totalUnrealizedPnL ?? portfolioResponse.TotalUnrealizedPnL ?? null);
      this._totalPnLPercentage.set(portfolioResponse.totalUnrealizedPnLPercentage ?? portfolioResponse.TotalUnrealizedPnLPercentage ?? null);

      this._dailyGainLoss.set(portfolioResponse.dailyGainLoss ?? portfolioResponse.DailyGainLoss ?? 0);
      this._dailyGainLossPercentage.set(portfolioResponse.dailyGainLossPercentage ?? portfolioResponse.DailyGainLossPercentage ?? 0);

      const rawInsights = portfolioResponse.insights || portfolioResponse.Insights || [];
      this._insights.set(this.mapApiInsightsToPortfolioInsights(rawInsights));

    } catch (err) {
      console.error('Error fetching portfolio (silent):', err);
      // Don't set error state for silent fetches - keep existing data
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
            rebalanceAmount: null,
            rebalancingStatus: 'Balanced' as const,
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
      let rebalancingStatus: "Balanced" | "Overweight" | "Underweight" = 'Balanced';
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
    const rawPositions = data.positions || data.Positions || [];
    return rawPositions.map(position => ({
      ticker: position.ticker,
      companyName: position.securityName,
      totalCost: position.totalInvested,
      totalShares: position.totalShares,
      averageSharePrice: position.averageSharePrice,
      currentMarketValue: position.currentMarketValue, // Current market value (from current/last close price)
      unrealizedPnL: position.unrealizedPnL ?? null,
      unrealizedPnLPercentage: position.unrealizedPnLPercentage ?? null,
      securityType: position.securityType,
      // Security metadata (NEW)
      sector: position.sector,
      industry: position.industry,
      geography: position.geography,
      marketCap: position.marketCap,
      // Allocation properties
      targetAllocationPercentage: position.targetAllocationPercentage, // Already a percentage
      // Use backend's allocation calculations
      currentAllocationPercentage: position.currentAllocationPercentage ?? 0,
      allocationDifference: position.allocationDeviation, // Backend uses allocationDeviation
      rebalanceAmount: position.rebalancingAmount,
      rebalancingStatus: position.rebalancingStatus as "Balanced" | "Overweight" | "Underweight",
      transactions: mapApiTransactionsToTransactions(
        position.transactions,
        position.ticker // Fallback ticker from position if transaction doesn't have it
      ),
    }));
  }

  private mapApiInsightsToPortfolioInsights(insights: ApiPortfolioInsight[] | undefined): PortfolioInsight[] {
    if (!insights || !Array.isArray(insights)) return [];
    return insights.map(i => ({
      category: (i.category || i.Category || 'Trend') as "Risk" | "Opportunity" | "Trend" | "Efficiency" | "Income",
      title: i.title || i.Title || '',
      message: i.message || i.Message || '',
      relatedTicker: i.relatedTicker || i.RelatedTicker || null,
      metadata: i.metadata || i.Metadata || {},
      severity: i.severity || i.Severity || 'Info',
      actionLabel: i.actionLabel || i.ActionLabel || null,
      actionPayload: i.actionPayload || i.ActionPayload || null,
      visualContext: (i.visualContext || i.VisualContext) ? {
        currentValue: (i.visualContext || i.VisualContext)?.currentValue || 0,
        targetValue: (i.visualContext || i.VisualContext)?.targetValue || 0,
        projectedValue: (i.visualContext || i.VisualContext)?.projectedValue || null,
        format: (i.visualContext || i.VisualContext)?.format || 'Currency'
      } : null
    }));
  }
}