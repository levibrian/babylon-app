import { Injectable, inject, Signal, signal } from '@angular/core';
import { Transaction, NewTransactionData } from '../models/transaction.model';
import { PortfolioService } from './portfolio.service';
import { ApiTransaction, ApiTransactionsResponse } from '../models/api-response.model';
import { mapApiTransactionsToTransactions, mapToCreateTransactionRequest } from '../utils/transaction-mapper.util';
import { toast } from 'ngx-sonner';

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

      const data: ApiTransaction[] = await response.json();
      console.log(data);
      const mappedTransactions = mapApiTransactionsToTransactions(data);
      this._transactions.set(mappedTransactions);

    } catch (err) {
      this._error.set('Could not load transactions. Please ensure the backend server is running and accessible.');
      console.error('Error fetching transactions:', err);
    } finally {
      this._loading.set(false);
    }
  }


  async addTransaction(transactionData: NewTransactionData): Promise<void> {
     try {
      // Map frontend format to backend API format
      const requestBody = mapToCreateTransactionRequest(transactionData, USER_ID);
      
      // Real API call to add transaction - userId is in the request body, not the URL
      const response = await fetch(`${API_BASE_URL}/api/v1/transactions`, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify(requestBody),
       });

       if (!response.ok) {
         const errorText = await response.text();
         console.error('API Error:', response.status, errorText);
         throw new Error(`Failed to save transaction: ${response.status} ${response.statusText}`);
       }
       
      // After a successful save, reload transactions and portfolio data
      await Promise.all([
        this.reload(),
        this.portfolioService.reload()
      ]);

      // Show success toast
      toast.success('Transaction saved successfully');

    } catch (err) {
      console.error('Error adding transaction:', err);
      toast.error('Could not save transaction. Please try again.');
    }
  }

  async updateTransaction(transaction: Transaction): Promise<void> {
    try {
      // Map transaction to backend format (same as create request)
      // The mapper accepts NewTransactionData, but Transaction extends it, so this works
      const requestBody = mapToCreateTransactionRequest(transaction, USER_ID);
      
      // Real API call to update transaction
      const response = await fetch(`${API_BASE_URL}/api/v1/transactions/${USER_ID}/${transaction.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error('Failed to update transaction');
      }
      
      // After a successful update, reload transactions and portfolio data
      await Promise.all([
        this.reload(),
        this.portfolioService.reload()
      ]);

      // Show success toast
      toast.success('Position updated');

    } catch (err) {
      console.error('Error updating transaction:', err);
      toast.error('Could not update transaction. Please try again.');
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

      // Show success toast
      toast.success('Transaction deleted successfully');

    } catch (err) {
      console.error('Error deleting transaction:', err);
      toast.error('Could not delete transaction. Please try again.');
    }
  }
}