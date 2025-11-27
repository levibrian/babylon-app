import { Component, ChangeDetectionStrategy, input, inject, signal, computed, OnInit, effect } from '@angular/core';
import { CommonModule, CurrencyPipe, DecimalPipe } from '@angular/common';
import { PortfolioItem } from '../../models/portfolio.model';
import { AllocationService } from '../../services/allocation.service';
import { toast } from 'ngx-sonner';

interface StrategyItem {
  ticker: string;
  companyName: string;
  currentPercentage: number;
  targetPercentage: number;
  currentValue: number;
}

interface Recommendation {
  ticker: string;
  companyName: string;
  buyAmount: number;
  delta: number;
}

interface ChartSegment {
  ticker: string;
  companyName: string;
  currentPercentage: number;
  targetPercentage: number;
  color: string;
}

@Component({
  selector: 'app-strategy-panel',
  templateUrl: './strategy-panel.component.html',
  imports: [CommonModule, CurrencyPipe, DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block h-full overflow-hidden'
  },
})
export class StrategyPanelComponent implements OnInit {
  portfolio = input.required<PortfolioItem[]>();

  allocationService = inject(AllocationService);

  // Investment simulator
  investmentAmount = signal<number>(0);

  // Target editor - local state for inputs (to allow editing before saving)
  private targetInputs = signal<Map<string, number>>(new Map());

  // Computed: Merge portfolio with allocation strategy
  strategyItems = computed(() => {
    const portfolioItems = this.portfolio();
    const targetMap = this.allocationService.targetMap();
    const localInputs = this.targetInputs();

    return portfolioItems.map(item => {
      const tickerUpper = item.ticker.toUpperCase();
      // Use local input if exists, otherwise use service target, otherwise use item's target
      const targetPercentage = localInputs.has(tickerUpper)
        ? localInputs.get(tickerUpper)!
        : (targetMap.get(tickerUpper) ?? item.targetAllocationPercentage);

      return {
        ticker: item.ticker,
        companyName: item.companyName,
        currentPercentage: item.currentAllocationPercentage ?? 0,
        targetPercentage,
        currentValue: item.totalCost,
      } as StrategyItem;
    });
  });

  // Computed: Total target percentage
  totalTargetPercentage = computed(() => {
    return this.strategyItems().reduce((sum, item) => sum + item.targetPercentage, 0);
  });

  // Computed: Chart segments for visualization
  chartSegments = computed(() => {
    const items = this.strategyItems();
    const colors = [
      '#3B82F6', // Blue - Stocks
      '#F59E0B', // Yellow/Orange - Crypto
      '#10B981', // Green - ETFs
      '#8B5CF6', // Purple
      '#EC4899', // Pink
      '#06B6D4', // Cyan
      '#F97316', // Orange
      '#84CC16', // Lime
    ];

    return items
      .filter(item => item.currentPercentage > 0 || item.targetPercentage > 0)
      .map((item, index) => ({
        ticker: item.ticker,
        companyName: item.companyName,
        currentPercentage: item.currentPercentage,
        targetPercentage: item.targetPercentage,
        color: colors[index % colors.length],
      } as ChartSegment));
  });

  // Computed: Total portfolio value for center text
  totalPortfolioValue = computed(() => {
    return this.strategyItems().reduce((sum, item) => sum + item.currentValue, 0);
  });

  // Computed: Total current percentage
  totalCurrentPercentage = computed(() => {
    return this.chartSegments().reduce((sum, s) => sum + s.currentPercentage, 0);
  });

  // Computed: Top buy recommendations with proportional distribution
  topRecommendations = computed(() => {
    const items = this.strategyItems();
    const investment = this.investmentAmount();
    const currentTotalValue = items.reduce((sum, item) => sum + item.currentValue, 0);
    const futurePortfolioValue = currentTotalValue + investment;

    if (futurePortfolioValue <= 0 || investment <= 0) {
      return [];
    }

    // Step 1 & 2: Calculate ideal gaps (deficits) for each asset
    const deficits = items
      .map(item => {
        const idealValue = futurePortfolioValue * (item.targetPercentage / 100);
        const currentValue = item.currentValue;
        const rawDeficit = idealValue - currentValue;

        return {
          ticker: item.ticker,
          companyName: item.companyName,
          rawDeficit,
        };
      })
      .filter(d => d.rawDeficit > 0); // Only underweight assets

    if (deficits.length === 0) {
      return [];
    }

    // Step 3: Calculate total deficit
    const totalDeficit = deficits.reduce((sum, d) => sum + d.rawDeficit, 0);

    // Step 4: Determine scaling factor
    let scalingFactor = 1;
    if (totalDeficit === 0) {
      scalingFactor = 0;
    } else if (totalDeficit > investment) {
      scalingFactor = investment / totalDeficit;
    }

    // Step 5: Generate recommendations with proportional distribution
    const recommendations: Recommendation[] = deficits
      .map(d => ({
        ticker: d.ticker,
        companyName: d.companyName,
        buyAmount: d.rawDeficit * scalingFactor,
        delta: d.rawDeficit,
      }))
      .filter(rec => rec.buyAmount >= 1.0) // Filter tiny buys (< €1.00)
      .sort((a, b) => b.buyAmount - a.buyAmount); // Sort by amount descending

    return recommendations;
  });

