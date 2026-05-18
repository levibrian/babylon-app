import {
  ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges,
  Output, Signal, computed, signal,
} from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { DatePipe, TitleCasePipe } from '@angular/common';
import { Transaction, NewTransactionData } from '../../../../models/transaction.model';

export interface SecurityOption {
  ticker: string;
  name: string;
}

type TxType = 'buy' | 'sell' | 'dividend';
type DrawerMode = 'form' | 'detail';

@Component({
  selector: 'app-transaction-drawer',
  standalone: true,
  imports: [ReactiveFormsModule, DatePipe, TitleCasePipe],
  templateUrl: './transaction-drawer.component.html',
  styleUrl: './transaction-drawer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransactionDrawerComponent implements OnChanges {
  @Input() open = false;
  @Input() pending = false;

  private readonly _mode = signal<DrawerMode>('form');
  @Input() set mode(v: DrawerMode) { this._mode.set(v); }
  get mode(): DrawerMode { return this._mode(); }

  private readonly _transaction = signal<Transaction | null>(null);
  @Input() set transaction(v: Transaction | null) { this._transaction.set(v); }
  get transaction(): Transaction | null { return this._transaction(); }

  @Input() securities: SecurityOption[] = [];

  @Output() save = new EventEmitter<NewTransactionData>();
  @Output() cancel = new EventEmitter<void>();
  @Output() editClicked = new EventEmitter<Transaction>();
  @Output() deleteClicked = new EventEmitter<Transaction>();

  protected readonly types: TxType[] = ['buy', 'sell', 'dividend'];
  selectedType = signal<TxType>('buy');

  protected readonly isFormMode = computed(() => this._mode() === 'form');
  protected readonly isDetailMode = computed(() => this._mode() === 'detail');
  protected readonly isEditMode = computed(() => this._transaction() !== null && this._mode() === 'form');
  protected readonly title = computed(() => {
    if (this._mode() === 'detail') {
      const tx = this._transaction();
      return tx ? `${this.capitalize(tx.transactionType)} · ${tx.ticker}` : 'Transaction';
    }
    return this.isEditMode() ? 'Edit transaction' : 'Add transaction';
  });
  protected readonly submitLabel = computed(() => this.isEditMode() ? 'Save changes' : 'Add transaction');
  protected readonly isDividendDetail = computed(() =>
    this._mode() === 'detail' && this._transaction()?.transactionType === 'dividend'
  );

  form: FormGroup;

  private readonly formValues: Signal<{
    ticker: string; date: string;
    shares: number | null; sharePrice: number | null;
    divShares: number | null; divNet: number | null; divTax: number | null;
  }>;
  protected readonly computedTotal: Signal<number | null>;
  readonly divPerShare: Signal<number | null>;

  // Detail view computed values
  protected readonly detailPerShare = computed<number | null>(() => {
    const tx = this._transaction();
    if (!tx || tx.transactionType !== 'dividend') return null;
    const shares = tx.shares;
    const net = tx.totalAmount;
    const tax = tx.tax ?? 0;
    return shares > 0 && net > 0 ? (net + tax) / shares : null;
  });

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      ticker:     ['', Validators.required],
      date:       [this.today(), Validators.required],
      shares:     [null as number | null],
      sharePrice: [null as number | null],
      divShares:  [null as number | null],
      divNet:     [null as number | null],
      divTax:     [null as number | null],
    });

    this.formValues = toSignal(this.form.valueChanges, { initialValue: this.form.value });

    this.computedTotal = computed<number | null>(() => {
      const v = this.formValues();
      const s = Number(v?.shares);
      const p = Number(v?.sharePrice);
      return s > 0 && p > 0 ? s * p : null;
    });

    this.divPerShare = computed<number | null>(() => {
      const v = this.formValues();
      const shares = Number(v?.divShares);
      const net = Number(v?.divNet);
      const tax = Number(v?.divTax) || 0;
      return shares > 0 && net > 0 ? (net + tax) / shares : null;
    });
  }

  ngOnChanges(): void {
    if (this.open && this._mode() === 'form') {
      this.resetForm();
    }
  }

  private resetForm(): void {
    const tx = this._transaction();
    if (tx) {
      this.selectedType.set(tx.transactionType as TxType);
      if (tx.transactionType === 'dividend') {
        this.form.setValue({
          ticker: tx.ticker, date: tx.date,
          shares: null, sharePrice: null,
          divShares: tx.shares || null,
          divNet: tx.totalAmount || null,
          divTax: tx.tax ?? null,
        }, { emitEvent: false });
      } else {
        this.form.setValue({
          ticker: tx.ticker, date: tx.date,
          shares: tx.shares || null, sharePrice: tx.sharePrice || null,
          divShares: null, divNet: null, divTax: null,
        }, { emitEvent: false });
      }
    } else {
      this.selectedType.set('buy');
      this.form.setValue({
        ticker: '', date: this.today(),
        shares: null, sharePrice: null,
        divShares: null, divNet: null, divTax: null,
      }, { emitEvent: false });
    }
  }

  protected setType(t: TxType): void {
    this.selectedType.set(t);
  }

  protected formatTotal(): string {
    const t = this.computedTotal();
    if (t === null) return '€ —';
    return this.formatCurrency(t);
  }

  protected formatDivPerShare(): string {
    const v = this.divPerShare();
    if (v === null) return '€ —';
    return this.formatCurrency(v);
  }

  protected formatCurrency(n: number): string {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency', currency: 'EUR', minimumFractionDigits: 2,
    }).format(n);
  }

  protected onSubmit(): void {
    if (this.form.invalid) return;
    const v = this.form.value;

    let data: NewTransactionData;
    if (this.selectedType() === 'dividend') {
      const divShares = Number(v.divShares) || 0;
      const divNet = Number(v.divNet) || 0;
      const divTax = Number(v.divTax) || 0;
      data = {
        ticker: v.ticker, date: v.date,
        transactionType: 'dividend',
        shares: divShares, sharePrice: 0, fees: 0,
        totalAmount: divNet, tax: divTax,
      };
    } else {
      const shares = Number(v.shares) || 0;
      const sharePrice = Number(v.sharePrice) || 0;
      data = {
        ticker: v.ticker, date: v.date,
        transactionType: this.selectedType(),
        shares, sharePrice, fees: this._transaction()?.fees ?? 0,
        totalAmount: shares > 0 && sharePrice > 0 ? shares * sharePrice : 0,
      };
    }

    this.save.emit(data);
  }

  protected onCancel(): void {
    this.cancel.emit();
  }

  protected onEditClick(): void {
    const tx = this._transaction();
    if (tx) this.editClicked.emit(tx);
  }

  protected onDeleteClick(): void {
    const tx = this._transaction();
    if (tx) this.deleteClicked.emit(tx);
  }

  private capitalize(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  private today(): string {
    return new Date().toISOString().substring(0, 10);
  }
}
