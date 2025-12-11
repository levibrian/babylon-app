import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { RebalancingActionsCardData } from '../../../models/strategy.model';

/**
 * Reusable component for displaying rebalancing actions.
 * Shows top 5 buy/sell actions needed to rebalance the portfolio.
 */
@Component({
  selector: 'app-rebalancing-actions-card',
  standalone: true,
  imports: [CommonModule, CurrencyPipe],
  templateUrl: './rebalancing-actions-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RebalancingActionsCardComponent {
  /** Rebalancing actions data */
  data = input.required<RebalancingActionsCardData>();
  
  /** Event emitted when section info icon is hovered */
  sectionTooltipRequested = output<MouseEvent>();

  onSectionInfoHover(event: MouseEvent): void {
    this.sectionTooltipRequested.emit(event);
  }

  // Helper for template
  Math = Math;
}

