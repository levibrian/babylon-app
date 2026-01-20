import { Component, ChangeDetectionStrategy, input, output, signal } from '@angular/core';
import { CommonModule, CurrencyPipe, DecimalPipe } from '@angular/common';
import { PortfolioItem } from '../../models/portfolio.model';
import { Transaction } from '../../models/transaction.model';
import { formatDateShort } from '../../utils/date-formatter.util';

@Component({
  selector: 'app-portfolio-list',
  templateUrl: './portfolio-list.component.html',
  imports: [CommonModule, CurrencyPipe, DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block h-full overflow-hidden'
  },
})
export class PortfolioListComponent {
  portfolio = input.required<PortfolioItem[]>();
  cashBalance = input.required<number>();
  totalValue = input.required<number>();
  
  private expandedTickers = signal(new Set<string>());
  editingTransactionId = signal<string | null>(null);

  update = output<Transaction>();
  delete = output<Transaction>();
  assetClick = output<string>(); // Emit ticker when asset is clicked

  isExpanded(ticker: string): boolean {
    return this.expandedTickers().has(ticker);
  }

  get expandCollapseButtonText(): string {
    const expandedCount = this.expandedTickers().size;
    // If any element is expanded -> Collapse All
    // If all elements are collapsed (0 expanded) -> Expand All
    return expandedCount > 0 ? 'Collapse All' : 'Expand All';
  }

  toggleAll(): void {
    const portfolio = this.portfolio();
    const currentExpanded = this.expandedTickers();
    
    // If any item is expanded, we collapse all (clear the set)
    if (currentExpanded.size > 0) {
      this.expandedTickers.set(new Set<string>());
    } else {
      // If no items are expanded, we expand all (add all tickers)
      const allTickers = new Set(portfolio.map(p => p.ticker));
      this.expandedTickers.set(allTickers);
    }
  }

  toggleExpand(ticker: string): void {
    this.expandedTickers.update(tickers => {
      // Do not toggle expand when clicking edit/delete on a child
      if (this.editingTransactionId()) return tickers;

      const newTickers = new Set(tickers);
      if (newTickers.has(ticker)) {
        newTickers.delete(ticker);
      } else {
        newTickers.add(ticker);
        // Emit asset click when expanding
        this.assetClick.emit(ticker);
      }
      return newTickers;
    });
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
    return transaction.totalAmount;
  }

  getValuePrefix(type: Transaction['transactionType']): string {
    if (type === 'buy') return '-';
    if (type === 'sell') return '+';
    return '+'; // Dividends are gains
  }

  getRebalancingMessage(item: PortfolioItem): string {
    const absDeviation = Math.abs(item.allocationDifference);
    const absAmount = item.rebalanceAmount !== null ? Math.abs(item.rebalanceAmount) : 0;
    
    switch (item.rebalancingStatus) {
      case 'Overweight':
        return absAmount > 0 ? `${absDeviation.toFixed(1)}% Sell ~€${absAmount.toFixed(0)}` : `${absDeviation.toFixed(1)}% Overweight`;
      case 'Underweight':
        return absAmount > 0 ? `${absDeviation.toFixed(1)}% Buy ~€${absAmount.toFixed(0)}` : `${absDeviation.toFixed(1)}% Underweight`;
      case 'Balanced':
      default:
        return 'Balanced';
    }
  }

  getRebalancingStatusClass(item: PortfolioItem): string {
    switch (item.rebalancingStatus) {
      case 'Overweight':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'Underweight':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Balanced':
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  }

  getRebalancingStatusText(item: PortfolioItem): string {
    return item.rebalancingStatus;
  }

  getCurrentAllocationColorClass(item: PortfolioItem): string {
    switch (item.rebalancingStatus) {
      case 'Overweight':
        return 'text-red-600';
      case 'Underweight':
        return 'text-green-600';
      case 'Balanced':
      default:
        return 'text-gray-900';
    }
  }

  getRebalanceActionText(item: PortfolioItem): string {
    if (item.rebalanceAmount === null) {
      return '';
    }
    const absAmount = Math.abs(item.rebalanceAmount);
    switch (item.rebalancingStatus) {
      case 'Overweight':
        return `Sell €${absAmount.toFixed(0)}`;
      case 'Underweight':
        return `Buy €${absAmount.toFixed(0)}`;
      case 'Balanced':
      default:
        return '';
    }
  }

  getRebalancingStatusWithAction(item: PortfolioItem): string {
    const status = this.getRebalancingStatusText(item);
    const action = this.getRebalanceActionText(item);
    return action ? `${action}` : status;
  }

  getPortfolioAvatarClass(item: PortfolioItem): string {
    // Light background for terminal chic style
    return 'bg-gray-100';
  }

  getAvatarColor(ticker: string): string {
    // Hash the ticker to pick a consistent color
    const colors = [
      'text-emerald-600',
      'text-blue-600',
      'text-amber-600',
      'text-purple-600',
      'text-rose-600',
      'text-indigo-600',
      'text-cyan-600',
      'text-orange-600',
      'text-pink-600',
      'text-teal-600',
    ];
    
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < ticker.length; i++) {
      hash = ticker.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    return colors[Math.abs(hash) % colors.length];
  }

  formatDate = formatDateShort;

  abs(value: number): number {
    return Math.abs(value);
  }
}