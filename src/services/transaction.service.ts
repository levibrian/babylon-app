import { Injectable, inject, Signal, signal } from '@angular/core';
import { Transaction, NewTransactionData } from '../models/transaction.model';
import { PortfolioService } from './portfolio.service';
import { ApiTransactionsResponse, ApiTransaction } from '../models/api-response.model';

const API_BASE_URL = 'https://localhost:7192';
const USER_ID = 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d';

@Injectable({
  providedIn: 'root',
})
export class TransactionService {
  private portfolioService = inject(PortfolioService);

  private readonly _transactions = signal<Transaction[]>([]);
  private readonly _loading = signal(true);
  private readonly _error = signal<string | null>(null);

  public readonly transactions: Signal<Transaction[]> = this._transactions.asReadonly();
  public readonly loading: Signal<boolean> = this._loading.asReadonly();
  public readonly error: Signal<string | null> = this._error.asReadonly();

  constructor() {
    this.fetchTransactions();
  }

  async reload(): Promise<void> {
    this._loading.set(true);
    await this.fetchTransactions();
  }

  private async fetchTransactions(): Promise<void> {
    try {
      this._error.set(null);
      this._loading.set(true);
      
      // Fetch transactions from the dedicated endpoint
      const response = await fetch(`${API_BASE_URL}/api/v1/transactions/${USER_ID}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch transactions: ${response.status} ${response.statusText}`);
      }

      const data: ApiTransactionsResponse = await response.json();
      const mappedTransactions = this.mapApiTransactionsToTransactions(data.transactions);
      this._transactions.set(mappedTransactions);

    } catch (err) {
      this._error.set('Could not load transactions. Please ensure the backend server is running and accessible.');
      console.error('Error fetching transactions:', err);
    } finally {
      this._loading.set(false);
    }
  }

  private mapApiTransactionsToTransactions(apiTransactions: ApiTransaction[]): Transaction[] {
    return apiTransactions.map(t => {
      // Convert Unix timestamp to ISO string
      const date = new Date(t.date * 1000).toISOString();
      // Convert transaction type from "Buy"/"Sell" to lowercase "buy"/"sell"
      const transactionType = t.transactionType.toLowerCase() as 'buy' | 'sell' | 'dividend';
      // Calculate amount from sharesQuantity and sharePrice (or use totalAmount if available)
      const amount = t.sharesQuantity * t.sharePrice;
      
      return {
        id: t.id,
        ticker: t.ticker || '', // Ticker should be included in the API response
        date: date,
        transactionType: transactionType,
        shares: t.sharesQuantity,
        sharePrice: t.sharePrice,
        fees: t.fees,
        amount: amount,
        companyName: t.securityName, // Company name from transaction
      };
    });
  }

  async addTransaction(transactionData: NewTransactionData): Promise<void> {
    try {
      // Real API call to add transaction
      const response = await fetch(`${API_BASE_URL}/api/v1/transactions/${USER_ID}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transactionData),
      });

      if (!response.ok) {
        throw new Error('Failed to save transaction');
      }
      
      // After a successful save, reload transactions and portfolio data
      await Promise.all([
        this.reload(),
        this.portfolioService.reload()
      ]);

    } catch (err) {
      console.error('Error adding transaction:', err);
      alert('Could not save transaction. Please try again.');
    }
  }

  async updateTransaction(transaction: Transaction): Promise<void> {
    try {
      // Real API call to update transaction
      const response = await fetch(`${API_BASE_URL}/api/v1/transactions/${USER_ID}/${transaction.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transaction),
      });

      if (!response.ok) {
        throw new Error('Failed to update transaction');
      }
      
      // After a successful update, reload transactions and portfolio data
      await Promise.all([
        this.reload(),
        this.portfolioService.reload()
      ]);

    } catch (err) {
      console.error('Error updating transaction:', err);
      alert('Could not update transaction. Please try again.');
    }
  }

  async deleteTransaction(transactionId: string, ticker: string): Promise<void> {
    try {
      // Real API call to delete transaction
      const response = await fetch(`${API_BASE_URL}/api/v1/transactions/${USER_ID}/${transactionId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete transaction');
      }
      
      // After a successful delete, reload transactions and portfolio data
      await Promise.all([
        this.reload(),
        this.portfolioService.reload()
      ]);

    } catch (err) {
      console.error('Error deleting transaction:', err);
      alert('Could not delete transaction. Please try again.');
    }
  }
}