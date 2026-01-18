import { Component, ChangeDetectionStrategy, input, Output, EventEmitter, signal, computed } from '@angular/core';
import { CommonModule, CurrencyPipe, DecimalPipe } from '@angular/common';
// Fix: Import NewTransactionData from the correct model file.
import { Transaction, NewTransactionData } from '../../models/transaction.model';
import { TransactionEditRowComponent } from '../transaction-edit-row/transaction-edit-row.component';
import { formatDateShort } from '../../utils/date-formatter.util';

@Component({
  selector: 'app-transaction-list',
  templateUrl: './transaction-list.component.html',
  imports: [CommonModule, CurrencyPipe, DecimalPipe, TransactionEditRowComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block h-full'
  },
})
export class TransactionListComponent {
  transactions = input.required<Transaction[]>();
  isAdding = input.required<boolean>();
  isLoading = input<boolean>(false);
  error = input<string | null>(null);
  totalInvested = input<number>(0);

  @Output() save = new EventEmitter<NewTransactionData>();
  @Output() cancel = new EventEmitter<void>();
  @Output() update = new EventEmitter<Transaction>();
  @Output() delete = new EventEmitter<Transaction>();
  @Output() toggleAdd = new EventEmitter<void>();
  @Output() navigateToRecurring = new EventEmitter<void>();
  
  // Cash Balance Props
  cashBalance = input.required<number>();
  @Output() updateCash = new EventEmitter<number>();
  
  editingTransactionId = signal<string | null>(null);
  
  // Cash Edit State
  isEditingCash = signal<boolean>(false);
  cashEditValue = signal<number>(0);
  
  startCashEdit(): void {
    this.cashEditValue.set(this.cashBalance());
    this.isEditingCash.set(true);
    // Focus will be handled by template auto-focus or we can do it here if we had a ref
    // For now, template should handle it ideally, but native input autofocus might need helper
    // We'll rely on the directive we saw in earlier chats or just standard autofocus
  }
  
  saveCashEdit(value: string): void {
    const amount = parseFloat(value);
    if (!isNaN(amount) && amount >= 0) {
      this.updateCash.emit(amount);
      this.isEditingCash.set(false);
    }
  }
  
  cancelCashEdit(): void {
    this.isEditingCash.set(false);
  }
  
  onCashInputKeydown(event: KeyboardEvent, value: string): void {
    if (event.key === 'Enter') {
      this.saveCashEdit(value);
    } else if (event.key === 'Escape') {
      this.cancelCashEdit();
    }
  }
  
  // Search query synced with parent
  searchQuery = input<string>('');
  @Output() searchQueryChange = new EventEmitter<string>();
  
  // Expose transactions directly (they are already filtered by parent)
  // We alias it to filteredTransactions for template compatibility if needed, 
  // or better, just use transactions() in template.
  // But wait, if I use transactions(), I need to update the template.
  
  getCompanyName(transaction: Transaction): string {
    // Use securityName from transaction if available, otherwise fall back to ticker
    return transaction.securityName || transaction.ticker;
  }

  onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchQueryChange.emit(value);
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
        return 'bg-purple-100 text-purple-800';
      case 'split':
        return 'bg-teal-100 text-teal-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  getTotalValue(transaction: Transaction): number {
    return transaction.totalAmount;
  }

  getValuePrefix(type: Transaction['transactionType']): string {
    if (type === 'buy') return '-';
    if (type === 'sell') return '+';
    if (type === 'split') return ''; // Splits have no money exchange
    return '+'; // Dividends are gains
  }
  
  // Get split ratio display text
  getSplitRatioDisplay(transaction: Transaction): string {
    if (transaction.transactionType !== 'split') return '';
    const ratio = transaction.shares;
    if (ratio >= 1) {
      // Forward split: e.g., 2.0 -> 2-for-1
      return `${ratio.toFixed(1)}-for-1 split`;
    } else {
      // Reverse split: e.g., 0.5 -> 1-for-2
      return `1-for-${(1 / ratio).toFixed(1)} reverse split`;
    }
  }

  getTransactionTypeLabel(transaction: Transaction): string {
    if (transaction.transactionType === 'sell') {
      return 'Sell Order';
    }
    if (transaction.transactionType === 'dividend') {
      return 'Dividend';
    }
    if (transaction.transactionType === 'split') {
      return 'Stock Split';
    }
    // For buy transactions
    if (transaction.fees === 0) {
      return 'Savings Plan';
    }
    return 'Buy Order';
  }

  getTransactionTypeLabelClass(transaction: Transaction): string {
    if (transaction.transactionType === 'sell') {
      return 'text-gray-500';
    }
    if (transaction.transactionType === 'dividend') {
      return 'text-purple-600';
    }
    if (transaction.transactionType === 'split') {
      return 'text-teal-600';
    }
    // For buy transactions
    if (transaction.fees === 0) {
      return 'text-indigo-600 font-medium';
    }
    return 'text-gray-500';
  }

  formatDate = formatDateShort;
}