import { Component, ChangeDetectionStrategy, inject, Signal, signal, effect } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TransactionListComponent } from '../transaction-list/transaction-list.component';
import { TransactionService } from '../../services/transaction.service';
import { Transaction, NewTransactionData } from '../../models/transaction.model';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-transactions-page',
  templateUrl: './transactions-page.component.html',
  imports: [TransactionListComponent, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransactionsPageComponent {
  private transactionService = inject(TransactionService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  transactions: Signal<Transaction[]> = this.transactionService.transactions;
  isLoading: Signal<boolean> = this.transactionService.loading;
  error: Signal<string | null> = this.transactionService.error;
  
  isAddingTransaction = signal(false);
  private queryParams = toSignal(this.route.queryParams);

  constructor() {
    effect(() => {
      if (this.queryParams()?.['add'] === 'true') {
        this.isAddingTransaction.set(true);
      }
    });
  }

  cancelNewTransaction(): void {
    this.isAddingTransaction.set(false);
    this.clearAddQueryParam();
  }

  saveTransaction(transactionData: NewTransactionData): void {
    this.transactionService.addTransaction(transactionData);
    this.isAddingTransaction.set(false);
    this.clearAddQueryParam();
  }

  updateTransaction(transaction: Transaction): void {
    this.transactionService.updateTransaction(transaction);
  }

  deleteTransaction(transaction: Transaction): void {
    this.transactionService.deleteTransaction(transaction.id, transaction.ticker);
  }

  private clearAddQueryParam(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { add: null },
      queryParamsHandling: 'merge',
    });
  }
}