import {
  Component,
  ChangeDetectionStrategy,
  input,
  inject,
  signal,
  computed,
  OnInit,
  effect,
} from '@angular/core';
import { CommonModule, CurrencyPipe, DecimalPipe } from '@angular/common';
import { PortfolioItem } from '../../models/portfolio.model';
import { AllocationService } from '../../services/allocation.service';
import { SecurityType } from '../../models/security.model';
import { toast } from "ngx-sonner";
import { SelectOnFocusDirective } from '../../directives/select-on-focus.directive';

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
  selector: "app-strategy-panel",
  templateUrl: "./strategy-panel.component.html",
  imports: [CommonModule, CurrencyPipe, DecimalPipe, SelectOnFocusDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: "block h-full overflow-hidden",
  },
})
export class StrategyPanelComponent implements OnInit {
  portfolio = input.required<PortfolioItem[]>();

  allocationService = inject(AllocationService);

  // View mode toggle: 'assets' | 'types'
  viewMode = signal<"assets" | "types">("assets");

  // Investment simulator
  investmentAmount = signal<number>(0);

  // Target editor - local state for inputs (to allow editing before saving)
  private targetInputs = signal<Map<string, number>>(new Map());

  // Computed: Merge portfolio with allocation strategy
  strategyItems = computed(() => {
    const portfolioItems = this.portfolio();
    const targetMap = this.allocationService.targetMap();
    const localInputs = this.targetInputs();

    return portfolioItems.map((item) => {
      const tickerUpper = item.ticker.toUpperCase();
      // Use local input if exists, otherwise use service target, otherwise use item's target
      const targetPercentage = localInputs.has(tickerUpper)
        ? localInputs.get(tickerUpper)!
        : targetMap.get(tickerUpper) ?? item.targetAllocationPercentage;

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
    return this.strategyItems().reduce(
      (sum, item) => sum + item.targetPercentage,
      0
    );
  });

  // Helper to get security type name (handles both enum values and strings)
  private getSecurityTypeName(type: SecurityType | string | undefined): string {
    if (type === undefined || type === null) return "Stock";

    // Handle string values (e.g., "ETF", "Stock")
    if (typeof type === "string") {
      const validNames = Object.keys(SecurityType).filter((key) =>
        isNaN(Number(key))
      );
      if (validNames.includes(type)) {
        return type === "MutualFund" ? "Mutual Fund" : type;
      }
    }

    // Handle numeric enum values
    if (typeof type === "number") {
      const typeNames: Record<SecurityType, string> = {
        [SecurityType.Stock]: "Stock",
        [SecurityType.ETF]: "ETF",
        [SecurityType.MutualFund]: "Mutual Fund",
        [SecurityType.Bond]: "Bond",
        [SecurityType.Crypto]: "Crypto",
        [SecurityType.REIT]: "REIT",
        [SecurityType.Options]: "Options",
        [SecurityType.Commodity]: "Commodity",
      };
      return typeNames[type as SecurityType] || "Stock";
    }

    return "Stock";
  }

  // Helper to get security type from portfolio item (with fallbacks)
  private getSecurityTypeForItem(
    ticker: string
  ): SecurityType | string | undefined {
    const portfolioItem = this.portfolio().find(
      (p) => p.ticker.toUpperCase() === ticker.toUpperCase()
    );

    // Try to get from item's securityType
    if (
      portfolioItem?.securityType !== undefined &&
      portfolioItem.securityType !== null
    ) {
      return portfolioItem.securityType;
    }

    // Fallback: try to get from first transaction
    if (portfolioItem?.transactions && portfolioItem.transactions.length > 0) {
      const txType = portfolioItem.transactions[0].securityType;
      if (txType !== undefined && txType !== null) {
        return txType;
      }
    }

    return undefined;
  }

  // Computed: Chart segments for visualization (grouped by type or individual assets)
  chartSegments = computed(() => {
    const items = this.strategyItems();
    const mode = this.viewMode();
    const colors = [
      "#3B82F6", // Blue - Stocks
      "#F59E0B", // Yellow/Orange - Crypto
      "#10B981", // Green - ETFs
      "#8B5CF6", // Purple
      "#EC4899", // Pink
      "#06B6D4", // Cyan
      "#F97316", // Orange
      "#84CC16", // Lime
    ];

    if (mode === "assets") {
      // Individual assets view
      return items
        .filter(
          (item) => item.currentPercentage > 0 || item.targetPercentage > 0
        )
        .map(
          (item, index) =>
            ({
              ticker: item.ticker,
              companyName: item.companyName,
              currentPercentage: item.currentPercentage,
              targetPercentage: item.targetPercentage,
              color: colors[index % colors.length],
            } as ChartSegment)
        );
    } else {
      // Group by asset type
      const typeMap = new Map<string, { current: number; target: number }>();

      items.forEach((item) => {
        const securityType = this.getSecurityTypeForItem(item.ticker);
        const typeName = this.getSecurityTypeName(securityType);

        // Debug: log what we're finding
        const portfolioItem = this.portfolio().find(
          (p) => p.ticker.toUpperCase() === item.ticker.toUpperCase()
        );
        console.log(
          `Item ${item.ticker}: securityType=${portfolioItem?.securityType}, resolvedType=${typeName}`
        );

        if (!typeMap.has(typeName)) {
          typeMap.set(typeName, { current: 0, target: 0 });
        }

        const typeData = typeMap.get(typeName)!;
        typeData.current += item.currentPercentage;
        typeData.target += item.targetPercentage;
      });

      console.log("Type map:", Array.from(typeMap.entries()));

      // Convert to chart segments
      const typeColors: Record<string, string> = {
        Stock: "#3B82F6",
        ETF: "#10B981",
        "Mutual Fund": "#8B5CF6",
        Bond: "#06B6D4",
        Crypto: "#F59E0B",
        REIT: "#EC4899",
        Options: "#F97316",
        Commodity: "#84CC16",
      };

      const segments = Array.from(typeMap.entries())
        .filter(([_, data]) => data.current > 0 || data.target > 0)
        .map(
          ([typeName, data], index) =>
            ({
              ticker: typeName,
              companyName: typeName,
              currentPercentage: data.current,
              targetPercentage: data.target,
              color: typeColors[typeName] || colors[index % colors.length],
            } as ChartSegment)
        );

      // Sort by current percentage descending for better visualization
      return segments.sort((a, b) => b.currentPercentage - a.currentPercentage);
    }
  });

  // Computed: Total portfolio value for center text
  totalPortfolioValue = computed(() => {
    return this.strategyItems().reduce(
      (sum, item) => sum + item.currentValue,
      0
    );
  });

  // Computed: Total current percentage
  totalCurrentPercentage = computed(() => {
    return this.chartSegments().reduce(
      (sum, s) => sum + s.currentPercentage,
      0
    );
  });

  // Computed: Top buy recommendations with proportional distribution
  topRecommendations = computed(() => {
    const items = this.strategyItems();
    const investment = this.investmentAmount();
    const currentTotalValue = items.reduce(
      (sum, item) => sum + item.currentValue,
      0
    );
    const futurePortfolioValue = currentTotalValue + investment;

    if (futurePortfolioValue <= 0 || investment <= 0) {
      return [];
    }

    // Step 1 & 2: Calculate ideal gaps (deficits) for each asset
    const deficits = items
      .map((item) => {
        const idealValue = futurePortfolioValue * (item.targetPercentage / 100);
        const currentValue = item.currentValue;
        const rawDeficit = idealValue - currentValue;

        return {
          ticker: item.ticker,
          companyName: item.companyName,
          rawDeficit,
        };
      })
      .filter((d) => d.rawDeficit > 0); // Only underweight assets

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
      .map((d) => ({
        ticker: d.ticker,
        companyName: d.companyName,
        buyAmount: d.rawDeficit * scalingFactor,
        delta: d.rawDeficit,
      }))
      .filter((rec) => rec.buyAmount >= 1.0) // Filter tiny buys (< €1.00)
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

  onTargetEnter(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      // Save all changes when Enter is pressed
      this.saveAllTargets();
    }
  }

  // Check if there are unsaved changes
  hasUnsavedChanges(): boolean {
    const localInputs = this.targetInputs();
    const targetMap = this.allocationService.targetMap();
    
    // Check if any local input differs from the service target
    for (const [ticker, localValue] of localInputs.entries()) {
      const serviceValue = targetMap.get(ticker);
      if (serviceValue === undefined || Math.abs(serviceValue - localValue) > 0.001) {
        return true;
      }
    }
    return false;
  }

  // Save all modified targets
  async saveAllTargets(): Promise<void> {
    const localInputs = this.targetInputs();
    const targetMap = this.allocationService.targetMap();
    
    // Check if there are any changes
    const hasChanges = this.hasUnsavedChanges();
    if (!hasChanges) {
      return;
    }

    try {
      // Build the complete allocation list with all tickers (modified and unmodified)
      const allAllocations = this.strategyItems().map(item => ({
        ticker: item.ticker,
        targetPercentage: localInputs.get(item.ticker.toUpperCase()) ?? item.targetPercentage
      }));

      // Use the first item to save (this will send all allocations)
      // The updateTarget method already sends the complete list
      if (allAllocations.length > 0) {
        // We'll use updateTarget with the complete set, but we need to call it once
        // Since updateTarget rebuilds the full list, we can just update one item
        // and it will include all our local changes
        const firstChange = Array.from(localInputs.entries())[0];
        if (firstChange) {
          await this.allocationService.updateTarget(undefined, firstChange[0], firstChange[1]);
          toast.success('Successfully updated target allocations');
        }
      }
    } catch (err) {
      console.error('Error updating targets:', err);
      toast.error('Failed to update target allocations');
      // Revert local inputs on error
      const newInputs = new Map(targetMap);
      this.targetInputs.set(newInputs);
    }
  }

  getTotalTargetClass(): string {
    const total = this.totalTargetPercentage();
    // Use tolerance to handle floating-point precision issues
    if (total > 100.01) {
      // Red when over-allocated (more than 100% + small tolerance)
      return 'text-red-600 font-bold';
    }
    // Green when at or under 100% (allows reserving cash)
    return 'text-green-600 font-bold';
  }

  // Helper to format tooltip text
  getSegmentTooltip(ticker: string, percentage: number): string {
    return `${ticker}: ${percentage.toFixed(2)}%`;
  }

  // Toggle view mode
  toggleViewMode(): void {
    this.viewMode.update((mode) => (mode === "assets" ? "types" : "assets"));
  }

  // Custom tooltip state
  activeTooltip = signal<{
    x: number;
    y: number;
    text: string;
    color: string;
  } | null>(null);

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

  // Show info tooltip for Smart Rebalancing help button
  showInfoTooltip(event: MouseEvent): void {
    this.activeTooltip.set({
      x: event.clientX,
      y: event.clientY,
      text: "Enter an amount to see how to allocate it to reach your targets.",
      color: "transparent", // No color dot for info tooltips
    });
  }

  // Helper to get segments for current bar
  getCurrentBarSegments(): Array<{
    color: string;
    width: number;
    ticker: string;
    percentage: number;
  }> {
    const segments = this.chartSegments();
    const total = segments.reduce((sum, s) => sum + s.currentPercentage, 0);
    if (total === 0) return [];

    return segments
      .filter((s) => s.currentPercentage > 0)
      .map((s) => ({
        color: s.color,
        width: (s.currentPercentage / total) * 100,
        ticker: s.ticker,
        percentage: s.currentPercentage,
      }));
  }

  // Helper to get segments for target bar
  getTargetBarSegments(): Array<{
    color: string;
    width: number;
    ticker: string;
    percentage: number;
  }> {
    const segments = this.chartSegments();
    const total = segments.reduce((sum, s) => sum + s.targetPercentage, 0);
    if (total === 0) return [];

    return segments
      .filter((s) => s.targetPercentage > 0)
      .map((s) => ({
        color: s.color,
        width: (s.targetPercentage / total) * 100,
        ticker: s.ticker,
        percentage: s.targetPercentage,
      }));
  }
}
