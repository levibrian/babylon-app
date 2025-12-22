import { Component, ChangeDetectionStrategy, inject, Signal, signal, effect, computed } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { TransactionListComponent } from '../transaction-list/transaction-list.component';
import { RecurringInvestmentsListComponent } from '../recurring-investments-list/recurring-investments-list.component';
import { TransactionsDashboardComponent } from '../transactions-dashboard/transactions-dashboard.component';
import { TransactionService } from '../../services/transaction.service';
import { PortfolioService } from '../../services/portfolio.service';
import { Transaction, NewTransactionData } from '../../models/transaction.model';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { TransactionSkeletonComponent } from '../ghosting-elements/transaction-skeleton/transaction-skeleton.component';
import { ErrorStateComponent } from '../common/error-state/error-state.component';

@Component({
  selector: 'app-transactions-page',
  templateUrl: './transactions-page.component.html',
  imports: [TransactionListComponent, RecurringInvestmentsListComponent, TransactionsDashboardComponent, RouterLink, CommonModule, TransactionSkeletonComponent, ErrorStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransactionsPageComponent {
  transactionService = inject(TransactionService);
  private portfolioService = inject(PortfolioService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  transactions: Signal<Transaction[]> = this.transactionService.transactions;
  isLoading: Signal<boolean> = this.transactionService.loading;
  error: Signal<string | null> = this.transactionService.error;
  // Global total invested (unfiltered)
  private globalTotalInvested: Signal<number> = this.portfolioService.totalInvested;
  portfolio: Signal<any[]> = this.portfolioService.portfolio;
  
  // Search state lifted from child
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

  // Dynamic total invested based on filtered transactions
  filteredTotalInvested = computed(() => {
    const query = this.searchQuery().trim();
    
    // If no search query, return the global total invested
    if (!query) {
      return this.globalTotalInvested();
    }

    // Identify which securities are in the filtered view by unique ticker
    const visibleTickers = new Set(
      this.filteredTransactions().map(t => t.ticker.toUpperCase())
    );

    // Sum the total cost of only those securities from the portfolio
    // We use portfolio items because they contain the accurate total cost basis
    return this.portfolio()
      .filter(p => visibleTickers.has(p.ticker))
      .reduce((sum, p) => sum + p.totalCost, 0);
  });

  // Expose the dynamic total as the 'totalInvested' property for the template to use
  totalInvested = this.filteredTotalInvested;
  
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

  onSearchChange(query: string): void {
    this.searchQuery.set(query);
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