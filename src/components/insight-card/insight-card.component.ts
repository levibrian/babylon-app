import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PortfolioInsight } from '../../models/portfolio.model';

@Component({
  selector: 'app-insight-card',
  templateUrl: './insight-card.component.html',
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InsightCardComponent {
  insight = input.required<PortfolioInsight>();
  executeAction = output<PortfolioInsight>();

  getIconClass(): string {
    const severity = this.insight().severity;
    if (severity === 'Critical') {
      return 'text-rose-600';
    } else if (severity === 'Warning') {
      return 'text-amber-600';
    } else {
      return 'text-blue-600';
    }
  }

  getIconPath(): string {
    const type = this.insight().type;
    if (type === 'Rebalancing') {
      // Scale/balance icon
      return 'M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.224 48.224 0 0012 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52l2.62 10.726c.122.499-.106 1.028-.45 1.37l-1.1 1.1c-.323.323-.87.499-1.37.45L12 18.75m-6.75 0c-1.01-.143-2.01-.317-3-.52m3 .52l-2.62 10.726c-.122.499.106 1.028.45 1.37l1.1 1.1c.323.323.87.499 1.37.45L12 18.75';
    } else if (type === 'PerformanceMilestone') {
      // Trending up icon
      return 'M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941';
    } else {
      // Info/warning icon (default)
      return 'M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z';
    }
  }

  getTitle(): string {
    const type = this.insight().type;
    if (type === 'Rebalancing') {
      return 'Rebalancing Opportunity';
    } else if (type === 'PerformanceMilestone') {
      return 'Performance Milestone';
    } else if (type === 'DiversificationWarning') {
      return 'Diversification Alert';
    }
    return 'Portfolio Insight';
  }

  onActionClick(): void {
    this.executeAction.emit(this.insight());
  }

  getMaxValue(): number {
    const context = this.insight().visualContext;
    if (!context) return 100;
    return Math.max(context.now, context.target, context.after, 100);
  }

  getBarWidth(value: number): string {
    const max = this.getMaxValue();
    if (max === 0) return '0%';
    return `${(value / max) * 100}%`;
  }
}

