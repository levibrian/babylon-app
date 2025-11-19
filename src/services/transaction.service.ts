import { Injectable, inject, computed, Signal } from '@angular/core';
import { Transaction, NewTransactionData } from '../models/transaction.model';
import { PortfolioService } from './portfolio.service';

const API_BASE_URL = 'https://localhost:7192';
const USER_ID = 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d';

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

  addTransaction(transactionData: NewTransactionData): void {
     try {
       /*
       // --- REAL API CALL (commented out as requested) ---
       // This is where you would send the new transaction to your backend.
       const response = await fetch(`${API_BASE_URL}/transactions`, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify(transactionData),
       });

       if (!response.ok) {
         throw new Error('Failed to save transaction');
       }
       
       // After a successful save, reload all portfolio data from the backend
       // to ensure the UI is in sync with the database.
       await this.portfolioService.reload();
       */

      // Mocked implementation: directly add to portfolio service state for instant UI feedback.
      this.portfolioService.addTransaction(transactionData);

    } catch (err) {
      console.error('Error adding transaction:', err);
      alert('Could not save transaction. Please try again.');
    }
  }

  updateTransaction(transaction: Transaction): void {
    try {
      this.portfolioService.updateTransaction(transaction);
    } catch (err) {
      console.error('Error updating transaction:', err);
      alert('Could not update transaction. Please try again.');
    }
  }

  deleteTransaction(transactionId: string, ticker: string): void {
    try {
      this.portfolioService.deleteTransaction(transactionId, ticker);
    } catch (err) {
      console.error('Error deleting transaction:', err);
      alert('Could not delete transaction. Please try again.');
    }
  }
}