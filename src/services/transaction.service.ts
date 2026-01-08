import { Injectable, inject, Signal, signal, effect } from '@angular/core';
import { AuthService } from './auth.service';
import { Transaction, NewTransactionData } from '../models/transaction.model';
import { PortfolioService } from './portfolio.service';
import { ApiTransaction, ApiTransactionsResponse } from '../models/api-response.model';
import { mapApiTransactionsToTransactions, mapToCreateTransactionRequest, mapToBulkTransactionRequest } from '../utils/transaction-mapper.util';
import { toast } from 'ngx-sonner';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';

import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class TransactionService {
  private http = inject(HttpClient);
  private portfolioService = inject(PortfolioService);

  private readonly _transactions = signal<Transaction[]>([]);
  private readonly _loading = signal(true);
  private readonly _error = signal<string | null>(null);

  public readonly transactions: Signal<Transaction[]> = this._transactions.asReadonly();
  public readonly loading: Signal<boolean> = this._loading.asReadonly();
  public readonly error: Signal<string | null> = this._error.asReadonly();

  private authService = inject(AuthService);

  constructor() {
    // Reactive data fetching based on auth state
    effect(() => {
      if (this.authService.isAuthenticated()) {
        this.fetchTransactions();
      } else {
        this.reset();
      }
    });
  }

  /**
   * Clears all transaction state. Called on logout.
   */
  public reset(): void {
    this._transactions.set([]);
    this._loading.set(false);
    this._error.set(null);
  }

  async reload(): Promise<void> {
    this._loading.set(true);
    await this.fetchTransactions();
  }

  async reloadSilent(): Promise<void> {
    await this.fetchTransactionsSilent();
  }

  private async fetchTransactions(): Promise<void> {
    try {
      this._error.set(null);
      this._loading.set(true);
      
      const data = await lastValueFrom(this.http.get<ApiTransaction[]>(`${environment.apiUrl}/api/v1/transactions`));
      const mappedTransactions = mapApiTransactionsToTransactions(data);
      this._transactions.set(mappedTransactions);

    } catch (err) {
      this._error.set('Could not load transactions. Please ensure the backend server is running and accessible.');
      console.error('Error fetching transactions:', err);
    } finally {
      this._loading.set(false);
    }
  }

  private async fetchTransactionsSilent(): Promise<void> {
    try {
      const data = await lastValueFrom(this.http.get<ApiTransaction[]>(`${environment.apiUrl}/api/v1/transactions`));
      const mappedTransactions = mapApiTransactionsToTransactions(data);
      this._transactions.set(mappedTransactions);
    } catch (err) {
      console.error('Error fetching transactions (silent):', err);
    }
  }

  async addTransaction(transactionData: NewTransactionData): Promise<void> {
     try {
      const requestBody = mapToCreateTransactionRequest(transactionData);
      
      await lastValueFrom(this.http.post(`${environment.apiUrl}/api/v1/transactions`, requestBody));
       
      await Promise.all([
        this.reloadSilent(),
        this.portfolioService.reloadSilent()
      ]);

      toast.success('Transaction saved successfully');

    } catch (err) {
      console.error('Error adding transaction:', err);
      toast.error('Could not save transaction. Please try again.');
    }
  }

  async updateTransaction(transaction: Transaction): Promise<void> {
    try {
      const requestBody = mapToCreateTransactionRequest(transaction);
      
      await lastValueFrom(this.http.put(`${environment.apiUrl}/api/v1/transactions/${transaction.id}`, requestBody));
      
      await Promise.all([
        this.reloadSilent(),
        this.portfolioService.reloadSilent()
      ]);

      toast.success('Position updated');

    } catch (err) {
      console.error('Error updating transaction:', err);
      toast.error('Could not update transaction. Please try again.');
    }
  }

  async deleteTransaction(transactionId: string, ticker: string): Promise<void> {
    try {
      await lastValueFrom(this.http.delete(`${environment.apiUrl}/api/v1/transactions/${transactionId}`));
      
      await Promise.all([
        this.reloadSilent(),
        this.portfolioService.reloadSilent()
      ]);

      toast.success('Transaction deleted successfully');

    } catch (err) {
      console.error('Error deleting transaction:', err);
      toast.error('Could not delete transaction. Please try again.');
    }
  }

  async addBulkTransactions(transactions: NewTransactionData[]): Promise<void> {
    try {
      const requestBody = mapToBulkTransactionRequest(transactions);
      
      await lastValueFrom(this.http.post(`${environment.apiUrl}/api/v1/transactions/bulk`, requestBody));
      
      await Promise.all([
        this.reloadSilent(),
        this.portfolioService.reloadSilent()
      ]);

      const count = transactions.length;
      toast.success(`${count} transaction${count > 1 ? 's' : ''} saved successfully`);

    } catch (err) {
      console.error('Error adding bulk transactions:', err);
      toast.error('Could not save transactions. Please try again.');
      throw err;
    }
  }

  async addBulkTransactionsSilent(transactions: NewTransactionData[]): Promise<void> {
    try {
      const requestBody = mapToBulkTransactionRequest(transactions);
      
      await lastValueFrom(this.http.post(`${environment.apiUrl}/api/v1/transactions/bulk`, requestBody));
      
      await Promise.all([
        this.reloadSilent(),
        this.portfolioService.reloadSilent()
      ]);

    } catch (err) {
      console.error('Error adding bulk transactions:', err);
      throw err;
    }
  }
}