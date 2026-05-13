import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { Transaction } from '../../../../models/transaction.model';
import { MonthGroup } from '../transaction-group.util';

@Component({
  selector: 'app-transaction-list-v2',
  standalone: true,
  imports: [],
  templateUrl: './transaction-list-v2.component.html',
  styleUrl: './transaction-list-v2.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransactionListV2Component {
  @Input() groups: MonthGroup[] = [];
  @Input() loading = false;
  @Output() editClick = new EventEmitter<Transaction>();
  @Output() deleteClick = new EventEmitter<Transaction>();

  protected readonly skeletonRows = [1, 2, 3, 4, 5];
  protected expandedId = signal<string | null>(null);

  protected toggleExpand(id: string): void {
    this.expandedId.set(this.expandedId() === id ? null : id);
  }

  protected onEdit(event: Event, tx: Transaction): void {
    event.stopPropagation();
    this.editClick.emit(tx);
  }

  protected onDelete(event: Event, tx: Transaction): void {
    event.stopPropagation();
    this.deleteClick.emit(tx);
  }

  protected formatValue(n: number): string {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency', currency: 'EUR', minimumFractionDigits: 2,
    }).format(n);
  }

  protected formatShares(n: number): string {
    if (n === 0) return '';
    return n < 1 ? n.toFixed(4) : n % 1 === 0 ? String(Math.round(n)) : n.toFixed(3);
  }

  protected formatDate(d: string): string {
    return new Date(d.substring(0, 10) + 'T12:00:00').toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  }

  protected formatSigned(n: number): string {
    const sign = n >= 0 ? '+' : '';
    return sign + this.formatValue(n);
  }

  protected formatSignedPct(n: number): string {
    const sign = n >= 0 ? '+' : '';
    return sign + Math.abs(n).toFixed(2) + '%';
  }

  protected hasPerfPill(tx: Transaction): boolean {
    return tx.transactionType === 'sell' && tx.realizedPnL != null;
  }

  protected trackByLabel(_: number, g: MonthGroup): string { return g.label; }
  protected trackById(_: number, tx: Transaction): string { return tx.id; }
}
