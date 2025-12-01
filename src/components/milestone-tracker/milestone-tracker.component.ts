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
    return nextIndex > 0 ? this.milestones[nextIndex - 1] : 0;
  });

  // Calculate progress percentage
  progressPercentage = computed(() => {
    const current = this.currentValue();
    const prev = this.previousMilestone();
    const next = this.nextMilestone();
    
    if (next === prev) return 100;
    if (current <= prev) return 0;
    if (current >= next) return 100;
    
    return ((current - prev) / (next - prev)) * 100;
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

  // Get current value position on the bar (as percentage)
  currentValuePosition = computed(() => {
    const current = this.currentValue();
    const prev = this.previousMilestone();
    const next = this.nextMilestone();
    
    if (next === prev) return 100;
    if (current <= prev) return 0;
    if (current >= next) return 100;
    
    return ((current - prev) / (next - prev)) * 100;
  });
}

