import { Injectable, signal, Signal } from '@angular/core';
import { PortfolioItem } from '../models/portfolio.model';
import { ApiPortfolioResponse } from '../models/api-response.model';
import { Transaction } from '../models/transaction.model';

const API_BASE_URL = 'http://localhost:8000';

// Mock data to simulate an empty portfolio, allowing the UI's empty state to be displayed.
const MOCK_EMPTY_PORTFOLIO: ApiPortfolioResponse = {
  Positions: [],
  TotalInvested: 0,
};

@Injectable({
  providedIn: 'root',
})
export class PortfolioService {
  private readonly _portfolio = signal<PortfolioItem[]>([]);
  private readonly _totalPortfolioValue = signal(0);
  private readonly _loading = signal(true);
  private readonly _error = signal<string | null>(null);

  public readonly portfolio: Signal<PortfolioItem[]> = this._portfolio.asReadonly();
  public readonly totalPortfolioValue: Signal<number> = this._totalPortfolioValue.asReadonly();
  public readonly loading: Signal<boolean> = this._loading.asReadonly();
  public readonly error: Signal<string | null> = this._error.asReadonly();

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
      // Mocked API call to prevent "Failed to fetch" errors.
      // This simulates a successful response with an empty portfolio.
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay

      const data: ApiPortfolioResponse = MOCK_EMPTY_PORTFOLIO;

      const portfolioItems = this.mapApiDataToPortfolio(data);
      
      this._portfolio.set(portfolioItems);
      this._totalPortfolioValue.set(data.TotalInvested);
    } catch (err) {
      this._error.set('Could not load portfolio. Please ensure the backend server is running and accessible.');
      console.error(err);
    } finally {
      this._loading.set(false);
    }
  }

  private mapApiDataToPortfolio(data: ApiPortfolioResponse): PortfolioItem[] {
    return data.Positions.map(position => ({
      ticker: position.Ticker,
      companyName: position.CompanyName,
      totalCost: position.TotalInvested,
      totalShares: position.TotalShares,
      averageSharePrice: position.AverageSharePrice,
      transactions: position.Transactions.map(t => ({
        id: t.Id,
        ticker: position.Ticker, // Add ticker to each transaction
        date: t.Date,
        transactionType: t.TransactionType,
        shares: t.SharesQuantity,
        sharePrice: t.SharePrice,
        fees: t.Fees,
        amount: t.Amount,
      })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()), // Sort oldest to newest for detail view
    }));
  }
}