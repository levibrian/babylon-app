import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  signal,
  computed,
  inject,
  effect,
} from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { PortfolioAnalyticsService } from '../../../services/portfolio-analytics.service';
import { ApiSmartRebalancingRecommendation } from '../../../models/api-response.model';

const USER_ID = 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d';

/**
 * Reusable Smart Rebalancing component.
 * Provides an expandable overlay for smart rebalancing recommendations.
 */
@Component({
  selector: 'app-smart-rebalancing',
  standalone: true,
  imports: [CommonModule, CurrencyPipe],
  templateUrl: './smart-rebalancing.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SmartRebalancingComponent {
  private analyticsService = inject(PortfolioAnalyticsService);

  /** User ID for fetching recommendations (optional, defaults to constant) */
  userId = input<string>(USER_ID);

  /** Whether the overlay is expanded */
  isExpanded = signal<boolean>(false);

  /** Investment amount in euros */
  investmentAmount = signal<number>(0);

  /** Maximum number of securities (optional) */
  maxSecurities = signal<number | null>(null);

  /** Smart rebalancing recommendations */
  smartRecommendations = signal<ApiSmartRebalancingRecommendation[]>([]);

  /** Loading state */
  smartRecommendationsLoading = signal<boolean>(false);

  /** Event emitted when the component is toggled */
  expandedChange = output<boolean>();

  /** Tooltip state */
  showTooltip = signal<boolean>(false);
  tooltipX = signal<number>(0);
  tooltipY = signal<number>(0);
  tooltipColor = signal<string>('transparent');

  /** Computed: Total investment amount for display */
  totalInvestmentAmount = computed(() => {
    return this.smartRecommendations().reduce(
      (sum, rec) => sum + (rec.recommendedBuyAmount || 0),
      0
    );
  });

  /** Computed: Whether recommendations are available */
  hasRecommendations = computed(() => {
    return (
      this.investmentAmount() > 0 &&
      this.smartRecommendations().length > 0 &&
      !this.smartRecommendationsLoading()
    );
  });

  constructor() {
    // Debounce API calls when investment amount or max securities changes
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    effect(() => {
      const amount = this.investmentAmount();
      const maxSec = this.maxSecurities();

      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }

      debounceTimer = setTimeout(() => {
        this.updateSmartRecommendations();
      }, 500);
    });
  }

  /**
   * Toggles the expanded state of the overlay
   */
  toggleExpanded(): void {
    this.isExpanded.update((current) => {
      const newValue = !current;
      this.expandedChange.emit(newValue);
      return newValue;
    });
  }

  /**
   * Updates smart recommendations based on current inputs
   */
  async updateSmartRecommendations(): Promise<void> {
    const amount = this.investmentAmount();
    const maxSec = this.maxSecurities();

    if (amount <= 0) {
      this.smartRecommendations.set([]);
      return;
    }

    this.smartRecommendationsLoading.set(true);
    try {
      const response = await this.analyticsService.getSmartRecommendations(
        {
          investmentAmount: amount,
          maxSecurities: maxSec || null,
          onlyBuyUnderweight: true,
        },
        this.userId()
      );

      if (response) {
        this.smartRecommendations.set(response.recommendations);
      } else {
        this.smartRecommendations.set([]);
      }
    } catch (err) {
      console.error('Error fetching smart recommendations:', err);
      this.smartRecommendations.set([]);
    } finally {
      this.smartRecommendationsLoading.set(false);
    }
  }

  /**
   * Handles investment amount input changes
   */
  onInvestmentAmountChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    const numValue = parseFloat(value) || 0;
    this.investmentAmount.set(numValue);
  }

  /**
   * Handles max securities input changes
   */
  onMaxSecuritiesChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    const numValue = value ? parseInt(value, 10) : null;
    this.maxSecurities.set(numValue && numValue > 0 ? numValue : null);
  }

  /**
   * Gets tooltip text for the info button
   */
  getInfoTooltipText(): string {
    const investmentAmount = this.investmentAmount();
    if (investmentAmount <= 0) {
      return 'Enter an amount to see smart rebalancing recommendations.';
    }

    const maxSec = this.maxSecurities();
    const maxSecText = maxSec ? `top ${maxSec} underweight assets` : 'underweight assets';
    return `Distribute ${new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(investmentAmount)} across ${maxSecText}.`;
  }

  /**
   * Shows info tooltip for header button
   */
  showInfoTooltip(event: MouseEvent): void {
    this.tooltipX.set(event.clientX);
    this.tooltipY.set(event.clientY);
    this.tooltipColor.set('transparent');
    this.showTooltip.set(true);
  }

  /**
   * Shows info tooltip for amount input button
   */
  showAmountInfoTooltip(event: MouseEvent): void {
    this.tooltipX.set(event.clientX);
    this.tooltipY.set(event.clientY);
    this.tooltipColor.set('transparent');
    this.showTooltip.set(true);
  }

  /**
   * Hides tooltip
   */
  hideInfoTooltip(): void {
    this.showTooltip.set(false);
  }

  // Helper for template
  Math = Math;
}

