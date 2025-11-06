import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { Transaction } from '../../models/transaction.model';
import { TransactionEditRowComponent } from '../transaction-edit-row/transaction-edit-row.component';
import { NewTransactionData } from '../../services/transaction.service';

@Component({
  selector: 'app-transaction-list',
  templateUrl: './transaction-list.component.html',
  imports: [CommonModule, CurrencyPipe, DatePipe, TransactionEditRowComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransactionListComponent {
  transactions = input.required<Transaction[]>();
  isAdding = input.required<boolean>();

  save = output<NewTransactionData>();
  cancel = output<void>();

  getTransactionTypePillClass(type: Transaction['transactionType']): string {
    switch (type) {
      case 'buy':
        return 'bg-green-100 text-green-800';
      case 'sell':
        return 'bg-red-100 text-red-800';
      case 'dividend':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  getTotalValue(transaction: Transaction): number {
    return transaction.shares * transaction.sharePrice;
  }

  getValuePrefix(type: Transaction['transactionType']): string {
    if (type === 'buy') return '-';
    if (type === 'sell') return '+';
    return '+'; // Dividends are gains
  }
}