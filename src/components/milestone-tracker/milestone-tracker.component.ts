import { Component, ChangeDetectionStrategy, input, computed } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';

@Component({
  selector: 'app-milestone-tracker',
  templateUrl: './milestone-tracker.component.html',
  imports: [CommonModule, CurrencyPipe, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MilestoneTrackerComponent {
  currentValue = input.required<number>();
  monthlyContribution = input<number>(0);

  // Milestone thresholds
  private readonly milestones = [0, 1000, 5000, 10000, 25000, 50000, 100000, 250000, 500000, 1000000];

  // Find the next milestone
  nextMilestone = computed(() => {
    const current = this.currentValue();
    return this.milestones.find(m => m > current) || this.milestones[this.milestones.length - 1];
  });

  // Find the previous milestone
  previousMilestone = computed(() => {
    const current = this.currentValue();
    const next = this.nextMilestone();
    const nextIndex = this.milestones.indexOf(next);
    
    // If we're at the first milestone or before it, previous is 0
    if (nextIndex <= 0) return 0;
    
    // Find the highest milestone that is <= current value
    // This ensures we use the correct starting point for progress calculation
    for (let i = nextIndex - 1; i >= 0; i--) {
      if (this.milestones[i] <= current) {
        return this.milestones[i];
      }
    }
    
    return 0;
  });

  // Calculate progress percentage (from 0 to next milestone)
  progressPercentage = computed(() => {
    const current = this.currentValue();
    const next = this.nextMilestone();
    
    if (next === 0) return 100;
    if (current <= 0) return 0;
    if (current >= next) return 100;
    
    const progress = (current / next) * 100;
    return Math.max(0, Math.min(100, progress)); // Clamp between 0 and 100
  });

  // Calculate months to reach next milestone
  monthsToGo = computed(() => {
    const monthly = this.monthlyContribution();
    if (monthly <= 0) return null;
    
    const current = this.currentValue();
    const next = this.nextMilestone();
    const remaining = next - current;
    
    if (remaining <= 0) return 0;
    
    return Math.ceil(remaining / monthly);
  });

  // Calculate projected date
  projectedDate = computed(() => {
    const months = this.monthsToGo();
    if (months === null || months === 0) return null;
    
    const date = new Date();
    date.setMonth(date.getMonth() + months);
    return date;
  });

  // Get current value position on the bar (as percentage from 0 to next milestone)
  currentValuePosition = computed(() => {
    const current = this.currentValue();
    const next = this.nextMilestone();
    
    if (next === 0) return 100;
    if (current <= 0) return 0;
    if (current >= next) return 100;
    
    return (current / next) * 100;
  });
}

