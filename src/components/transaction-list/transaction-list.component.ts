import { Component, ChangeDetectionStrategy, input, output, signal } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
// Fix: Import NewTransactionData from the correct model file.
import { Transaction, NewTransactionData } from '../../models/transaction.model';
import { TransactionEditRowComponent } from '../transaction-edit-row/transaction-edit-row.component';

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
  update = output<Transaction>();
  delete = output<Transaction>();
  
  editingTransactionId = signal<string | null>(null);
  
  getCompanyName(transaction: Transaction): string {
    // Use companyName from transaction if available, otherwise fall back to ticker
    return transaction.companyName || transaction.ticker;
  }

  isEditing(transactionId: string): boolean {
    return this.editingTransactionId() === transactionId;
  }

  startEdit(transaction: Transaction): void {
    this.editingTransactionId.set(transaction.id);
  }

  cancelEdit(): void {
    this.editingTransactionId.set(null);
  }

  handleUpdate(transaction: Transaction): void {
    this.update.emit(transaction);
    this.editingTransactionId.set(null);
  }

  handleDelete(transaction: Transaction): void {
    if (window.confirm(`Are you sure you want to delete the transaction for ${transaction.ticker} on ${new Date(transaction.date).toLocaleDateString()}?`)) {
        this.delete.emit(transaction);
    }
  }

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
    return transaction.amount;
  }

  getValuePrefix(type: Transaction['transactionType']): string {
    if (type === 'buy') return '-';
    if (type === 'sell') return '+';
    return '+'; // Dividends are gains
  }
}