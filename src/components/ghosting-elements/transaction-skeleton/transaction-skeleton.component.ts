import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-transaction-skeleton',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-white shadow-sm rounded-lg overflow-hidden">
      <ul class="divide-y divide-gray-200">
        @for (item of [1, 2, 3, 4, 5]; track $index) {
          <li class="p-3 sm:p-4">
            <div class="flex items-center justify-between gap-3">
              <!-- Left side skeleton -->
              <div class="flex items-center gap-3 min-w-0">
                <div class="flex-shrink-0">
                  <div class="w-10 h-10 rounded-full bg-gray-200 animate-pulse"></div>
                </div>
                <div class="min-w-0">
                  <div class="h-5 bg-gray-200 rounded w-40 mb-2 animate-pulse"></div>
                  <div class="flex items-baseline gap-x-2">
                    <div class="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
                    <div class="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
                  </div>
                </div>
              </div>
              
              <!-- Right side skeleton -->
              <div class="flex items-center gap-2">
                <div class="hidden sm:block h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                <div class="flex items-center gap-2">
                  <div class="h-6 bg-gray-200 rounded-full w-16 animate-pulse"></div>
                  <div class="h-5 bg-gray-200 rounded w-20 animate-pulse"></div>
                </div>
              </div>
            </div>
          </li>
        }
      </ul>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransactionSkeletonComponent {}

