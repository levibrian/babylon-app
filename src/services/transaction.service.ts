import { Injectable, signal, Signal } from '@angular/core';
import { Transaction } from '../models/transaction.model';

export type NewTransactionData = Omit<Transaction, 'id' | 'notes'>;

@Injectable({
  providedIn: 'root',
})
export class TransactionService {
  private readonly _transactions = signal<Transaction[]>([]);

  public readonly transactions: Signal<Transaction[]> = this._transactions.asReadonly();

  constructor() {
    this.loadMockTransactions();
  }

  addTransaction(transactionData: NewTransactionData): void {
    const newTransaction: Transaction = {
      ...transactionData,
      id: new Date().getTime().toString() + Math.random().toString(), // Unique ID
    };

    this._transactions.update(currentTransactions => {
      const updatedTransactions = [...currentTransactions, newTransaction];
      // Re-sort after adding
      return updatedTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    });
  }

  private loadMockTransactions(): void {
    const mockData: Transaction[] = [
      {
        id: '1',
        date: '2024-07-22T10:00:00Z',
        ticker: 'GOOGL',
        transactionType: 'buy',
        shares: 10,
        sharePrice: 180.50,
        fees: 5.00,
        notes: 'Strategic investment in AI'
      },
      {
        id: '2',
        date: '2024-07-20T14:30:00Z',
        ticker: 'AAPL',
        transactionType: 'sell',
        shares: 25,
        sharePrice: 215.20,
        fees: 7.50,
        notes: 'Profit taking'
      },
      {
        id: '3',
        date: '2024-07-15T09:00:00Z',
        ticker: 'MSFT',
        transactionType: 'dividend',
        shares: 100,
        sharePrice: 0.75, // Dividend per share
        fees: 0,
        notes: 'Quarterly dividend payment'
      },
       {
        id: '4',
        date: '2024-06-28T11:45:00Z',
        ticker: 'TSLA',
        transactionType: 'buy',
        shares: 15,
        sharePrice: 183.01,
        fees: 5.00
      },
      {
        id: '5',
        date: '2024-06-10T16:00:00Z',
        ticker: 'NVDA',
        transactionType: 'sell',
        shares: 5,
        sharePrice: 120.89,
        fees: 2.50
      },
       {
        id: '6',
        date: '2023-12-15T09:00:00Z',
        ticker: 'MSFT',
        transactionType: 'dividend',
        shares: 100,
        sharePrice: 0.68, // Dividend per share
        fees: 0,
        notes: 'Quarterly dividend payment'
      },
    ];

    const sortedData = mockData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    this._transactions.set(sortedData);
  }
}
