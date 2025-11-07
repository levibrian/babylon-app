import { Injectable, signal, Signal } from '@angular/core';
import { PortfolioItem } from '../models/portfolio.model';
import { ApiPortfolioResponse } from '../models/api-response.model';
import { Transaction, NewTransactionData } from '../models/transaction.model';

const API_BASE_URL = 'http://localhost:8000';

const MOCK_PORTFOLIO_DATA: ApiPortfolioResponse = {
  Positions: [
    {
      Ticker: 'AAPL',
      CompanyName: 'Apple Inc.',
      TotalInvested: 4960.00,
      TotalShares: 25,
      AverageSharePrice: 198.40,
      Transactions: [
        { Id: 't1', TransactionType: 'buy', Date: '2023-01-15T00:00:00Z', SharesQuantity: 10, SharePrice: 150.00, Fees: 5.00, Amount: 1500.00, TotalAmount: 1505.00 },
        { Id: 't2', TransactionType: 'buy', Date: '2023-06-20T00:00:00Z', SharesQuantity: 15, SharePrice: 230.00, Fees: 5.00, Amount: 3450.00, TotalAmount: 3455.00 },
        { Id: 't3', TransactionType: 'dividend', Date: '2023-08-15T00:00:00Z', SharesQuantity: 0, SharePrice: 0, Fees: 0, Amount: 50.00, TotalAmount: 50.00 },
      ],
    },
    {
      Ticker: 'GOOGL',
      CompanyName: 'Alphabet Inc.',
      TotalInvested: 2635.00,
      TotalShares: 15,
      AverageSharePrice: 175.67,
      Transactions: [
        { Id: 't4', TransactionType: 'buy', Date: '2023-02-10T00:00:00Z', SharesQuantity: 20, SharePrice: 175.50, Fees: 10.00, Amount: 3510.00, TotalAmount: 3520.00 },
        { Id: 't5', TransactionType: 'sell', Date: '2024-01-05T00:00:00Z', SharesQuantity: 5, SharePrice: 200.00, Fees: 5.00, Amount: 1000.00, TotalAmount: 995.00 },
      ],
    },
     {
        Ticker: 'MSFT',
        CompanyName: 'Microsoft Corporation',
        TotalInvested: 8420.00,
        TotalShares: 20,
        AverageSharePrice: 421.00,
        Transactions: [
            { Id: 't6', TransactionType: 'buy', Date: '2024-03-10T00:00:00Z', SharesQuantity: 20, SharePrice: 420.00, Fees: 20.00, Amount: 8400.00, TotalAmount: 8420.00 }
        ]
    }
  ],
  TotalInvested: 16015.00,
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

      /*
      // REAL API CALL (commented out as requested)
      const response = await fetch(`${API_BASE_URL}/portfolio`);
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const data: ApiPortfolioResponse = await response.json();
      */

      // Mocked API call with realistic data
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay
      const data: ApiPortfolioResponse = MOCK_PORTFOLIO_DATA;

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

  public addTransaction(transactionData: NewTransactionData): void {
    const amount = transactionData.shares * transactionData.sharePrice;
    const newTransaction: Transaction = {
        ...transactionData,
        id: `txn_${new Date().getTime()}`, // mock unique id
        amount,
        ticker: transactionData.ticker.toUpperCase(),
    };

    this._portfolio.update(currentPortfolio => {
        // Use a deep copy to ensure immutability when updating the signal
        const portfolioCopy = JSON.parse(JSON.stringify(currentPortfolio)); 
        let position = portfolioCopy.find(p => p.ticker === newTransaction.ticker);

        if (position) {
            position.transactions.push(newTransaction);
        } else {
            // Create a new position if it doesn't exist
            position = {
                ticker: newTransaction.ticker,
                companyName: `${newTransaction.ticker} (New)`, // Mock company name
                totalShares: 0,
                totalCost: 0,
                averageSharePrice: 0,
                transactions: [newTransaction],
            };
            portfolioCopy.push(position);
        }

        // --- Recalculate position aggregates using average cost basis method ---
        position.transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        const buys = position.transactions.filter(t => t.transactionType === 'buy');
        const totalBuyShares = buys.reduce((sum, t) => sum + t.shares, 0);
        const totalBuyCost = buys.reduce((sum, t) => sum + t.amount + t.fees, 0);
        const averageBuyPrice = totalBuyShares > 0 ? totalBuyCost / totalBuyShares : 0;
        
        let finalShares = 0;
        let finalCost = 0;
        position.transactions.forEach(t => {
            if (t.transactionType === 'buy') {
                finalShares += t.shares;
                finalCost += t.amount + t.fees;
            } else if (t.transactionType === 'sell') {
                finalShares -= t.shares;
                finalCost -= t.shares * averageBuyPrice; // Reduce cost basis
            }
        });

        position.totalShares = finalShares > 0 ? finalShares : 0;
        position.totalCost = finalCost > 0 ? finalCost : 0;
        position.averageSharePrice = position.totalShares > 0 ? position.totalCost / position.totalShares : 0;
        
        // --- Recalculate total portfolio value ---
        const newTotalValue = portfolioCopy.reduce((sum, p) => sum + p.totalCost, 0);
        this._totalPortfolioValue.set(newTotalValue);

        return portfolioCopy;
    });
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
