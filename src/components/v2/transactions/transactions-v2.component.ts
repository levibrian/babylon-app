import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { TransactionService } from '../../../services/transaction.service';
import { PortfolioService } from '../../../services/portfolio.service';
import { Transaction, NewTransactionData } from '../../../models/transaction.model';
import { TransactionListV2Component } from './transaction-list-v2/transaction-list-v2.component';
import { TransactionDrawerComponent, SecurityOption } from './transaction-drawer/transaction-drawer.component';
import { groupByMonth, MonthGroup } from './transaction-group.util';

type TypeFilter = 'all' | 'buy' | 'sell' | 'dividend';

@Component({
  selector: 'app-transactions-v2',
  standalone: true,
  imports: [TransactionListV2Component, TransactionDrawerComponent],
  templateUrl: './transactions-v2.component.html',
  styleUrl: './transactions-v2.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransactionsV2Component {
  private txService = inject(TransactionService);
  private portfolioService = inject(PortfolioService);

  readonly searchQuery = signal<string>('');
  readonly typeFilter  = signal<TypeFilter>('all');
  readonly drawerOpen  = signal(false);
  readonly drawerTx    = signal<Transaction | null>(null);

  protected readonly loading = this.txService.loading;
  protected readonly error   = this.txService.error;
  protected readonly cashBalance = this.txService.cashBalance;

  readonly filteredTransactions = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const type = this.typeFilter();
    return this.txService.transactions().filter(tx => {
      const typeOk = type === 'all' || tx.transactionType === type;
      const searchOk = !q
        || tx.ticker.toLowerCase().includes(q)
        || (tx.securityName ?? '').toLowerCase().includes(q);
      return typeOk && searchOk;
    });
  });

  readonly groupedTransactions = computed<MonthGroup[]>(() =>
    groupByMonth(this.filteredTransactions())
  );

  readonly statsInvested = computed(() =>
    this.filteredTransactions()
      .filter(t => t.transactionType === 'buy')
      .reduce((sum, t) => sum + t.totalAmount, 0)
  );

  readonly statsClosed = computed<number | null>(() => {
    const sells = this.filteredTransactions().filter(
      t => t.transactionType === 'sell' && t.realizedPnL != null
    );
    if (!sells.length) return null;
    return sells.reduce((sum, t) => sum + (t.realizedPnL ?? 0), 0);
  });

  protected readonly securities = computed<SecurityOption[]>(() =>
    this.portfolioService.portfolio().map(p => ({
      ticker: p.ticker,
      name:   (p as any).companyName ?? p.ticker,
    }))
  );

  protected readonly txCount = computed(() => this.filteredTransactions().length);

  protected readonly types: TypeFilter[] = ['all', 'buy', 'sell', 'dividend'];
  protected readonly typeLabels: Record<TypeFilter, string> = {
    all: 'All', buy: 'Buy', sell: 'Sell', dividend: 'Div',
  };

  openDrawer(tx?: Transaction): void {
    this.drawerTx.set(tx ?? null);
    this.drawerOpen.set(true);
  }

  closeDrawer(): void {
    this.drawerOpen.set(false);
  }

  async saveTransaction(data: NewTransactionData): Promise<void> {
    const existing = this.drawerTx();
    if (existing) {
      await this.txService.updateTransaction({ ...existing, ...data });
    } else {
      await this.txService.addTransaction(data);
    }
    this.drawerOpen.set(false);
  }

  async deleteTransaction(tx: Transaction): Promise<void> {
    await this.txService.deleteTransaction(tx.id, tx.ticker);
  }

  protected formatValue(n: number): string {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency', currency: 'EUR', minimumFractionDigits: 2,
    }).format(n);
  }

  protected formatSigned(n: number): string {
    const sign = n >= 0 ? '+' : '';
    return sign + this.formatValue(n);
  }

  protected formatSignedPct(n: number): string {
    const sign = n >= 0 ? '+' : '';
    return sign + Math.abs(n).toFixed(2) + '%';
  }
}
