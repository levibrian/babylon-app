import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-portfolio-summary-skeleton',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="mb-8 p-6 bg-white rounded-lg shadow-sm">
      <div class="h-4 bg-gray-200 rounded w-40 mb-4 animate-pulse"></div>
      <div class="flex items-baseline gap-x-3 flex-wrap">
        <div class="h-10 bg-gray-200 rounded w-48 animate-pulse"></div>
        <div class="h-6 bg-gray-200 rounded w-32 animate-pulse"></div>
      </div>
      <div class="mt-4 min-h-[60px] flex flex-col justify-center items-center">
        <div class="h-4 bg-gray-200 rounded w-64 animate-pulse"></div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PortfolioSummarySkeletonComponent {}

