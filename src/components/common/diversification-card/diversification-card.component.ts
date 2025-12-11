import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { DiversificationCardData } from '../../../models/strategy.model';

/**
 * Reusable component for displaying diversification metrics.
 * Shows diversification score, HHI, top 5 concentration, and total assets.
 */
@Component({
  selector: 'app-diversification-card',
  standalone: true,
  imports: [CommonModule, DecimalPipe],
  templateUrl: './diversification-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DiversificationCardComponent {
  /** Diversification metrics data */
  data = input.required<DiversificationCardData>();
  
  /** Event emitted when HHI info icon is hovered */
  hhiTooltipRequested = output<MouseEvent>();
  
  /** Event emitted when HHI info icon is left */
  hhiTooltipLeft = output<void>();
  
  /** Event emitted when diversification score info icon is hovered */
  scoreTooltipRequested = output<MouseEvent>();
  
  /** Event emitted when diversification score info icon is left */
  scoreTooltipLeft = output<void>();

  onHHIInfoHover(event: MouseEvent): void {
    this.hhiTooltipRequested.emit(event);
  }

  onHHIInfoLeave(): void {
    this.hhiTooltipLeft.emit();
  }

  onScoreInfoHover(event: MouseEvent): void {
    this.scoreTooltipRequested.emit(event);
  }

  onScoreInfoLeave(): void {
    this.scoreTooltipLeft.emit();
  }
}

