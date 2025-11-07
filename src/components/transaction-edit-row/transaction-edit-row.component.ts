import { Component, ChangeDetectionStrategy, output, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
// Fix: Import NewTransactionData from the correct model file.
import { NewTransactionData } from '../../models/transaction.model';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-transaction-edit-row',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './transaction-edit-row.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransactionEditRowComponent implements OnInit, OnDestroy {
  cancel = output<void>();
  save = output<NewTransactionData>();

  transactionForm: FormGroup;
  
  amount = signal(0);
  totalAmount = signal(0);
  private formChangesSubscription!: Subscription;

  constructor(fb: FormBuilder) {
    const today = new Date().toISOString().substring(0, 10); // Format YYYY-MM-DD

    this.transactionForm = fb.group({
      ticker: ['', [Validators.required, Validators.maxLength(10)]],
      date: [today, Validators.required],
      transactionType: ['buy', Validators.required],
      shares: [null, [Validators.required, Validators.min(0.000001)]],
      sharePrice: [null, [Validators.required, Validators.min(0.01)]],
      fees: [0, [Validators.required, Validators.min(0)]],
    });
  }

  ngOnInit(): void {
    this.formChangesSubscription = this.transactionForm.valueChanges.subscribe(values => {
      const shares = Number(values.shares) || 0;
      const sharePrice = Number(values.sharePrice) || 0;
      const fees = Number(values.fees) || 0;
      
      const currentAmount = shares * sharePrice;
      this.amount.set(currentAmount);
      this.totalAmount.set(currentAmount + fees);
    });
  }

  ngOnDestroy(): void {
    this.formChangesSubscription.unsubscribe();
  }

  onSubmit(): void {
    if (this.transactionForm.invalid) {
      this.transactionForm.markAllAsTouched();
      return;
    }
    this.save.emit(this.transactionForm.value);
  }

  onCancel(): void {
    this.cancel.emit();
  }
}
