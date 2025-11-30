import { Component, ChangeDetectionStrategy, ChangeDetectorRef, output, OnInit, inject, signal, computed, ViewChild, ElementRef, AfterViewInit, effect, Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { RecurringScheduleService } from '../../services/recurring-schedule.service';
import { TransactionService } from '../../services/transaction.service';
import { SecurityService } from '../../services/security.service';
import { RecurringSchedule, CreateRecurringScheduleRequest } from '../../models/recurring-schedule.model';
import { Security } from '../../models/security.model';
import { NewTransactionData } from '../../models/transaction.model';
import { toast } from 'ngx-sonner';
import { SelectOnFocusDirective } from '../../directives/select-on-focus.directive';


@Component({
  selector: 'app-recurring-investments-list',
  templateUrl: './recurring-investments-list.component.html',
  imports: [CommonModule, ReactiveFormsModule, CurrencyPipe, SelectOnFocusDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecurringInvestmentsListComponent implements OnInit, AfterViewInit {
  navigateToTransactions = output<void>();

  @ViewChild('tickerInput', { static: false }) tickerInputRef!: ElementRef<HTMLInputElement>;

  private recurringScheduleService = inject(RecurringScheduleService);
  private transactionService = inject(TransactionService);
  private securityService = inject(SecurityService);
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

  // Add mode toggle for progressive disclosure
  isAddMode = signal(false);

  // FormArray to manage grid inputs - each FormGroup represents a schedule row
  gridForm: FormGroup;
  get rowsFormArray(): FormArray {
    return this.gridForm.get('rows') as FormArray;
  }

  filteredSecurities = computed(() => {
    const value = this.tickerInputValue();
    if (!value || value.trim().length === 0) {
      return [];
    }
    return this.securityService.filterSecurities(value);
  });

  // Filtered schedules - returns all schedules if searchQuery is empty/null
  filteredSchedules = computed(() => {
    const query = this.searchQuery();
    const allSchedules = this.schedules();
    
    // If search query is empty or null, return all schedules
    if (!query || query.trim().length === 0) {
      return allSchedules;
    }
    
    // Filter schedules by ticker or security name (case-insensitive)
    const searchTerm = query.toLowerCase().trim();
    return allSchedules.filter(schedule =>
      schedule.ticker.toLowerCase().includes(searchTerm) ||
      schedule.securityName.toLowerCase().includes(searchTerm)
    );
  });

  // Computed totals for each row
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

  // Check if row has valid data
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
    // Always reload schedules when component initializes
    this.recurringScheduleService.loadSchedules().then(() => {
      // Force change detection after schedules load
      this.cdr.markForCheck();
    });

    // Subscribe to ticker input changes for autocomplete
    this.addNewForm.get('ticker')?.valueChanges.subscribe(value => {
      this.tickerInputValue.set(value || '');
      const filtered = this.filteredSecurities();
      this.showDropdown.set(value && value.length > 0 && filtered.length > 0);
      this.selectedIndex.set(-1);
    });
  }

  ngAfterViewInit(): void {
    // Force focus on ticker input immediately when component loads
    // This triggers change detection and ensures the grid displays
    setTimeout(() => {
      if (this.tickerInputRef?.nativeElement) {
        this.tickerInputRef.nativeElement.focus();
        // Trigger change detection after focus
        this.cdr.markForCheck();
      }
    }, 0);
    
    // Also trigger change detection after a short delay to ensure schedules are displayed
    setTimeout(() => {
      this.cdr.markForCheck();
    }, 100);
  }

  // Autocomplete methods
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
      
      // Reset form
      this.addNewForm.reset({ ticker: '' });
      this.tickerInputValue.set('');
      
      // Close add mode after successful addition
      this.isAddMode.set(false);

      toast.success('Asset added to recurring investments');
    } catch (err) {
      console.error('Error adding schedule:', err);
      toast.error('Could not add asset. Please try again.');
    }
  }

  async deleteSchedule(id: string): Promise<void> {
    try {
      await this.recurringScheduleService.deleteSchedule(id);
      toast.success('Asset removed from recurring investments');
    } catch (err) {
      console.error('Error deleting schedule:', err);
      toast.error('Could not remove asset. Please try again.');
    }
  }

  toggleAddMode(): void {
    this.isAddMode.update(mode => !mode);
    if (this.isAddMode()) {
      // Focus ticker input when opening add mode
      setTimeout(() => {
        if (this.tickerInputRef?.nativeElement) {
          this.tickerInputRef.nativeElement.focus();
        }
      }, 0);
    } else {
      // Reset form when closing
      this.addNewForm.reset({ ticker: '' });
      this.tickerInputValue.set('');
      this.showDropdown.set(false);
    }
  }

  closeAddMode(): void {
    this.isAddMode.set(false);
    this.addNewForm.reset({ ticker: '' });
    this.tickerInputValue.set('');
    this.showDropdown.set(false);
  }

  // Get row FormGroup by schedule ID
  getRowFormGroup(scheduleId: string): FormGroup | null {
    for (let i = 0; i < this.rowsFormArray.length; i++) {
      const rowGroup = this.rowsFormArray.at(i) as FormGroup;
      if (rowGroup.get('scheduleId')?.value === scheduleId) {
        return rowGroup;
      }
    }
    return null;
  }

  // Get row FormGroup by index
  getRowFormGroupByIndex(index: number): FormGroup {
    return this.rowsFormArray.at(index) as FormGroup;
  }

  // Get schedule for a row by index
  getScheduleForRow(index: number): RecurringSchedule | null {
    const rowGroup = this.rowsFormArray.at(index) as FormGroup;
    if (!rowGroup) return null;
    
    const scheduleId = rowGroup.get('scheduleId')?.value;
    if (!scheduleId) return null;
    
    return this.schedules().find(s => s.id === scheduleId) || null;
  }

  // Avatar helper
  getAvatarClass(ticker: string): string {
    const colors = [
      'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500',
      'bg-indigo-500', 'bg-yellow-500', 'bg-red-500', 'bg-teal-500'
    ];
    const hash = ticker.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  }

  async executeTransactions(): Promise<void> {
    const validRowIndices = this.validRows();
    
    if (validRowIndices.length === 0) {
      toast.error('Please fill in at least one row with shares and price');
      return;
    }

    const schedules = this.schedules();
    const transactions: NewTransactionData[] = [];

    // Map valid rows to transaction data
    for (const index of validRowIndices) {
      const rowGroup = this.rowsFormArray.at(index) as FormGroup;
      const scheduleId = rowGroup.get('scheduleId')?.value;
      const schedule = schedules.find(s => s.id === scheduleId);
      
      if (!schedule) continue;

      const shares = rowGroup.get('shares')?.value;
      const sharePrice = rowGroup.get('sharePrice')?.value;
      const fees = rowGroup.get('fees')?.value || 0;
      const date = rowGroup.get('date')?.value || new Date().toISOString().substring(0, 10);
      
      // Double-check validation (should already be validated by validRows)
      if (!shares || !sharePrice || shares <= 0 || sharePrice <= 0) {
        continue;
      }

      // Calculate totalAmount for buy transactions: (shares * price) + fees
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

    if (transactions.length === 0) {
      toast.error('No valid transactions to log');
      return;
    }

    try {
      // Create transactions sequentially to avoid overwhelming the API
      // Note: TransactionService doesn't have a bulk method, so we call addTransaction for each
      for (const transaction of transactions) {
        await this.transactionService.addTransaction(transaction);
      }

      // Reset form inputs but keep rows
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

      toast.success(`Successfully logged ${transactions.length} transaction${transactions.length > 1 ? 's' : ''}`);
    } catch (err) {
      console.error('Error executing transactions:', err);
      toast.error('Could not log all transactions. Please try again.');
    }
  }
}
