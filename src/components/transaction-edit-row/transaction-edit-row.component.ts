import { Component, ChangeDetectionStrategy, output, OnInit, OnDestroy, signal, input, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
// Fix: Import NewTransactionData from the correct model file.
import { Transaction, NewTransactionData } from '../../models/transaction.model';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-transaction-edit-row',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './transaction-edit-row.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransactionEditRowComponent implements OnInit, OnDestroy {
  cancel = output<void>();
  save = output<NewTransactionData | Transaction>();
  initialState = input<Transaction | undefined>();

  transactionForm: FormGroup;
  
  totalAmount = signal(0);
  private formChangesSubscription!: Subscription;

  constructor(private fb: FormBuilder) {
    const today = new Date().toISOString().substring(0, 10); // Format YYYY-MM-DD

    this.transactionForm = fb.group({
      ticker: ['', [Validators.required, Validators.maxLength(10)]],
      date: [today, Validators.required],
      transactionType: ['buy', Validators.required],
      shares: [null, [Validators.required, Validators.min(0.000001)]],
      sharePrice: [null, [Validators.required, Validators.min(0.01)]],
      fees: [0, [Validators.required, Validators.min(0)]],
    });

    effect(() => {
        const state = this.initialState();
        if (state) {
            this.transactionForm.patchValue({
                ...state,
                date: new Date(state.date).toISOString().substring(0, 10),
            });
        } else {
            this.transactionForm.reset({
                date: today,
                transactionType: 'buy',
                fees: 0,
                ticker: '',
                shares: null,
                sharePrice: null
            });
        }
    });
  }

  ngOnInit(): void {
    this.formChangesSubscription = this.transactionForm.valueChanges.subscribe(values => {
      const shares = Number(values.shares) || 0;
      const sharePrice = Number(values.sharePrice) || 0;
      const fees = Number(values.fees) || 0;
      
      const currentAmount = shares * sharePrice;
      this.totalAmount.set(currentAmount + fees);
    });
  }

  ngOnDestroy(): void {
    this.formChangesSubscription.unsubscribe();
  }

  setTransactionType(type: 'buy' | 'sell'): void {
    this.transactionForm.get('transactionType')?.setValue(type);
  }

  onSubmit(): void {
    if (this.transactionForm.invalid) {
      this.transactionForm.markAllAsTouched();
      return;
    }
    
    const formValue = this.transactionForm.value;
    const initialTx = this.initialState();

    if (initialTx) {
      // It's an edit, include the ID. The service will recalc amount.
      const updatedTransaction: Transaction = {
        ...initialTx,
        ...formValue,
      };
      this.save.emit(updatedTransaction);
    } else {
      // It's a new transaction
      this.save.emit(formValue as NewTransactionData);
    }
  }

  onCancel(): void {
    this.cancel.emit();
  }
}