  constructor() {
    // Sync local inputs with service targetMap when it changes
    effect(() => {
      const targetMap = this.allocationService.targetMap();
      if (targetMap.size > 0) {
        const newInputs = new Map<string, number>();
        targetMap.forEach((value, key) => {
          newInputs.set(key, value);
        });
        this.targetInputs.set(newInputs);
      }
    });
  }

  ngOnInit(): void {
    this.allocationService.loadStrategy();
  }

  onInvestmentAmountChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    const numValue = parseFloat(value) || 0;
    this.investmentAmount.set(numValue);
  }

  onTargetInputChange(ticker: string, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue < 0) {
      return;
    }

    const tickerUpper = ticker.toUpperCase();
    const currentInputs = this.targetInputs();
    const newInputs = new Map(currentInputs);
    newInputs.set(tickerUpper, numValue);
    this.targetInputs.set(newInputs);
  }

  async onTargetBlur(ticker: string): Promise<void> {
    const tickerUpper = ticker.toUpperCase();
    const localInputs = this.targetInputs();
    const newPercentage = localInputs.get(tickerUpper);

    if (newPercentage === undefined) {
      return;
    }

    try {
      await this.allocationService.updateTarget(undefined, ticker, newPercentage);
      toast.success(`Updated target allocation for ${tickerUpper}`);
    } catch (err) {
      console.error('Error updating target:', err);
      toast.error(`Failed to update target allocation for ${tickerUpper}`);
      // Revert local input on error
      const targetMap = this.allocationService.targetMap();
      const serviceValue = targetMap.get(tickerUpper);
      if (serviceValue !== undefined) {
        const revertedInputs = new Map(this.targetInputs());
        revertedInputs.set(tickerUpper, serviceValue);
        this.targetInputs.set(revertedInputs);
      }
    }
  }

  onTargetEnter(event: KeyboardEvent, ticker: string): void {
    if (event.key === 'Enter') {
      (event.target as HTMLInputElement).blur();
    }
  }

  getTotalTargetClass(): string {
    const total = this.totalTargetPercentage();
    if (total > 100) {
      return 'text-red-600 font-bold';
    }
    return 'text-gray-600';
  }

  // Helper to format tooltip text
  getSegmentTooltip(ticker: string, percentage: number): string {
    return `${ticker}: ${percentage.toFixed(2)}%`;
  }

  // Custom tooltip state
  activeTooltip = signal<{ x: number; y: number; text: string; color: string } | null>(null);

  // Show tooltip on mouse move
  showTooltip(event: MouseEvent, text: string, color: string): void {
    this.activeTooltip.set({
      x: event.clientX,
      y: event.clientY,
      text,
      color,
    });
  }

  // Hide tooltip on mouse leave
  hideTooltip(): void {
    this.activeTooltip.set(null);
  }

  // Helper to get segments for current bar
  getCurrentBarSegments(): Array<{ color: string; width: number; ticker: string; percentage: number }> {
    const segments = this.chartSegments();
    const total = segments.reduce((sum, s) => sum + s.currentPercentage, 0);
    if (total === 0) return [];
    
    return segments
      .filter(s => s.currentPercentage > 0)
      .map(s => ({
        color: s.color,
        width: (s.currentPercentage / total) * 100,
        ticker: s.ticker,
        percentage: s.currentPercentage,
      }));
  }

  // Helper to get segments for target bar
  getTargetBarSegments(): Array<{ color: string; width: number; ticker: string; percentage: number }> {
    const segments = this.chartSegments();
    const total = segments.reduce((sum, s) => sum + s.targetPercentage, 0);
    if (total === 0) return [];
    
    return segments
      .filter(s => s.targetPercentage > 0)
      .map(s => ({
        color: s.color,
        width: (s.targetPercentage / total) * 100,
        ticker: s.ticker,
        percentage: s.targetPercentage,
      }));
  }
}

