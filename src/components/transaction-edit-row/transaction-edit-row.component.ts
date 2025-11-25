import { Component, ChangeDetectionStrategy, output, OnInit, OnDestroy, AfterViewInit, signal, input, effect, inject, computed, ViewChild, ElementRef } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
// Fix: Import NewTransactionData from the correct model file.
import { Transaction, NewTransactionData } from '../../models/transaction.model';
import { SecurityService } from '../../services/security.service';
import { Security } from '../../models/security.model';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-transaction-edit-row',
  imports: [CommonModule, ReactiveFormsModule, CurrencyPipe],
  templateUrl: './transaction-edit-row.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransactionEditRowComponent implements OnInit, OnDestroy, AfterViewInit {
  cancel = output<void>();
  save = output<NewTransactionData | Transaction>();
  initialState = input<Transaction | undefined>();

  @ViewChild('tickerInput', { static: false }) tickerInputRef!: ElementRef<HTMLInputElement>;

  private securityService = inject(SecurityService);
  transactionForm: FormGroup;
  
  private formChangesSubscription!: Subscription;

  // Autocomplete state
  tickerInputValue = signal('');
  selectedIndex = signal(-1);
  showDropdown = signal(false);
  
  // Form values as signals for reactivity
  private sharesValue = signal(0);
  private sharePriceValue = signal(0);
  private feesValue = signal(0);
  private transactionTypeValue = signal<'buy' | 'sell'>('buy');
  
  filteredSecurities = computed(() => {
    const value = this.tickerInputValue();
    if (!value || value.trim().length === 0) {
      return [];
    }
    return this.securityService.filterSecurities(value);
  });

  // Computed total amount based on transaction type
  estimatedTotal = computed(() => {
    const shares = this.sharesValue();
    const sharePrice = this.sharePriceValue();
    const fees = this.feesValue();
    const transactionType = this.transactionTypeValue();
    
    const baseAmount = shares * sharePrice;
    
    // Buy: (Shares * Price) + Fees (money out, red)
    // Sell: (Shares * Price) - Fees (money in, green)
    if (transactionType === 'buy') {
      return baseAmount + fees;
    } else {
      return baseAmount - fees;
    }
  });

  // Get color class for total display
  getTotalColorClass(): string {
    const transactionType = this.transactionTypeValue();
    return transactionType === 'buy' ? 'text-red-600' : 'text-green-600';
  }

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
            this.tickerInputValue.set(state.ticker || '');
        } else {
            this.transactionForm.reset({
                date: today,
                transactionType: 'buy',
                fees: 0,
                ticker: '',
                shares: null,
                sharePrice: null
            });
            this.tickerInputValue.set('');
            // Focus ticker input when adding a new transaction
            setTimeout(() => {
              if (this.tickerInputRef?.nativeElement) {
                this.tickerInputRef.nativeElement.focus();
              }
            }, 0);
        }
    });
  }

  ngOnInit(): void {
    // Subscribe to ticker input changes for autocomplete
    this.transactionForm.get('ticker')?.valueChanges.subscribe(value => {
      this.tickerInputValue.set(value || '');
      const filtered = this.filteredSecurities();
      this.showDropdown.set(value && value.length > 0 && filtered.length > 0);
      this.selectedIndex.set(-1);
    });

    // Subscribe to form value changes to update reactive signals
    this.formChangesSubscription = this.transactionForm.valueChanges.subscribe(values => {
      this.sharesValue.set(Number(values.shares) || 0);
      this.sharePriceValue.set(Number(values.sharePrice) || 0);
      this.feesValue.set(Number(values.fees) || 0);
      this.transactionTypeValue.set(values.transactionType || 'buy');
    });
  }

  ngAfterViewInit(): void {
    // Focus ticker input when adding a new transaction (not editing)
    if (!this.initialState() && this.tickerInputRef?.nativeElement) {
      // Use setTimeout to ensure the view is fully rendered
      setTimeout(() => {
        this.tickerInputRef.nativeElement.focus();
      }, 0);
    }
  }

  ngOnDestroy(): void {
    if (this.formChangesSubscription) {
      this.formChangesSubscription.unsubscribe();
    }
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

  // Autocomplete methods
  selectSecurity(security: Security): void {
    this.transactionForm.get('ticker')?.setValue(security.ticker.toUpperCase());
    this.showDropdown.set(false);
    this.selectedIndex.set(-1);
  }

  onTickerInputFocus(): void {
    const value = this.tickerInputValue();
    const filtered = this.filteredSecurities();
    if (value && value.length > 0 && filtered.length > 0) {
      this.showDropdown.set(true);
    }
  }

  onTickerInputBlur(): void {
    // Delay hiding dropdown to allow click events on dropdown items
    setTimeout(() => {
      this.showDropdown.set(false);
      this.selectedIndex.set(-1);
    }, 200);
  }

  onKeyDown(event: KeyboardEvent): void {
    const filtered = this.filteredSecurities();
    if (filtered.length === 0) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.selectedIndex.update(idx => 
          idx < filtered.length - 1 ? idx + 1 : idx
        );
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.selectedIndex.update(idx => idx > 0 ? idx - 1 : -1);
        break;
      case 'Enter':
        event.preventDefault();
        const currentIndex = this.selectedIndex();
        if (currentIndex >= 0 && currentIndex < filtered.length) {
          this.selectSecurity(filtered[currentIndex]);
        }
        break;
      case 'Escape':
        this.showDropdown.set(false);
        this.selectedIndex.set(-1);
        break;
    }
  }
}