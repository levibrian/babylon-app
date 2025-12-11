import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { RiskCardData } from '../../../models/strategy.model';

/**
 * Reusable component for displaying risk profile metrics.
 * Shows risk level, beta, volatility, and Sharpe ratio with contextual labels.
 */
@Component({
  selector: 'app-risk-profile-card',
  standalone: true,
  imports: [CommonModule, DecimalPipe],
  templateUrl: './risk-profile-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RiskProfileCardComponent {
  /** Risk metrics data */
  data = input.required<RiskCardData>();
  
  /** Event emitted when Beta info icon is hovered */
  betaTooltipRequested = output<MouseEvent>();
  
  /** Event emitted when Beta info icon is left */
  betaTooltipLeft = output<void>();
  
  /** Event emitted when Sharpe Ratio info icon is hovered */
  sharpeTooltipRequested = output<MouseEvent>();
  
  /** Event emitted when Sharpe Ratio info icon is left */
  sharpeTooltipLeft = output<void>();
  
  /** Event emitted when Risk Profile section info icon is hovered */
  sectionTooltipRequested = output<MouseEvent>();
  
  /** Event emitted when Risk Profile section info icon is left */
  sectionTooltipLeft = output<void>();

  onBetaInfoHover(event: MouseEvent): void {
    this.betaTooltipRequested.emit(event);
  }

  onBetaInfoLeave(): void {
    this.betaTooltipLeft.emit();
  }

  onSharpeInfoHover(event: MouseEvent): void {
    this.sharpeTooltipRequested.emit(event);
  }

  onSharpeInfoLeave(): void {
    this.sharpeTooltipLeft.emit();
  }

  onSectionInfoHover(event: MouseEvent): void {
    this.sectionTooltipRequested.emit(event);
  }

  onSectionInfoLeave(): void {
    this.sectionTooltipLeft.emit();
  }
}

