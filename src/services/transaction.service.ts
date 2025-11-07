import { Injectable, signal, Signal, inject, computed } from '@angular/core';
import { Transaction } from '../models/transaction.model';
import { PortfolioService } from './portfolio.service';

export type NewTransactionData = Omit<Transaction, 'id' | 'ticker' | 'amount'>;
const API_BASE_URL = 'http://localhost:8000';

@Injectable({
  providedIn: 'root',
})
export class TransactionService {
  private portfolioService = inject(PortfolioService);

  public readonly transactions: Signal<Transaction[]> = computed(() => {
    const portfolio = this.portfolioService.portfolio();
    const allTransactions = portfolio.flatMap(p => p.transactions);
    return allTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  });

  public readonly loading = this.portfolioService.loading;
  public readonly error = this.portfolioService.error;

  async addTransaction(transactionData: NewTransactionData): Promise<void> {
     try {
      // Mocked API call to prevent "Failed to fetch" errors.
      console.log('Simulating adding transaction:', transactionData);
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay

      // In a real app, the POST response would contain the new data.
      // Here, we just reload the mocked (and currently static) portfolio data.
      await this.portfolioService.reload();

    } catch (err) {
      console.error('Error adding transaction:', err);
      // Optionally, expose this error to the UI
      alert('Could not save transaction. Please try again.');
    }
  }
}