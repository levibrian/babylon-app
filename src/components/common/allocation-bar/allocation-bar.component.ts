import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { BarSegment } from '../../../models/strategy.model';

/**
 * Reusable component for displaying allocation bars (Current, Target, or Delta).
 * Displays a horizontal bar chart with segments representing different allocations.
 */
@Component({
  selector: 'app-allocation-bar',
  standalone: true,
  imports: [CommonModule, DecimalPipe],
  templateUrl: './allocation-bar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AllocationBarComponent {
  /** Bar segments to display */
  segments = input.required<BarSegment[]>();
  
  /** Total percentage for display */
  totalPercentage = input.required<number>();
  
  /** Label for the bar (e.g., "Current", "Target", "Delta") */
  label = input.required<string>();
  
  /** Whether to show border (typically for Target bar) */
  showBorder = input<boolean>(false);
  
  /** Event emitted when a segment is hovered */
  segmentHovered = output<{ event: MouseEvent; segment: BarSegment; tooltip: string }>();
  
  /** Event emitted when mouse leaves a segment */
  segmentLeft = output<void>();

  onSegmentHover(event: MouseEvent, segment: BarSegment): void {
    // Format using Intl.NumberFormat instead of injecting pipes
    const formattedValue = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(segment.value);
    const formattedPercentage = segment.percentage.toFixed(2);
    const tooltip = `${segment.ticker}: ${formattedPercentage}% (${formattedValue})`;
    this.segmentHovered.emit({ event, segment, tooltip });
  }

  onSegmentLeave(): void {
    this.segmentLeft.emit();
  }
}

