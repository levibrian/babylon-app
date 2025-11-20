import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-total-invested-skeleton',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="mb-8 p-6 bg-white rounded-lg shadow-sm">
      <div class="h-4 bg-gray-200 rounded w-40 mb-4 animate-pulse"></div>
      <div class="h-10 bg-gray-200 rounded w-48 animate-pulse"></div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TotalInvestedSkeletonComponent {}

