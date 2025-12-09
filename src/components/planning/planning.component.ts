import { Component, OnInit, inject, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AddSecuritySearchComponent } from '../add-security-search/add-security-search.component';
import { PlanningService } from '../../services/planning.service';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, switchMap, filter } from 'rxjs/operators';
import { PlanningRow, AssetGroup } from '../../models/planning.model';

@Component({
  selector: 'app-planning',
  standalone: true,
  imports: [CommonModule, FormsModule, AddSecuritySearchComponent],
  templateUrl: './planning.component.html',
  styleUrls: ['./planning.component.scss']
})
export class PlanningComponent implements OnInit, OnDestroy {
  private planningService = inject(PlanningService);
  private cdr = inject(ChangeDetectorRef);
  
  monthlyInvestment: number = 0;
  rows: PlanningRow[] = [];
  groupedRows: AssetGroup[] = [];

  private monthlyInvestmentSubject = new Subject<number>();
  private subscriptions = new Subscription();

  constructor() {
    // Setup debounced save for monthly investment
    this.subscriptions.add(
      this.monthlyInvestmentSubject.pipe(
        debounceTime(500),
        switchMap(amount => this.planningService.updateMonthlyInvestment(amount))
      ).subscribe(
        () => console.log('Monthly investment saved'),
        err => console.error('Error saving monthly investment', err)
      )
    );
  }

  ngOnInit() {
    this.loadData();
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  loadData() {
    this.planningService.getPlanningData().subscribe(data => {
      this.monthlyInvestment = data.monthlyInvestment;
      this.rows = data.rows;
      this.updateGroups();
      this.recalculate();
      this.cdr.detectChanges();
    });
  }

  onMonthlyInvestmentChange(amount: number) {
    this.monthlyInvestment = amount;
    this.recalculate();
    this.monthlyInvestmentSubject.next(amount);
  }

  updateAllocation(row: PlanningRow) {
    this.recalculate();
    this.planningService.updateAllocation(row).subscribe(
      () => {}, // Success
      err => console.error('Error updating allocation', err)
    );
  }

  addSecurity(ticker: string) {
    if (this.rows.some(r => r.ticker === ticker)) {
      return; // Already exists
    }

    this.planningService.addSecurity(ticker).subscribe({
      next: () => {
        // Reload data to ensure grid is populated from backend Securities list with correct types
        this.loadData();
      },
      error: err => console.error('Error adding security', err)
    });
  }

  recalculate() {
    this.rows.forEach(row => {
      const monthlyAlloc = this.monthlyInvestment * (row.targetPercentage / 100);
      row.monthlyEur = monthlyAlloc;
      row.biWeeklyEur = monthlyAlloc / 2;
      row.weeklyEur = monthlyAlloc / 4;
    });
  }

  toggleWeekly(row: PlanningRow) {
    row.isWeeklyEnabled = !row.isWeeklyEnabled;
    this.updateAllocation(row);
  }

  toggleBiWeekly(row: PlanningRow) {
    row.isBiWeeklyEnabled = !row.isBiWeeklyEnabled;
    this.updateAllocation(row);
  }

  toggleMonthly(row: PlanningRow) {
    row.isMonthlyEnabled = !row.isMonthlyEnabled;
    this.updateAllocation(row);
  }

  private updateGroups() {
    const groups: { [key: string]: PlanningRow[] } = {};
    
    this.rows.forEach(row => {
      if (!groups[row.assetType]) {
        groups[row.assetType] = [];
      }
      groups[row.assetType].push(row);
    });

    this.groupedRows = Object.keys(groups).map(key => {
      // Sort rows by target percentage (descending)
      const sortedRows = groups[key].sort((a, b) => b.targetPercentage - a.targetPercentage);
      
      return {
        assetType: key,
        rows: sortedRows,
        isExpanded: true // Default expanded
      };
    });
  }

  toggleGroup(group: AssetGroup) {
    group.isExpanded = !group.isExpanded;
  }

  getSubtotal(group: AssetGroup): number {
    return group.rows.reduce((sum, row) => sum + row.targetPercentage, 0);
  }

  get grandTotal(): number {
    return this.rows.reduce((sum, row) => sum + row.targetPercentage, 0);
  }
}
