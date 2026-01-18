import { Component, ChangeDetectionStrategy, inject, Signal, signal, effect, computed } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { TransactionListComponent } from '../transaction-list/transaction-list.component';
import { RecurringInvestmentsListComponent } from '../recurring-investments-list/recurring-investments-list.component';
import { PlanningComponent } from '../planning/planning.component';
import { TransactionService } from '../../services/transaction.service';
import { PortfolioService } from '../../services/portfolio.service';
import { Transaction, NewTransactionData } from '../../models/transaction.model';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { TransactionSkeletonComponent } from '../ghosting-elements/transaction-skeleton/transaction-skeleton.component';
import { ErrorStateComponent } from '../common/error-state/error-state.component';
import { UserProfileComponent } from '../user-profile/user-profile.component';

@Component({
  selector: 'app-transactions-page-v2',
  templateUrl: './transactions-page-v2.component.html',
  imports: [
    CommonModule,
    RouterLink,
    TransactionListComponent,
    RecurringInvestmentsListComponent,
    PlanningComponent,
    TransactionSkeletonComponent,
    ErrorStateComponent,
    UserProfileComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransactionsPageV2Component {
  transactionService = inject(TransactionService);
  private portfolioService = inject(PortfolioService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  transactions: Signal<Transaction[]> = this.transactionService.transactions;
  isLoading: Signal<boolean> = this.transactionService.loading;
  error: Signal<string | null> = this.transactionService.error;
  totalInvested: Signal<number> = this.portfolioService.totalInvested;
  portfolio: Signal<any[]> = this.portfolioService.portfolio;
  cashBalance: Signal<number> = this.transactionService.cashBalance;
  
  isAddingTransaction = signal(false);
  activeView = signal<'transactions' | 'recurring' | 'planning'>('transactions');
  private queryParams = toSignal(this.route.queryParams);

  // Search state
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
    
    if (!query) {
      return this.totalInvested(); // Use global total if no filter
    }

    const visibleTickers = new Set(
      this.filteredTransactions().map(t => t.ticker.toUpperCase())
    );

    return this.portfolio()
      .filter(p => visibleTickers.has(p.ticker))
      .reduce((sum, p) => sum + p.totalCost, 0);
  });

  onSearchChange(query: string): void {
    this.searchQuery.set(query);
  }

  constructor() {
    effect(() => {
      if (this.queryParams()?.['add'] === 'true') {
        this.isAddingTransaction.set(true);
      }
    });
  }

  setActiveView(view: 'transactions' | 'recurring' | 'planning'): void {
    this.activeView.set(view);
  }

  toggleAddTransaction(): void {
    this.isAddingTransaction.update(value => !value);
    if (this.isAddingTransaction()) {
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { add: 'true' },
        queryParamsHandling: 'merge',
      });
    } else {
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

  async updateCashBalance(amount: number): Promise<void> {
    await this.transactionService.updateCashBalance(amount);
  }
}

