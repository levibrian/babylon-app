import { Component, ChangeDetectionStrategy, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-recurring-investments-list',
  templateUrl: './recurring-investments-list.component.html',
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecurringInvestmentsListComponent {
  navigateToTransactions = output<void>();
}

