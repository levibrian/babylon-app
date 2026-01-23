import {
  Component,
  ChangeDetectionStrategy,
  signal,
  computed,
  inject,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { CommonModule, CurrencyPipe, DecimalPipe } from '@angular/common';
import { PortfolioAnalyticsService } from '../../../services/portfolio-analytics.service';
import {
  TimedRebalancingActionsResponse,
  TimedRebalancingAction,
  TimedRebalancingHelpers,
} from '../../../models/timed-rebalancing.model';

/**
 * Minimalist Rebalancing Actions Widget
 * 
 * Displays buy/sell recommendations in a carousel format,
 * similar to the insights component.
 */
@Component({
  selector: 'app-rebalancing-widget',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, DecimalPipe],
  templateUrl: './rebalancing-widget.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RebalancingWidgetComponent implements OnInit, OnDestroy {
  private analyticsService = inject(PortfolioAnalyticsService);

  // State
  loading = signal<boolean>(false);
  error = signal<string | null>(null);
  data = signal<TimedRebalancingActionsResponse | null>(null);

  // Carousel state
  currentActionIndex = signal(0);
  private carouselTimeout: ReturnType<typeof setTimeout> | undefined;
  private readonly CAROUSEL_INTERVAL = 5000; // 5 seconds per action

  /** All actions sorted by priority */
  allActions = computed<TimedRebalancingAction[]>(() => {
    const response = this.data();
    if (!response) return [];
    return TimedRebalancingHelpers.getAllActionsSortedByPriority(response);
  });

  /** Current action to display */
  currentAction = computed<TimedRebalancingAction | null>(() => {
    const actions = this.allActions();
    const index = this.currentActionIndex();
    return actions.length > 0 ? actions[index] : null;
  });

  /** Has any actions to display */
  hasActions = computed<boolean>(() => {
    return this.allActions().length > 0;
  });

  /** Total count of actions */
  actionCount = computed<number>(() => {
    return this.allActions().length;
  });

  ngOnInit(): void {
    this.fetchData();
  }

  ngOnDestroy(): void {
    this.stopCarousel();
  }

  /**
   * Fetches timed rebalancing actions from the API
   */
  async fetchData(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const response = await this.analyticsService.getTimedRebalancingActions({
        maxActions: 10,
        useAi: false,
      });

      if (response) {
        this.data.set(response);
        this.currentActionIndex.set(0);
        this.restartCarousel();
      } else {
        this.error.set('Failed to load recommendations');
      }
    } catch (err) {
      console.error('Error fetching timed rebalancing actions:', err);
      this.error.set('An error occurred');
    } finally {
      this.loading.set(false);
    }
  }

  /** Navigate to specific action */
  goToAction(index: number): void {
    this.currentActionIndex.set(index);
    this.restartCarousel();
  }

  /** Navigate to next action */
  nextAction(): void {
    const actions = this.allActions();
    if (actions.length === 0) return;
    this.currentActionIndex.update(i => (i + 1) % actions.length);
    this.restartCarousel();
  }

  /** Navigate to previous action */
  prevAction(): void {
    const actions = this.allActions();
    if (actions.length === 0) return;
    this.currentActionIndex.update(i => (i - 1 + actions.length) % actions.length);
    this.restartCarousel();
  }

  private restartCarousel(): void {
    this.stopCarousel();
    const actions = this.allActions();
    if (actions.length > 1) {
      this.scheduleNextAction();
    }
  }

  private scheduleNextAction(): void {
    this.carouselTimeout = setTimeout(() => {
      const actions = this.allActions();
      this.currentActionIndex.update(i => (i + 1) % (actions.length || 1));
      this.scheduleNextAction();
    }, this.CAROUSEL_INTERVAL);
  }

  private stopCarousel(): void {
    if (this.carouselTimeout) {
      clearTimeout(this.carouselTimeout);
      this.carouselTimeout = undefined;
    }
  }

  /** Get timing label */
  getTimingLabel(percentile: number | null): string {
    return TimedRebalancingHelpers.getTimingLabel(percentile);
  }

  /** Get timing color class */
  getTimingColorClass(percentile: number | null): string {
    if (percentile === null) return 'text-gray-500';
    if (percentile <= 20) return 'text-emerald-600';
    if (percentile >= 80) return 'text-rose-600';
    return 'text-amber-600';
  }

  /** Get action type color class */
  getActionColorClass(action: TimedRebalancingAction): string {
    return action.actionType === 'Buy' ? 'text-emerald-600' : 'text-rose-600';
  }

  /** Get action icon color class */
  getActionIconClass(action: TimedRebalancingAction): string {
    return action.actionType === 'Buy' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600';
  }
}
