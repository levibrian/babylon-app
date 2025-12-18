import { Component, ChangeDetectionStrategy, input, output, signal, computed } from '@angular/core';
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
    class: 'block h-full overflow-hidden'
  },
})
export class TransactionListComponent {
  transactions = input.required<Transaction[]>();
  isAdding = input.required<boolean>();
  isLoading = input<boolean>(false);
  error = input<string | null>(null);
  totalInvested = input<number>(0);

  save = output<NewTransactionData>();
  cancel = output<void>();
  update = output<Transaction>();
  delete = output<Transaction>();
  toggleAdd = output<void>();
  navigateToRecurring = output<void>();
  
  editingTransactionId = signal<string | null>(null);
  searchQuery = signal<string>('');
  
  // Filtered transactions based on search query
  filteredTransactions = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const allTransactions = this.transactions();
    
    if (!query) {
      return allTransactions;
    }
    
    return allTransactions.filter(transaction => {
      const ticker = transaction.ticker.toLowerCase();
      const securityName = (transaction.securityName || '').toLowerCase();
      return ticker.includes(query) || securityName.includes(query);
    });
  });
  
  getCompanyName(transaction: Transaction): string {
    // Use securityName from transaction if available, otherwise fall back to ticker
    return transaction.securityName || transaction.ticker;
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