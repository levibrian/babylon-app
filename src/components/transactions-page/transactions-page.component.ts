import { Component, ChangeDetectionStrategy, inject, Signal, signal, effect } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { TransactionListComponent } from '../transaction-list/transaction-list.component';
import { RecurringInvestmentsListComponent } from '../recurring-investments-list/recurring-investments-list.component';
import { TransactionService } from '../../services/transaction.service';
import { PortfolioService } from '../../services/portfolio.service';
import { Transaction, NewTransactionData } from '../../models/transaction.model';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { TransactionSkeletonComponent } from '../ghosting-elements/transaction-skeleton/transaction-skeleton.component';

@Component({
  selector: 'app-transactions-page',
  templateUrl: './transactions-page.component.html',
  imports: [TransactionListComponent, RecurringInvestmentsListComponent, RouterLink, CommonModule, TransactionSkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransactionsPageComponent {
  private transactionService = inject(TransactionService);
  private portfolioService = inject(PortfolioService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  transactions: Signal<Transaction[]> = this.transactionService.transactions;
  isLoading: Signal<boolean> = this.transactionService.loading;
  error: Signal<string | null> = this.transactionService.error;
  totalInvested: Signal<number> = this.portfolioService.totalInvested;
  
  isAddingTransaction = signal(false);
  activeView = signal<'transactions' | 'recurring'>('transactions');
  private queryParams = toSignal(this.route.queryParams);

  constructor() {
    effect(() => {
      if (this.queryParams()?.['add'] === 'true') {
        this.isAddingTransaction.set(true);
      }
    });
  }

  toggleAddTransaction(): void {
    this.isAddingTransaction.update(value => !value);
    if (this.isAddingTransaction()) {
      // Set query param when showing
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { add: 'true' },
        queryParamsHandling: 'merge',
      });
    } else {
      // Clear query param when hiding
      this.clearAddQueryParam();
    }
  }

  cancelNewTransaction(): void {
    this.isAddingTransaction.set(false);
    this.clearAddQueryParam();
  }

  async saveTransaction(transactionData: NewTransactionData): Promise<void> {
    await this.transactionService.addTransaction(transactionData);
    this.isAddingTransaction.set(false);
    this.clearAddQueryParam();
  }

  async updateTransaction(transaction: Transaction): Promise<void> {
    await this.transactionService.updateTransaction(transaction);
  }

  async deleteTransaction(transaction: Transaction): Promise<void> {
    await this.transactionService.deleteTransaction(transaction.id, transaction.ticker);
  }

  private clearAddQueryParam(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { add: null },
      queryParamsHandling: 'merge',
    });
  }

  navigateToRecurring(): void {
    this.activeView.set('recurring');
  }

  navigateToTransactions(): void {
    this.activeView.set('transactions');
  }
}