import {
  ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges,
  Output, Signal, computed, signal,
} from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { Transaction, NewTransactionData } from '../../../../models/transaction.model';

export interface SecurityOption {
  ticker: string;
  name: string;
}

type TxType = 'buy' | 'sell' | 'dividend';

@Component({
  selector: 'app-transaction-drawer',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './transaction-drawer.component.html',
  styleUrl: './transaction-drawer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransactionDrawerComponent implements OnChanges {
  @Input() open = false;

  // Signal-backed so computed() can track changes reactively
  private readonly _transaction = signal<Transaction | null>(null);
  @Input() set transaction(v: Transaction | null) { this._transaction.set(v); }
  get transaction(): Transaction | null { return this._transaction(); }

  @Input() securities: SecurityOption[] = [];
  @Output() save = new EventEmitter<NewTransactionData>();
  @Output() cancel = new EventEmitter<void>();

  protected readonly types: TxType[] = ['buy', 'sell', 'dividend'];
  selectedType = signal<TxType>('buy');

  protected readonly isEditMode = computed(() => this._transaction() !== null);
  protected readonly title = computed(() => this.isEditMode() ? 'Edit transaction' : 'Add transaction');
  protected readonly submitLabel = computed(() => this.isEditMode() ? 'Save changes' : 'Add transaction');

  form: FormGroup;

  // toSignal tracks form value changes so computedTotal reacts via signal graph
  private readonly formValues: Signal<{ ticker: string; date: string; shares: number | null; sharePrice: number | null }>;
  protected readonly computedTotal: Signal<number | null>;

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      ticker:     ['', Validators.required],
      date:       [this.today(), Validators.required],
      shares:     [null as number | null],
      sharePrice: [null as number | null],
    });

    // Must be set up in constructor (injection context) after form is created
    this.formValues = toSignal(this.form.valueChanges, { initialValue: this.form.value });
    this.computedTotal = computed<number | null>(() => {
      const v = this.formValues();
      const s = Number(v?.shares);
      const p = Number(v?.sharePrice);
      return s > 0 && p > 0 ? s * p : null;
    });
  }

  ngOnChanges(): void {
    if (this.open) {
      this.resetForm();
    }
  }

  private resetForm(): void {
    const tx = this._transaction();
    if (tx) {
      this.selectedType.set(tx.transactionType as TxType);
      this.form.setValue({
        ticker:     tx.ticker,
        date:       tx.date,
        shares:     tx.shares || null,
        sharePrice: tx.sharePrice || null,
      }, { emitEvent: false });
    } else {
      this.selectedType.set('buy');
      this.form.setValue({ ticker: '', date: this.today(), shares: null, sharePrice: null },
        { emitEvent: false });
    }
  }

  protected setType(t: TxType): void {
    this.selectedType.set(t);
  }

  protected formatTotal(): string {
    const t = this.computedTotal();
    if (t === null) return '€ —';
    return new Intl.NumberFormat('de-DE', {
      style: 'currency', currency: 'EUR', minimumFractionDigits: 2,
    }).format(t);
  }

  protected onSubmit(): void {
    if (this.form.invalid) return;
    const v = this.form.value;
    const shares = Number(v.shares) || 0;
    const sharePrice = Number(v.sharePrice) || 0;
    const total = shares > 0 && sharePrice > 0 ? shares * sharePrice : 0;

    const data: NewTransactionData = {
      ticker:          v.ticker,
      date:            v.date,
      transactionType: this.selectedType(),
      shares,
      sharePrice,
      fees:            this._transaction()?.fees ?? 0,
      totalAmount:     total,
    };

    this.save.emit(data);
  }

  protected onCancel(): void {
    this.cancel.emit();
  }

  private today(): string {
    return new Date().toISOString().substring(0, 10);
  }
}
