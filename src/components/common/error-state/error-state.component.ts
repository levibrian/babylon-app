import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-error-state',
  templateUrl: './error-state.component.html',
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ErrorStateComponent {
  title = input<string>('Unable to load data');
  message = input<string>('We couldn\'t connect to Alfred. Please check your connection.');

  retry = output<void>();

  onRetry(): void {
    this.retry.emit();
  }
}

