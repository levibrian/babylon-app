import { Component, OnInit, inject, OnDestroy, ChangeDetectorRef, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, FormControl } from '@angular/forms';
import { AddSecuritySearchComponent } from '../add-security-search/add-security-search.component';
import { PlanningService } from '../../services/planning.service';
import { PortfolioService } from '../../services/portfolio.service';
import { Subject, Subscription, merge } from 'rxjs';
import { debounceTime, switchMap, tap } from 'rxjs/operators';
import { PlanningRow, AssetGroup, PlanningRowFormValue } from '../../models/planning.model';

@Component({
  selector: 'app-planning',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, AddSecuritySearchComponent],
  templateUrl: './planning.component.html',
  styleUrls: ['./planning.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlanningComponent implements OnInit, OnDestroy {
  private planningService = inject(PlanningService);
  private portfolioService = inject(PortfolioService);
  private cdr = inject(ChangeDetectorRef);
  private fb = inject(FormBuilder);
  
  planningForm!: FormGroup;
  groupedRows: AssetGroup[] = [];

  // Track save status per ticker: 'idle' | 'saving' | 'saved' | 'error'
  saveStatus = signal<Map<string, 'idle' | 'saving' | 'saved' | 'error'>>(new Map());

  private subscriptions = new Subscription();

  ngOnInit() {
    this.initializeForm();
    this.loadData();
    this.setupReactiveCalculations();
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  private initializeForm() {
    this.planningForm = this.fb.group({
      monthlyInvestment: [0],
      rows: this.fb.array([])
    });
  }

  get rowsArray(): FormArray {
    return this.planningForm.get('rows') as FormArray;
  }

  get monthlyInvestmentControl(): FormControl {
    return this.planningForm.get('monthlyInvestment') as FormControl;
  }

  private setupReactiveCalculations() {
    // Watch monthly investment changes
    this.subscriptions.add(
      this.monthlyInvestmentControl.valueChanges.pipe(
        tap(() => this.recalculateAll()),
        debounceTime(500),
        switchMap(amount => this.planningService.updateMonthlyInvestment(amount))
      ).subscribe({
        next: () => console.log('Monthly investment saved'),
        error: err => console.error('Error saving monthly investment', err)
      })
    );
  }

  private loadData() {
    this.planningService.getPlanningData().subscribe(data => {
      this.monthlyInvestmentControl.setValue(data.monthlyInvestment, { emitEvent: false });
      this.populateRows(data.rows);
      this.updateGroups();
      this.cdr.markForCheck();
    });
  }

  private populateRows(rows: PlanningRow[]) {
    this.rowsArray.clear();
    rows.forEach(row => {
      const rowGroup = this.createRowFormGroup(row);
      this.rowsArray.push(rowGroup);
      this.setupRowCalculations(rowGroup);
    });
  }

  private createRowFormGroup(row: PlanningRow): FormGroup {
    const monthlyInvestment = this.monthlyInvestmentControl.value || 0;
    const monthlyAlloc = monthlyInvestment * (row.targetPercentage / 100);
    
    return this.fb.group({
      ticker: [{ value: row.ticker, disabled: true }],
      securityName: [{ value: row.securityName || null, disabled: true }],
      assetType: [{ value: row.assetType, disabled: true }],
      targetPercentage: [row.targetPercentage],
      isWeeklyEnabled: [row.isWeeklyEnabled],
      isBiWeeklyEnabled: [row.isBiWeeklyEnabled],
      isMonthlyEnabled: [row.isMonthlyEnabled],
      weeklyEur: [{ value: row.isWeeklyEnabled ? monthlyAlloc / 4 : 0, disabled: true }],
      biWeeklyEur: [{ value: row.isBiWeeklyEnabled ? monthlyAlloc / 2 : 0, disabled: true }],
      monthlyEur: [{ value: row.isMonthlyEnabled ? monthlyAlloc : 0, disabled: true }]
    });
  }

  private setupRowCalculations(rowGroup: FormGroup) {
    const targetPercentage = rowGroup.get('targetPercentage')!;
    const isWeeklyEnabled = rowGroup.get('isWeeklyEnabled')!;
    const isBiWeeklyEnabled = rowGroup.get('isBiWeeklyEnabled')!;
    const isMonthlyEnabled = rowGroup.get('isMonthlyEnabled')!;

    // Watch target percentage changes
    this.subscriptions.add(
      targetPercentage.valueChanges.pipe(
        tap(() => this.recalculateRow(rowGroup)),
        debounceTime(500)
      ).subscribe(() => {
        this.saveAllocation(rowGroup);
      })
    );

    // Watch frequency toggle changes
    this.subscriptions.add(
      merge(
        isWeeklyEnabled.valueChanges,
        isBiWeeklyEnabled.valueChanges,
        isMonthlyEnabled.valueChanges
      ).pipe(
        tap(() => this.recalculateRow(rowGroup)),
        debounceTime(300)
      ).subscribe(() => {
        this.saveAllocation(rowGroup);
      })
    );
  }

  private recalculateRow(rowGroup: FormGroup) {
    const monthlyInvestment = this.monthlyInvestmentControl.value || 0;
    const targetPercentage = rowGroup.get('targetPercentage')!.value;
    const isWeeklyEnabled = rowGroup.get('isWeeklyEnabled')!.value;
    const isBiWeeklyEnabled = rowGroup.get('isBiWeeklyEnabled')!.value;
    const isMonthlyEnabled = rowGroup.get('isMonthlyEnabled')!.value;

    const monthlyAlloc = monthlyInvestment * (targetPercentage / 100);

    rowGroup.get('weeklyEur')!.setValue(isWeeklyEnabled ? monthlyAlloc / 4 : 0, { emitEvent: false });
    rowGroup.get('biWeeklyEur')!.setValue(isBiWeeklyEnabled ? monthlyAlloc / 2 : 0, { emitEvent: false });
    rowGroup.get('monthlyEur')!.setValue(isMonthlyEnabled ? monthlyAlloc : 0, { emitEvent: false });

    this.cdr.markForCheck();
  }

  private recalculateAll() {
    this.rowsArray.controls.forEach(control => {
      this.recalculateRow(control as FormGroup);
    });
  }

  private saveAllocation(rowGroup: FormGroup) {
    const ticker = rowGroup.get('ticker')!.value;
    const row: PlanningRow = {
      ticker,
      securityName: rowGroup.get('securityName')!.value,
      assetType: rowGroup.get('assetType')!.value,
      targetPercentage: rowGroup.get('targetPercentage')!.value,
      isWeeklyEnabled: rowGroup.get('isWeeklyEnabled')!.value,
      isBiWeeklyEnabled: rowGroup.get('isBiWeeklyEnabled')!.value,
      isMonthlyEnabled: rowGroup.get('isMonthlyEnabled')!.value,
      weeklyEur: rowGroup.get('weeklyEur')!.value,
      biWeeklyEur: rowGroup.get('biWeeklyEur')!.value,
      monthlyEur: rowGroup.get('monthlyEur')!.value
    };

    // Set status to 'saving'
    this.updateSaveStatus(ticker, 'saving');

    this.planningService.updateAllocation(row).subscribe({
      next: () => {
        // Set status to 'saved'
        this.updateSaveStatus(ticker, 'saved');
        
        // Trigger silent portfolio refresh to update allocation metrics
        this.portfolioService.reloadSilent();
        
        // Clear 'saved' status after 2 seconds
        setTimeout(() => {
          this.updateSaveStatus(ticker, 'idle');
        }, 2000);
      },
      error: err => {
        console.error('Error updating allocation', err);
        this.updateSaveStatus(ticker, 'error');
        
        // Clear 'error' status after 3 seconds
        setTimeout(() => {
          this.updateSaveStatus(ticker, 'idle');
        }, 3000);
      }
    });
  }

  private updateSaveStatus(ticker: string, status: 'idle' | 'saving' | 'saved' | 'error') {
    const newMap = new Map(this.saveStatus());
    newMap.set(ticker, status);
    this.saveStatus.set(newMap);
    this.cdr.markForCheck();
  }

  getSaveStatus(ticker: string): 'idle' | 'saving' | 'saved' | 'error' {
    return this.saveStatus().get(ticker) || 'idle';
  }

  addSecurity(ticker: string) {
    const existingRow = this.rowsArray.controls.find(control => 
      control.get('ticker')!.value === ticker
    );
    
    if (existingRow) {
      return; // Already exists
    }

    this.planningService.addSecurity(ticker).subscribe({
      next: () => {
        // Reload data to ensure grid is populated from backend with correct types
        this.loadData();
      },
      error: err => console.error('Error adding security', err)
    });
  }

  deleteSecurity(ticker: string, event: Event) {
    event.stopPropagation();
    if (!confirm(`Are you sure you want to remove ${ticker} from your plan?`)) {
      return;
    }

    this.planningService.deleteSecurity(ticker).subscribe({
      next: () => {
        this.loadData();
        // Show toast or notification if available
      },
      error: err => console.error('Error deleting security', err)
    });
  }

  toggleWeekly(rowGroup: FormGroup) {
    const control = rowGroup.get('isWeeklyEnabled')!;
    control.setValue(!control.value);
  }

  toggleBiWeekly(rowGroup: FormGroup) {
    const control = rowGroup.get('isBiWeeklyEnabled')!;
    control.setValue(!control.value);
  }

  toggleMonthly(rowGroup: FormGroup) {
    const control = rowGroup.get('isMonthlyEnabled')!;
    control.setValue(!control.value);
  }

  private updateGroups() {
    const rows = this.rowsArray.controls.map(control => {
      const formGroup = control as FormGroup;
      return {
        ticker: formGroup.get('ticker')!.value,
        securityName: formGroup.get('securityName')!.value,
        assetType: formGroup.get('assetType')!.value,
        targetPercentage: formGroup.get('targetPercentage')!.value,
        isWeeklyEnabled: formGroup.get('isWeeklyEnabled')!.value,
        isBiWeeklyEnabled: formGroup.get('isBiWeeklyEnabled')!.value,
        isMonthlyEnabled: formGroup.get('isMonthlyEnabled')!.value,
        weeklyEur: formGroup.get('weeklyEur')!.value,
        biWeeklyEur: formGroup.get('biWeeklyEur')!.value,
        monthlyEur: formGroup.get('monthlyEur')!.value
      } as PlanningRow;
    });

    const groups: { [key: string]: { row: PlanningRow, formGroup: FormGroup }[] } = {};
    
    rows.forEach((row, index) => {
      if (!groups[row.assetType]) {
        groups[row.assetType] = [];
      }
      groups[row.assetType].push({ 
        row, 
        formGroup: this.rowsArray.at(index) as FormGroup 
      });
    });

    this.groupedRows = Object.keys(groups).map(key => {
      // Sort by target percentage (descending)
      const sorted = groups[key].sort((a, b) => b.row.targetPercentage - a.row.targetPercentage);
      
      return {
        assetType: key,
        rows: sorted.map(item => item.row),
        rowFormGroups: sorted.map(item => item.formGroup),
        isExpanded: true
      } as AssetGroup & { rowFormGroups: FormGroup[] };
    });
  }

  toggleGroup(group: AssetGroup) {
    group.isExpanded = !group.isExpanded;
    this.cdr.markForCheck();
  }

  getSubtotal(group: AssetGroup): number {
    return group.rows.reduce((sum, row) => sum + row.targetPercentage, 0);
  }

  get grandTotal(): number {
    return this.rowsArray.controls.reduce((sum, control) => {
      return sum + (control.get('targetPercentage')!.value || 0);
    }, 0);
  }

  getRowFormGroup(row: PlanningRow): FormGroup | null {
    const index = this.rowsArray.controls.findIndex(control => 
      control.get('ticker')!.value === row.ticker
    );
    return index >= 0 ? this.rowsArray.at(index) as FormGroup : null;
  }
}
