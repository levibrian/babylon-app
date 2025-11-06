import { Component, ChangeDetectionStrategy, inject, Signal, signal } from '@angular/core';
import { TransactionListComponent } from '../transaction-list/transaction-list.component';
import { TransactionService, NewTransactionData } from '../../services/transaction.service';
import { Transaction } from '../../models/transaction.model';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-transactions-page',
  templateUrl: './transactions-page.component.html',
  imports: [TransactionListComponent, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransactionsPageComponent {
  private transactionService = inject(TransactionService);
  transactions: Signal<Transaction[]> = this.transactionService.transactions;
  isAddingTransaction = signal(false);

  showNewTransactionRow(): void {
    this.isAddingTransaction.set(true);
  }

  cancelNewTransaction(): void {
    this.isAddingTransaction.set(false);
  }

  saveTransaction(transactionData: NewTransactionData): void {
    this.transactionService.addTransaction(transactionData);
    this.cancelNewTransaction();
  }
}