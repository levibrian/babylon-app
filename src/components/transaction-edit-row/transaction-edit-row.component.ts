import { Component, ChangeDetectionStrategy, output, OnInit, OnDestroy, AfterViewInit, signal, input, effect, inject, computed, ViewChild, ElementRef } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
// Fix: Import NewTransactionData from the correct model file.
import { Transaction, NewTransactionData } from '../../models/transaction.model';
import { SecurityService } from '../../services/security.service';
import { Security } from '../../models/security.model';
import { Subscription, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, catchError, tap } from 'rxjs/operators';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { SelectOnFocusDirective } from '../../directives/select-on-focus.directive';

interface SearchResult {
  ticker: string;
  name: string;
  type: string;
  exchange: string;
}

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
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/api/v1/market/search`;
  
  transactionForm: FormGroup;
  
  private formChangesSubscription!: Subscription;
  private isUpdatingValidators = false; // Flag to prevent infinite loops

  // Autocomplete state
  tickerInputValue = signal('');
  selectedIndex = signal(-1);
  showDropdown = signal(false);
  searchResults = signal<SearchResult[]>([]);

  // Form values as signals for reactivity
  private sharesValue = signal(0);
  private sharePriceValue = signal(0);
  private feesValue = signal(0);
  private taxValue = signal(0);
  private totalAmountValue = signal(0);
  private transactionTypeValue = signal<'buy' | 'sell' | 'dividend' | 'split'>('buy');
  
  // Computed used for template iteration - now just returns searchResults
  filteredSecurities = computed(() => this.searchResults());

  // Computed total amount based on transaction type
  estimatedTotal = computed(() => {
    const shares = this.sharesValue();
    const sharePrice = this.sharePriceValue();
    const fees = this.feesValue();
    const totalAmount = this.totalAmountValue();
    const tax = this.taxValue();
    const transactionType = this.transactionTypeValue();
    
    // Split: Always $0.00 (no money exchanged)
    if (transactionType === 'split') {
      return 0;
    }
    
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
    if (transactionType === 'split') return 'text-gray-600';
    return 'text-green-600';
  }
  
  // Get split ratio display text
  getSplitRatioDisplay(): string {
    const ratio = this.splitRatio();
    const forEvery = this.splitForEvery();
    const youReceive = this.splitYouReceive();
    
    if (ratio > 1) {
      return `${youReceive}-for-${forEvery} forward split`;
    } else if (ratio < 1 && ratio > 0) {
      return `${forEvery}-for-${youReceive} reverse split`;
    }
    return '';
  }
  
  // Tooltip state
  activeTooltip = signal<{ x: number; y: number; text: string } | null>(null);
  
  showTooltip(event: MouseEvent, text: string): void {
    this.activeTooltip.set({
      x: event.clientX,
      y: event.clientY,
      text,
    });
  }
  
  hideTooltip(): void {
    this.activeTooltip.set(null);
  }

  // Check if current transaction type is dividend
  isDividend = computed(() => this.transactionTypeValue() === 'dividend');
  
  // Check if current transaction type is split
  isSplit = computed(() => this.transactionTypeValue() === 'split');
  
  // Split ratio state (X-for-Y format)
  splitForEvery = signal(1);
  splitYouReceive = signal(2);
  splitRatio = computed(() => {
    const forEvery = this.splitForEvery();
    const youReceive = this.splitYouReceive();
    if (forEvery <= 0) return 0;
    return youReceive / forEvery;
  });

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
            
            // Initialize split ratio if editing a split transaction
            if (state.transactionType === 'split' && state.shares > 0) {
              // Convert ratio back to X-for-Y format
              const ratio = state.shares;
              if (ratio >= 1) {
                // Forward split: e.g., 2.0 -> 2-for-1, 3.0 -> 3-for-1
                this.splitForEvery.set(1);
                this.splitYouReceive.set(ratio);
              } else if (ratio > 0) {
                // Reverse split: e.g., 0.5 -> 1-for-2, 0.333 -> 1-for-3
                this.splitForEvery.set(Math.round(1 / ratio));
                this.splitYouReceive.set(1);
              } else {
                // Fallback to default
                this.splitForEvery.set(1);
                this.splitYouReceive.set(2);
              }
              // Update the form's shares field with the ratio
              this.transactionForm.get('shares')?.setValue(ratio, { emitEvent: false });
            } else if (state.transactionType === 'split') {
              // Split transaction but no shares value, use defaults
              this.splitForEvery.set(1);
              this.splitYouReceive.set(2);
            }
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
            this.splitForEvery.set(1);
            this.splitYouReceive.set(2);
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
    this.transactionForm.get('ticker')?.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(term => {
        this.tickerInputValue.set(term || '');
        if (!term || term.length < 1) {
          this.searchResults.set([]);
          this.showDropdown.set(false);
          return of([]);
        }
        
        const params = new HttpParams().set('query', term);
        return this.http.get<SearchResult[]>(this.apiUrl, { params }).pipe(
          catchError(err => {
            console.error('Search error', err);
            return of([]);
          })
        );
      })
    ).subscribe(results => {
      this.searchResults.set(results);
      const hasTerm = !!this.transactionForm.get('ticker')?.value;
      this.showDropdown.set(hasTerm && results.length > 0);
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

  setTransactionType(type: 'buy' | 'sell' | 'dividend' | 'split'): void {
    this.transactionForm.get('transactionType')?.setValue(type);
    this.updateValidators(type);
    
    // Initialize split ratio when switching to split
    if (type === 'split') {
      const currentShares = this.transactionForm.get('shares')?.value;
      if (currentShares && currentShares > 0) {
        // Convert existing shares value (ratio) back to X-for-Y format
        const ratio = currentShares;
        if (ratio >= 1) {
          // Forward split: e.g., 2.0 -> 2-for-1, 3.0 -> 3-for-1
          this.splitForEvery.set(1);
          this.splitYouReceive.set(ratio);
        } else if (ratio > 0) {
          // Reverse split: e.g., 0.5 -> 1-for-2
          this.splitForEvery.set(Math.round(1 / ratio));
          this.splitYouReceive.set(1);
        } else {
          // Fallback to default
          this.splitForEvery.set(1);
          this.splitYouReceive.set(2);
        }
      } else {
        // No existing value, use defaults
        this.splitForEvery.set(1);
        this.splitYouReceive.set(2);
      }
      // Update shares field with calculated ratio
      const ratio = this.splitRatio();
      this.transactionForm.get('shares')?.setValue(ratio, { emitEvent: false });
    }
  }
  
  onSplitRatioChange(): void {
    if (this.isSplit()) {
      const ratio = this.splitRatio();
      const sharesControl = this.transactionForm.get('shares');
      if (sharesControl && sharesControl.value !== ratio) {
        sharesControl.setValue(ratio, { emitEvent: false });
      }
    }
  }
  
  onSplitYouReceiveChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    const numValue = parseFloat(value) || 1;
    this.splitYouReceive.set(numValue);
    this.onSplitRatioChange();
  }
  
  onSplitForEveryChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    const numValue = parseInt(value, 10) || 1;
    this.splitForEvery.set(numValue);
    this.onSplitRatioChange();
  }

  private updateValidators(type: 'buy' | 'sell' | 'dividend' | 'split'): void {
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
      } else if (type === 'split') {
        // Split: require shares (ratio), sharePrice = 0, fees = 0, tax = 0
        sharesControl?.setValidators([Validators.required, Validators.min(0.000001)]);
        sharePriceControl?.clearValidators();
        sharePriceControl?.setValue(0, { emitEvent: false });
        sharePriceControl?.disable({ emitEvent: false });
        feesControl?.clearValidators();
        feesControl?.setValue(0, { emitEvent: false });
        feesControl?.disable({ emitEvent: false });
        totalAmountControl?.clearValidators();
        totalAmountControl?.setValue(0, { emitEvent: false });
        taxControl?.clearValidators();
        taxControl?.setValue(0, { emitEvent: false });
        taxControl?.disable({ emitEvent: false });
      } else {
        // Buy/Sell: require shares, sharePrice, fees; hide totalAmount and tax
        sharesControl?.setValidators([Validators.required, Validators.min(0.000001)]);
        sharePriceControl?.setValidators([Validators.required, Validators.min(0.01)]);
        sharePriceControl?.enable({ emitEvent: false });
        feesControl?.setValidators([Validators.required, Validators.min(0)]);
        feesControl?.enable({ emitEvent: false });
        totalAmountControl?.clearValidators();
        totalAmountControl?.setValue(null, { emitEvent: false });
        taxControl?.clearValidators();
        taxControl?.setValue(0, { emitEvent: false });
        taxControl?.enable({ emitEvent: false });
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
    
    // For split transactions, ensure we have the latest ratio values
    if (transactionType === 'split') {
      // Force update the form's shares field with the current computed ratio
      const currentRatio = this.splitRatio();
      this.transactionForm.get('shares')?.setValue(currentRatio, { emitEvent: false });
    }

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
    } else if (transactionType === 'split') {
      // For splits: sharePrice = 0, fees = 0, tax = 0, totalAmount = 0, shares = ratio
      // Use the computed split ratio directly instead of form value to ensure accuracy
      // Force read the latest signal values
      const forEvery = this.splitForEvery();
      const youReceive = this.splitYouReceive();
      const splitRatio = youReceive / forEvery; // Calculate directly to ensure accuracy
      
      // Debug logging for split ratio
      console.log('Split transaction payload:', {
        splitForEvery: forEvery,
        splitYouReceive: youReceive,
        calculatedRatio: splitRatio,
        computedRatio: this.splitRatio(),
        formSharesValue: formValue.shares
      });
      
      // Also update the form's shares field to keep it in sync
      this.transactionForm.get('shares')?.setValue(splitRatio, { emitEvent: false });
      
      payload = {
        ticker: formValue.ticker,
        date: formValue.date,
        transactionType: 'split',
        shares: splitRatio, // Split ratio (e.g., 3.0 for 3-for-1)
        sharePrice: 0, // MUST be 0 for splits
        fees: 0,
        totalAmount: 0, // Always 0 for splits
        tax: 0,
      };
      
      console.log('Split payload created:', payload);
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
  selectSecurity(result: SearchResult | Security): void {
    // Handle both new SearchResult interface and old Security model for backward compatibility if needed
    const ticker = 'ticker' in result ? result.ticker : (result as any).ticker;
    this.transactionForm.get('ticker')?.setValue(ticker.toUpperCase());
    this.showDropdown.set(false);
    this.selectedIndex.set(-1);
  }

  onTickerInputFocus(): void {
    const value = this.tickerInputValue();
    // Re-trigger search if we have a value but no results (e.g. came back to tab)
    // For now, just show existing results if any
    if (value && value.length > 0 && this.searchResults().length > 0) {
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
    const results = this.searchResults();
    if (results.length === 0) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.selectedIndex.update(idx => 
          idx < results.length - 1 ? idx + 1 : idx
        );
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.selectedIndex.update(idx => idx > 0 ? idx - 1 : -1);
        break;
      case 'Enter':
        event.preventDefault();
        const currentIndex = this.selectedIndex();
        if (currentIndex >= 0 && currentIndex < results.length) {
          this.selectSecurity(results[currentIndex]);
        }
        break;
      case 'Escape':
        this.showDropdown.set(false);
        this.selectedIndex.set(-1);
        break;
    }
  }
}