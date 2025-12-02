import { Component, ChangeDetectionStrategy, ChangeDetectorRef, output, OnInit, inject, signal, computed, ViewChild, ElementRef, AfterViewInit, effect, Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { RecurringScheduleService } from '../../services/recurring-schedule.service';
import { TransactionService } from '../../services/transaction.service';
import { SecurityService } from '../../services/security.service';
import { PortfolioService } from '../../services/portfolio.service';
import { RecurringSchedule, CreateRecurringScheduleRequest } from '../../models/recurring-schedule.model';
import { Security, SecurityType } from '../../models/security.model';
import { NewTransactionData } from '../../models/transaction.model';
import { toast } from 'ngx-sonner';
import { SelectOnFocusDirective } from '../../directives/select-on-focus.directive';


@Component({
  selector: 'app-recurring-investments-list',
  templateUrl: './recurring-investments-list.component.html',
  imports: [CommonModule, ReactiveFormsModule, CurrencyPipe, SelectOnFocusDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block h-full overflow-hidden'
  },
})
export class RecurringInvestmentsListComponent implements OnInit, AfterViewInit {
  navigateToTransactions = output<void>();

  @ViewChild('tickerInput', { static: false }) tickerInputRef!: ElementRef<HTMLInputElement>;

  private recurringScheduleService = inject(RecurringScheduleService);
  private transactionService = inject(TransactionService);
  private securityService = inject(SecurityService);
  private portfolioService = inject(PortfolioService);
  private fb = inject(FormBuilder);
  private cdr = inject(ChangeDetectorRef);

  // Schedules from service
  schedules = this.recurringScheduleService.schedules;
  loading = this.recurringScheduleService.loading;

  // Add New form
  addNewForm: FormGroup;
  tickerInputValue = signal('');
  selectedIndex = signal(-1);
  showDropdown = signal(false);

  // Search query for filtering schedules (initialized to empty string)
  searchQuery = signal('');

  // Asset type filter (null means "Display All")
  selectedAssetType = signal<SecurityType | null>(null);

  // Add mode toggle for progressive disclosure
  isAddMode = signal(false);

  // FormArray to manage grid inputs - each FormGroup represents a schedule row
  gridForm: FormGroup;
  get rowsFormArray(): FormArray {
    return this.gridForm.get('rows') as FormArray;
  }

  // ============================================================================
  // Constants
  // ============================================================================

  /**
   * Maps security type strings (from API) to SecurityType enum values
   */
  private static readonly SECURITY_TYPE_MAP: Record<string, SecurityType> = {
    'Stock': SecurityType.Stock,
    'ETF': SecurityType.ETF,
    'MutualFund': SecurityType.MutualFund,
    'Mutual Fund': SecurityType.MutualFund,
    'Bond': SecurityType.Bond,
    'Crypto': SecurityType.Crypto,
    'REIT': SecurityType.REIT,
    'Options': SecurityType.Options,
    'Commodity': SecurityType.Commodity,
  };

  /**
   * Maps SecurityType enum values to display names
   */
  private static readonly SECURITY_TYPE_NAMES: Record<SecurityType, string> = {
    [SecurityType.Stock]: 'Stock',
    [SecurityType.ETF]: 'ETF',
    [SecurityType.MutualFund]: 'Mutual Fund',
    [SecurityType.Bond]: 'Bond',
    [SecurityType.Crypto]: 'Crypto',
    [SecurityType.REIT]: 'REIT',
    [SecurityType.Options]: 'Options',
    [SecurityType.Commodity]: 'Commodity',
  };

  private static readonly MIN_SECURITY_TYPE = 1;
  private static readonly MAX_SECURITY_TYPE = 8;

  // ============================================================================
  // Computed Signals
  // ============================================================================

  filteredSecurities = computed(() => {
    const value = this.tickerInputValue();
    if (!value || value.trim().length === 0) {
      return [];
    }
    return this.securityService.filterSecurities(value);
  });

  // ============================================================================
  // Private Helper Methods - Security Type Conversion
  // ============================================================================

  /**
   * Converts securityType (string or number) to SecurityType enum value.
   * Handles both API string responses and numeric enum values.
   */
  private convertSecurityTypeToEnum(type: string | number | SecurityType | undefined | null): SecurityType | undefined {
    if (type === undefined || type === null) {
      return undefined;
    }
    
    // If it's already a number, validate and return
    if (typeof type === 'number') {
      return (type >= RecurringInvestmentsListComponent.MIN_SECURITY_TYPE && 
              type <= RecurringInvestmentsListComponent.MAX_SECURITY_TYPE) 
        ? type as SecurityType 
        : undefined;
    }
    
    // If it's a string, convert using the mapping
    if (typeof type === 'string') {
      return RecurringInvestmentsListComponent.SECURITY_TYPE_MAP[type];
    }
    
    return undefined;
  }

  /**
   * Gets the security type for a schedule by looking up the security.
   * Tries SecurityService first (by securityId, then by ticker), then falls back to
   * PortfolioService and TransactionService.
   */
  private getSecurityTypeForSchedule(schedule: RecurringSchedule): SecurityType | undefined {
    // Try SecurityService first (most reliable source)
    const security = this.findSecurityForSchedule(schedule);
    if (security?.securityType !== undefined && security.securityType !== null) {
      return this.convertSecurityTypeToEnum(security.securityType);
    }

    // Fallback to PortfolioService
    const portfolioItem = this.findPortfolioItemForSchedule(schedule);
    if (portfolioItem?.securityType !== undefined && portfolioItem.securityType !== null) {
      return this.convertSecurityTypeToEnum(portfolioItem.securityType);
    }

    // Last fallback: TransactionService
    const transaction = this.findLatestTransactionForSchedule(schedule);
    if (transaction?.securityType !== undefined && transaction.securityType !== null) {
      return this.convertSecurityTypeToEnum(transaction.securityType);
    }

    return undefined;
  }

  /**
   * Finds a security for a schedule, trying securityId first, then ticker.
   */
  private findSecurityForSchedule(schedule: RecurringSchedule): Security | undefined {
    const securities = this.securityService.securities();
    
    // Try by securityId first (most direct)
    if (schedule.securityId) {
      const byId = securities.find(s => s.id === schedule.securityId);
      if (byId) return byId;
    }
    
    // Fallback to ticker lookup
    return securities.find(
      s => s.ticker.toUpperCase() === schedule.ticker.toUpperCase()
    );
  }

  /**
   * Finds a portfolio item for a schedule by ticker.
   */
  private findPortfolioItemForSchedule(schedule: RecurringSchedule) {
    const portfolioItems = this.portfolioService.portfolio();
    return portfolioItems.find(
      p => p.ticker.toUpperCase() === schedule.ticker.toUpperCase()
    );
  }

  /**
   * Finds the most recent transaction for a schedule by ticker.
   */
  private findLatestTransactionForSchedule(schedule: RecurringSchedule) {
    const transactions = this.transactionService.transactions();
    return transactions
      .filter(tx => tx.ticker.toUpperCase() === schedule.ticker.toUpperCase())
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
  }


  // ============================================================================
  // Public Helper Methods - Template Use
  // ============================================================================

  /**
   * Gets the display name for a SecurityType enum value.
   * Used in templates to display security type names.
   */
  getSecurityTypeName(type: SecurityType | undefined | null): string {
    if (type === undefined || type === null) {
      return 'Stock';
    }
    
    // Validate it's a valid SecurityType enum value
    const typeValue = typeof type === 'number' ? type : Number(type);
    if (isNaN(typeValue) || 
        typeValue < RecurringInvestmentsListComponent.MIN_SECURITY_TYPE || 
        typeValue > RecurringInvestmentsListComponent.MAX_SECURITY_TYPE) {
      return 'Stock';
    }
    
    return RecurringInvestmentsListComponent.SECURITY_TYPE_NAMES[typeValue as SecurityType] || 'Stock';
  }

  /**
   * Converts SecurityType enum value to string for HTML select element.
   */
  securityTypeToString(type: SecurityType | null): string {
    return type !== null ? String(type) : '';
  }

  /**
   * Converts string value from HTML select to SecurityType enum value.
   */
  stringToSecurityType(value: string): SecurityType | null {
    if (!value || value === '') {
      return null;
    }
    const num = Number(value);
    return isNaN(num) ? null : num as SecurityType;
  }

  /**
   * Computes distinct security types from all recurring schedules.
   * Looks up security types from SecurityService and returns unique, sorted enum values.
   */
  availableAssetTypes = computed(() => {
    const allSchedules = this.schedules();
    const typeSet = new Set<SecurityType>();
    
    allSchedules.forEach(schedule => {
      const security = this.findSecurityForSchedule(schedule);
      if (security?.securityType !== undefined && security.securityType !== null) {
        const securityTypeValue = this.convertSecurityTypeToEnum(security.securityType);
        if (securityTypeValue !== undefined) {
          typeSet.add(securityTypeValue);
        }
      }
    });
    
    return Array.from(typeSet).sort((a, b) => a - b);
  });

  /**
   * Filters schedules by search query and/or selected asset type.
   * This computed signal depends on schedules and securities to ensure reactivity.
   */
  filteredSchedules = computed(() => {
    const query = this.searchQuery();
    const assetTypeFilter = this.selectedAssetType();
    const allSchedules = this.schedules();
    
    let filtered = allSchedules;
    
    // Filter by search query (ticker or security name)
    if (query && query.trim().length > 0) {
      const searchTerm = query.toLowerCase().trim();
      filtered = filtered.filter(schedule =>
        schedule.ticker.toLowerCase().includes(searchTerm) ||
        schedule.securityName.toLowerCase().includes(searchTerm)
      );
    }
    
    // Filter by asset type
    if (assetTypeFilter !== null) {
      filtered = filtered.filter(schedule => {
        const scheduleType = this.getSecurityTypeForSchedule(schedule);
        return scheduleType === assetTypeFilter;
      });
    }
    
    // Sort alphabetically by security name
    return filtered.sort((a, b) => a.securityName.localeCompare(b.securityName));
  });

  // ============================================================================
  // Form Helper Methods
  // ============================================================================

  /**
   * Calculates the total amount for a row (shares * price + fees).
   */
  getRowTotal(index: number): number {
    const rowGroup = this.rowsFormArray.at(index) as FormGroup;
    if (!rowGroup) return 0;
    
    const shares = rowGroup.get('shares')?.value;
    const sharePrice = rowGroup.get('sharePrice')?.value;
    const fees = rowGroup.get('fees')?.value || 0;
    
    if (!shares || !sharePrice || shares <= 0 || sharePrice <= 0) {
      return 0;
    }
    return shares * sharePrice + fees;
  }

  /**
   * Checks if a row has valid data (shares and price are positive numbers).
   */
  isRowValid(index: number): boolean {
    const rowGroup = this.rowsFormArray.at(index) as FormGroup;
    if (!rowGroup) return false;
    
    const shares = rowGroup.get('shares')?.value;
    const sharePrice = rowGroup.get('sharePrice')?.value;
    
    return !!(shares && shares > 0 && sharePrice && sharePrice > 0);
  }

  // Live form changes signal - converts FormArray valueChanges to a signal
  // Initialized in constructor after gridForm is created
  private formChanges!: Signal<any[]>;

  // Computed signal for valid transaction count (for button display)
  // This reacts to form value changes via formChanges signal
  validTransactionCount = computed(() => {
    const rawValues = this.formChanges();
    if (!rawValues || rawValues.length === 0) return 0;
    
    return rawValues.filter((row: any) => {
      const shares = row.shares;
      const sharePrice = row.sharePrice;
      return shares && Number(shares) > 0 && sharePrice && Number(sharePrice) > 0;
    }).length;
  });

  // Get valid rows for execution (kept for executeTransactions method)
  validRows = computed(() => {
    const rows: number[] = [];
    const rawValues = this.formChanges();
    if (!rawValues) return rows;
    
    for (let i = 0; i < rawValues.length; i++) {
      const row = rawValues[i];
      const shares = row.shares;
      const sharePrice = row.sharePrice;
      if (shares && Number(shares) > 0 && sharePrice && Number(sharePrice) > 0) {
        rows.push(i);
      }
    }
    return rows;
  });

  constructor() {
    const today = new Date().toISOString().substring(0, 10);
    
    // Add New form
    this.addNewForm = this.fb.group({
      ticker: ['', [Validators.required]],
    });

    // Grid form with FormArray
    this.gridForm = this.fb.group({
      rows: this.fb.array([])
    });

    // Initialize formChanges signal from FormArray valueChanges
    // This makes computed signals reactive to form input changes
    this.formChanges = toSignal(this.rowsFormArray.valueChanges, { initialValue: [] });

    // Watch for schedule changes and trigger change detection
    // Effects must be created in constructor (injection context)
    effect(() => {
      // Access schedules signal to create dependency - this effect will run whenever schedules or loading changes
      const currentSchedules = this.schedules();
      const isLoading = this.loading();
      
      // Access filteredSchedules to ensure it's computed and tracked
      const filtered = this.filteredSchedules();
      
      // Manually trigger change detection when schedules or loading state changes
      // This ensures the template updates even if OnPush doesn't detect the change
      this.cdr.markForCheck();
    });

    // Initialize FormArray rows when schedules change
    // Effects must be created in constructor (injection context)
    effect(() => {
      const currentSchedules = this.schedules();
      const rowsArray = this.rowsFormArray;
      
      // Create a map of existing schedule IDs to their indices
      const existingScheduleIds = new Map<string, number>();
      for (let i = 0; i < rowsArray.length; i++) {
        const rowGroup = rowsArray.at(i) as FormGroup;
        const scheduleId = rowGroup.get('scheduleId')?.value;
        if (scheduleId) {
          existingScheduleIds.set(scheduleId, i);
        }
      }

      // Add new rows for schedules that don't have a form group yet
      const today = new Date().toISOString().substring(0, 10);
      currentSchedules.forEach(schedule => {
        if (!existingScheduleIds.has(schedule.id)) {
          const rowGroup = this.fb.group({
            scheduleId: [schedule.id],
            date: [today],
            shares: [null],
            sharePrice: [null],
            fees: [0],
          });
          rowsArray.push(rowGroup);
        }
      });

      // Remove rows for schedules that no longer exist
      const currentScheduleIds = new Set(currentSchedules.map(s => s.id));
      for (let i = rowsArray.length - 1; i >= 0; i--) {
        const rowGroup = rowsArray.at(i) as FormGroup;
        const scheduleId = rowGroup.get('scheduleId')?.value;
        if (scheduleId && !currentScheduleIds.has(scheduleId)) {
          rowsArray.removeAt(i);
        }
      }

      // Trigger change detection
      // Note: formChanges signal will automatically update via valueChanges subscription
      this.cdr.markForCheck();
    });

    // Load schedules immediately in constructor to ensure loading state is set before template renders
    this.recurringScheduleService.loadSchedules();
  }

  ngOnInit(): void {
    this.loadData();
    this.setupTickerInputSubscription();
  }

  ngAfterViewInit(): void {
    this.focusTickerInput();
  }

  // ============================================================================
  // Private Setup Methods
  // ============================================================================

  /**
   * Loads schedules and ensures securities are available.
   */
  private loadData(): void {
    this.recurringScheduleService.loadSchedules().then(() => {
      this.cdr.markForCheck();
    });
    
    // Ensure securities are loaded for asset type filtering
    if (this.securityService.securities().length === 0) {
      this.securityService.reload();
    }
  }

  /**
   * Sets up subscription to ticker input changes for autocomplete functionality.
   */
  private setupTickerInputSubscription(): void {
    this.addNewForm.get('ticker')?.valueChanges.subscribe(value => {
      this.tickerInputValue.set(value || '');
      const filtered = this.filteredSecurities();
      this.showDropdown.set(value && value.length > 0 && filtered.length > 0);
      this.selectedIndex.set(-1);
    });
  }

  /**
   * Focuses the ticker input field and triggers change detection.
   */
  private focusTickerInput(): void {
    setTimeout(() => {
      if (this.tickerInputRef?.nativeElement) {
        this.tickerInputRef.nativeElement.focus();
        this.cdr.markForCheck();
      }
    }, 0);
    
    setTimeout(() => {
      this.cdr.markForCheck();
    }, 100);
  }

  // ============================================================================
  // Autocomplete Methods
  // ============================================================================
  selectSecurity(security: Security): void {
    this.addNewForm.get('ticker')?.setValue(security.ticker.toUpperCase());
    this.tickerInputValue.set(security.ticker.toUpperCase());
    this.showDropdown.set(false);
    this.selectedIndex.set(-1);
  }

  onTickerInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value || '';
    this.tickerInputValue.set(value);
    const filtered = this.filteredSecurities();
    this.showDropdown.set(value.length > 0 && filtered.length > 0);
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
        // Close add mode if open
        if (this.isAddMode()) {
          this.closeAddMode();
        }
        break;
    }
  }

  // ============================================================================
  // Schedule Management Methods
  // ============================================================================

  /**
   * Adds a new recurring investment schedule.
   */
  async addSchedule(): Promise<void> {
    if (this.addNewForm.invalid) {
      this.addNewForm.markAllAsTouched();
      return;
    }

    const formValue = this.addNewForm.value;
    const ticker = formValue.ticker?.toUpperCase().trim();

    if (!ticker) {
      return;
    }

    // Find security by ticker
    const securities = this.securityService.filterSecurities(ticker);
    const security = securities.find(s => s.ticker.toUpperCase() === ticker.toUpperCase());

    if (!security) {
      toast.error(`Security "${ticker}" not found`);
      return;
    }

    try {
      const request: CreateRecurringScheduleRequest = {
        ticker: security.ticker,
        securityName: security.securityName,
      };

      await this.recurringScheduleService.addSchedule(request);
      this.resetAddForm();
      this.isAddMode.set(false);
      toast.success('Asset added to recurring investments');
    } catch (err) {
      toast.error('Could not add asset. Please try again.');
    }
  }

  /**
   * Deletes a recurring investment schedule.
   */
  async deleteSchedule(id: string): Promise<void> {
    try {
      await this.recurringScheduleService.deleteSchedule(id);
      toast.success('Asset removed from recurring investments');
    } catch (err) {
      toast.error('Could not remove asset. Please try again.');
    }
  }

  /**
   * Toggles the add mode for progressive disclosure.
   */
  toggleAddMode(): void {
    this.isAddMode.update(mode => !mode);
    if (this.isAddMode()) {
      setTimeout(() => {
        if (this.tickerInputRef?.nativeElement) {
          this.tickerInputRef.nativeElement.focus();
        }
      }, 0);
    } else {
      this.resetAddForm();
    }
  }

  /**
   * Closes add mode and resets the form.
   */
  closeAddMode(): void {
    this.isAddMode.set(false);
    this.resetAddForm();
  }

  /**
   * Resets the add form to its initial state.
   */
  private resetAddForm(): void {
    this.addNewForm.reset({ ticker: '' });
    this.tickerInputValue.set('');
    this.showDropdown.set(false);
  }

  /**
   * Gets the FormGroup for a row by schedule ID.
   */
  getRowFormGroup(scheduleId: string): FormGroup | null {
    for (let i = 0; i < this.rowsFormArray.length; i++) {
      const rowGroup = this.rowsFormArray.at(i) as FormGroup;
      if (rowGroup.get('scheduleId')?.value === scheduleId) {
        return rowGroup;
      }
    }
    return null;
  }

  /**
   * Gets the FormGroup for a row by index.
   */
  getRowFormGroupByIndex(index: number): FormGroup {
    return this.rowsFormArray.at(index) as FormGroup;
  }

  /**
   * Gets the schedule for a row by its index in the FormArray.
   */
  getScheduleForRow(index: number): RecurringSchedule | null {
    const rowGroup = this.rowsFormArray.at(index) as FormGroup;
    if (!rowGroup) return null;
    
    const scheduleId = rowGroup.get('scheduleId')?.value;
    if (!scheduleId) return null;
    
    return this.schedules().find(s => s.id === scheduleId) || null;
  }

  /**
   * Checks if a schedule is in the filtered list.
   * Used in template to conditionally render rows.
   */
  isScheduleInFilteredList(scheduleId: string): boolean {
    return this.filteredSchedules().some(s => s.id === scheduleId);
  }

  // ============================================================================
  // UI Helper Methods
  // ============================================================================

  /**
   * Gets a consistent avatar color class for a ticker symbol.
   */
  getAvatarClass(ticker: string): string {
    const colors = [
      'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500',
      'bg-indigo-500', 'bg-yellow-500', 'bg-red-500', 'bg-teal-500'
    ];
    const hash = ticker.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  }

  /**
   * Handles asset type filter dropdown change event.
   */
  onAssetTypeFilterChange(type: SecurityType | null): void {
    this.selectedAssetType.set(type);
  }

  /**
   * Executes transactions for all valid rows in the grid.
   */
  async executeTransactions(): Promise<void> {
    const validRowIndices = this.validRows();
    
    if (validRowIndices.length === 0) {
      toast.error('Please fill in at least one row with shares and price');
      return;
    }

    const schedules = this.schedules();
    const transactions = this.buildTransactionsFromRows(validRowIndices, schedules);

    if (transactions.length === 0) {
      toast.error('No valid transactions to log');
      return;
    }

    try {
      await this.createTransactions(transactions);
      this.resetFormInputs();
      toast.success(`Successfully logged ${transactions.length} transaction${transactions.length > 1 ? 's' : ''}`);
    } catch (err) {
      toast.error('Could not log all transactions. Please try again.');
    }
  }

  /**
   * Builds transaction data from valid form rows.
   */
  private buildTransactionsFromRows(
    validRowIndices: number[], 
    schedules: RecurringSchedule[]
  ): NewTransactionData[] {
    const transactions: NewTransactionData[] = [];

    for (const index of validRowIndices) {
      const rowGroup = this.rowsFormArray.at(index) as FormGroup;
      const scheduleId = rowGroup.get('scheduleId')?.value;
      const schedule = schedules.find(s => s.id === scheduleId);
      
      if (!schedule) continue;

      const shares = rowGroup.get('shares')?.value;
      const sharePrice = rowGroup.get('sharePrice')?.value;
      const fees = rowGroup.get('fees')?.value || 0;
      const date = rowGroup.get('date')?.value || new Date().toISOString().substring(0, 10);
      
      // Validate row data
      if (!shares || !sharePrice || shares <= 0 || sharePrice <= 0) {
        continue;
      }

      const totalAmount = (shares * sharePrice) + fees;

      transactions.push({
        ticker: schedule.ticker,
        date,
        transactionType: 'buy',
        shares,
        sharePrice,
        fees,
        totalAmount,
        securityName: schedule.securityName,
      });
    }

    return transactions;
  }

  /**
   * Creates transactions via the bulk endpoint in a single request.
   */
  private async createTransactions(transactions: NewTransactionData[]): Promise<void> {
    await this.transactionService.addBulkTransactions(transactions);
  }

  /**
   * Resets form inputs to default values while keeping the rows.
   */
  private resetFormInputs(): void {
    const today = new Date().toISOString().substring(0, 10);
    for (let i = 0; i < this.rowsFormArray.length; i++) {
      const rowGroup = this.rowsFormArray.at(i) as FormGroup;
      rowGroup.patchValue({
        date: today,
        shares: null,
        sharePrice: null,
        fees: 0,
      });
    }
  }
}

