import { Component, ChangeDetectionStrategy, output, OnInit, OnDestroy, AfterViewInit, signal, input, effect, inject, computed, ViewChild, ElementRef } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
// Fix: Import NewTransactionData from the correct model file.
import { Transaction, NewTransactionData } from '../../models/transaction.model';
import { SecurityService } from '../../services/security.service';
import { Security } from '../../models/security.model';
import { Subscription } from 'rxjs';
import { SelectOnFocusDirective } from '../../directives/select-on-focus.directive';

@Component({
  selector: 'app-transaction-edit-row',
  imports: [CommonModule, ReactiveFormsModule, CurrencyPipe, SelectOnFocusDirective],
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
  private isUpdatingValidators = false; // Flag to prevent infinite loops

  // Autocomplete state
  tickerInputValue = signal('');
  selectedIndex = signal(-1);
  showDropdown = signal(false);
  
  // Form values as signals for reactivity
  private sharesValue = signal(0);
  private sharePriceValue = signal(0);
  private feesValue = signal(0);
  private taxValue = signal(0);
  private totalAmountValue = signal(0);
  private transactionTypeValue = signal<'buy' | 'sell' | 'dividend'>('buy');
  
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
    const totalAmount = this.totalAmountValue();
    const tax = this.taxValue();
    const transactionType = this.transactionTypeValue();
    
    // Dividend: Show Gross Amount (Net Received + Tax Withheld)
    if (transactionType === 'dividend') {
      return totalAmount + tax;
    }
    
    const baseAmount = shares * sharePrice;
    
    // Buy: (Shares * Price) + Fees (money out, red)
    // Sell: (Shares * Price) - Fees (money in, green)
    if (transactionType === 'buy') {
      return baseAmount + fees;
    } else {
      return baseAmount - fees;
    }
  });
  
  // Get the label for the total field
  getTotalLabel(): string {
    return this.isDividend() ? 'Gross Amount' : 'Total';
  }

  // Get color class for total display
  getTotalColorClass(): string {
    const transactionType = this.transactionTypeValue();
    if (transactionType === 'buy') return 'text-red-600';
    if (transactionType === 'dividend') return 'text-purple-600';
    return 'text-green-600';
  }

  // Check if current transaction type is dividend
  isDividend = computed(() => this.transactionTypeValue() === 'dividend');

  constructor(private fb: FormBuilder) {
    const today = new Date().toISOString().substring(0, 10); // Format YYYY-MM-DD

    this.transactionForm = fb.group({
      ticker: ['', [Validators.required, Validators.maxLength(10)]],
      date: [today, Validators.required],
      transactionType: ['buy', Validators.required],
      shares: [null, [Validators.required, Validators.min(0.000001)]],
      sharePrice: [null],
      fees: [0, [Validators.required, Validators.min(0)]],
      totalAmount: [null], // For dividends: Net Received
      tax: [0, [Validators.min(0)]], // For dividends: Tax Withheld
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
      // Skip if we're currently updating validators to prevent infinite loops
      if (this.isUpdatingValidators) {
        return;
      }

      this.sharesValue.set(Number(values.shares) || 0);
      this.sharePriceValue.set(Number(values.sharePrice) || 0);
      this.feesValue.set(Number(values.fees) || 0);
      this.taxValue.set(Number(values.tax) || 0);
      this.totalAmountValue.set(Number(values.totalAmount) || 0);
      const newType = values.transactionType || 'buy';
      const currentType = this.transactionTypeValue();
      this.transactionTypeValue.set(newType);
      
      // Update validators only if transaction type changed
      if (newType !== currentType) {
        this.updateValidators(newType);
      }
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

  setTransactionType(type: 'buy' | 'sell' | 'dividend'): void {
    this.transactionForm.get('transactionType')?.setValue(type);
    this.updateValidators(type);
  }

  private updateValidators(type: 'buy' | 'sell' | 'dividend'): void {
    // Set flag to prevent infinite loops
    this.isUpdatingValidators = true;

    try {
      const sharesControl = this.transactionForm.get('shares');
      const sharePriceControl = this.transactionForm.get('sharePrice');
      const feesControl = this.transactionForm.get('fees');
      const totalAmountControl = this.transactionForm.get('totalAmount');
      const taxControl = this.transactionForm.get('tax');

      if (type === 'dividend') {
        // Dividend: require shares, totalAmount, tax; hide price and fees
        sharesControl?.setValidators([Validators.required, Validators.min(0.000001)]);
        totalAmountControl?.setValidators([Validators.required, Validators.min(0.01)]);
        taxControl?.setValidators([Validators.required, Validators.min(0)]);
        sharePriceControl?.clearValidators();
        sharePriceControl?.setValue(null, { emitEvent: false });
        feesControl?.clearValidators();
        feesControl?.setValue(0, { emitEvent: false });
      } else {
        // Buy/Sell: require shares, sharePrice, fees; hide totalAmount and tax
        sharesControl?.setValidators([Validators.required, Validators.min(0.000001)]);
        sharePriceControl?.setValidators([Validators.required, Validators.min(0.01)]);
        feesControl?.setValidators([Validators.required, Validators.min(0)]);
        totalAmountControl?.clearValidators();
        totalAmountControl?.setValue(null, { emitEvent: false });
        taxControl?.clearValidators();
        taxControl?.setValue(0, { emitEvent: false });
      }

      sharesControl?.updateValueAndValidity({ emitEvent: false });
      sharePriceControl?.updateValueAndValidity({ emitEvent: false });
      feesControl?.updateValueAndValidity({ emitEvent: false });
      totalAmountControl?.updateValueAndValidity({ emitEvent: false });
      taxControl?.updateValueAndValidity({ emitEvent: false });
    } finally {
      // Always reset flag
      this.isUpdatingValidators = false;
    }
  }

  onSubmit(): void {
    if (this.transactionForm.invalid) {
      this.transactionForm.markAllAsTouched();
      return;
    }
    
    const formValue = this.transactionForm.value;
    const transactionType = formValue.transactionType;
    const initialTx = this.initialState();

    // Prepare payload based on transaction type
    let payload: NewTransactionData | Transaction;
    
    if (transactionType === 'dividend') {
      // For dividends: sharePrice = 0, fees = 0, totalAmount = Net Received
      const netReceived = Number(formValue.totalAmount) || 0;
      const taxWithheld = Number(formValue.tax) || 0;
      
      // Debug logging
      console.log('Dividend payload:', {
        formValueTotalAmount: formValue.totalAmount,
        parsedNetReceived: netReceived,
        formValueTax: formValue.tax,
        parsedTax: taxWithheld
      });
      
      payload = {
        ticker: formValue.ticker,
        date: formValue.date,
        transactionType: 'dividend',
        shares: Number(formValue.shares) || 0,
        sharePrice: 0, // Backend will calculate based on Net+Tax/Shares
        fees: 0,
        totalAmount: netReceived, // Net Received
        tax: taxWithheld,
      };
    } else {
      // For buy/sell: calculate totalAmount from shares * sharePrice +/- fees
      const shares = Number(formValue.shares) || 0;
      const sharePrice = Number(formValue.sharePrice) || 0;
      const fees = Number(formValue.fees) || 0;
      const baseAmount = shares * sharePrice;
      const totalAmount = transactionType === 'buy' 
        ? baseAmount + fees 
        : baseAmount - fees;
      
      payload = {
        ticker: formValue.ticker,
        date: formValue.date,
        transactionType: transactionType,
        shares: shares,
        sharePrice: sharePrice,
        fees: fees,
        totalAmount: totalAmount,
      };
    }

    if (initialTx) {
      // It's an edit, include the ID
      const updatedTransaction: Transaction = {
        ...initialTx,
        ...payload,
      };
      this.save.emit(updatedTransaction);
    } else {
      // It's a new transaction
      this.save.emit(payload as NewTransactionData);
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