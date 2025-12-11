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
import { PortfolioService } from '../../services/portfolio.service';
import { PortfolioAnalyticsService } from '../../services/portfolio-analytics.service';
import { SecurityType } from '../../models/security.model';
import { toast } from "ngx-sonner";
import { Router } from '@angular/router';
import { PortfolioInsight } from '../../models/portfolio.model';
import { ApiSmartRebalancingRecommendation } from '../../models/api-response.model';
import {
  StrategyItem,
  Recommendation,
  SectorAggregation,
  GeographyAggregation,
  ChartSegment,
  DiversificationCardData,
  RiskCardData,
  RebalancingActionsCardData,
  BarSegment,
  DeltaBarSegment,
} from '../../models/strategy.model';
import { DiversificationCardComponent } from '../common/diversification-card/diversification-card.component';
import { RiskProfileCardComponent } from '../common/risk-profile-card/risk-profile-card.component';
import { RebalancingActionsCardComponent } from '../common/rebalancing-actions-card/rebalancing-actions-card.component';
import { AllocationBarComponent } from '../common/allocation-bar/allocation-bar.component';
import { SmartRebalancingComponent } from '../common/smart-rebalancing/smart-rebalancing.component';

@Component({
  selector: "app-strategy-panel",
  templateUrl: "./strategy-panel.component.html",
  imports: [
    CommonModule,
    DecimalPipe,
    DiversificationCardComponent,
    RiskProfileCardComponent,
    RebalancingActionsCardComponent,
    AllocationBarComponent,
    SmartRebalancingComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: "block h-full overflow-hidden",
  },
})
export class StrategyPanelComponent implements OnInit {
  portfolio = input.required<PortfolioItem[]>();

  allocationService = inject(AllocationService);
  portfolioService = inject(PortfolioService);
  analyticsService = inject(PortfolioAnalyticsService);
  private router = inject(Router);

  // Portfolio Insights from backend API
  portfolioInsights = computed<PortfolioInsight[]>(() => {
    const backendInsights = this.portfolioService.insights();
    
    // If no insights from backend, return empty array
    if (!backendInsights || backendInsights.length === 0) {
      return [];
    }
    
    return backendInsights;
  });

  /**
   * Handles insight card action execution.
   * Navigates to transactions page with pre-filled form data based on insight type.
   */
  handleInsightAction(insight: PortfolioInsight): void {
    if (!insight.relatedTicker) {
      console.warn('Insight missing required data for action:', insight);
      return;
    }

    const portfolioItem = this.portfolio().find(p => p.ticker === insight.relatedTicker);
    if (!portfolioItem) {
      console.warn('Portfolio item not found for ticker:', insight.relatedTicker);
      return;
    }

    // Extract amount from metadata or actionPayload if available
    const amount = insight.metadata?.amount || insight.actionPayload?.amount || 
                   (insight.visualContext?.currentValue && insight.visualContext.format === 'Currency' 
                     ? insight.visualContext.currentValue : null);

    if (insight.category === 'Efficiency') {
      // Rebalancing insights - determine if it's a buy or sell based on rebalancing status
      const isSell = portfolioItem.rebalancingStatus === 'Overweight';
      const transactionType = isSell ? 'sell' : 'buy';
      
      // Navigate to transactions page with query params for pre-filling
      this.router.navigate(['/transactions'], {
        queryParams: {
          add: 'true',
          ticker: insight.relatedTicker,
          type: transactionType,
          amount: amount ? Math.abs(amount) : undefined,
          shares: portfolioItem.totalShares > 0 && amount ? Math.abs(amount) / portfolioItem.averageSharePrice : undefined
        }
      });
    } else if (insight.category === 'Income' && insight.actionLabel?.toLowerCase().includes('dividend')) {
      // For dividend insights
      this.router.navigate(['/transactions'], {
        queryParams: {
          add: 'true',
          ticker: insight.relatedTicker,
          type: 'dividend',
          shares: portfolioItem.totalShares
        }
      });
    } else {
      // Default: navigate to transactions page
      this.router.navigate(['/transactions'], {
        queryParams: {
          add: 'true',
          ticker: insight.relatedTicker
        }
      });
    }
  }

  // View mode toggle: 'assets' | 'types'
  viewMode = signal<"assets" | "types">("assets");

  // Smart Rebalancing section expand/collapse (replaces Target Allocation)
  isSmartRebalancingExpanded = signal<boolean>(false);

  // Investment simulator
  investmentAmount = signal<number>(0);
  maxSecurities = signal<number | null>(null);
  
  // Smart rebalancing recommendations from API
  smartRecommendations = signal<ApiSmartRebalancingRecommendation[]>([]);
  smartRecommendationsLoading = signal<boolean>(false);

  // Target editor - local state for inputs (to allow editing before saving)
  private targetInputs = signal<Map<string, number>>(new Map());
  
  // Track raw input values during editing to prevent computed signal interference
  private rawInputValues = signal<Map<string, string>>(new Map());
  
  // Track which input is currently focused to prevent value resets during typing
  private focusedInputTicker = signal<string | null>(null);

  // Computed: Merge portfolio with allocation strategy
  strategyItems = computed(() => {
    const portfolioItems = this.portfolio();
    const targetMap = this.allocationService.targetMap();
    const localInputs = this.targetInputs();

    const items = portfolioItems.map((item) => {
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
        // Use currentMarketValue if available (current/last close price), otherwise fall back to totalCost
        currentValue: item.currentMarketValue ?? item.totalCost,
      } as StrategyItem;
    });

    // Only sort if there are no local inputs (i.e., after save, using service values)
    // During editing, preserve original order to avoid UX disruption
    if (localInputs.size === 0) {
      // Sort by target allocation percentage (descending), then by ticker for consistency
      return items.sort((a, b) => {
        if (b.targetPercentage !== a.targetPercentage) {
          return b.targetPercentage - a.targetPercentage;
        }
        return a.ticker.localeCompare(b.ticker);
      });
    }

    // During editing, preserve original portfolio order
    return items;
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
      const validTypes: SecurityType[] = ["Stock", "ETF", "MutualFund", "Bond", "Crypto", "REIT", "Options", "Commodity"];
      if (validTypes.includes(type as SecurityType)) {
        return type === "MutualFund" ? "Mutual Fund" : type;
      }
    }

    // Handle numeric enum values (backward compatibility)
    if (typeof type === "number") {
      const typeNames: Record<number, string> = {
        1: "Stock",
        2: "ETF",
        3: "Mutual Fund",
        4: "Bond",
        5: "Crypto",
        6: "REIT",
        7: "Options",
        8: "Commodity",
      };
      return typeNames[type] || "Stock";
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

  // Helper to get consistent color for a ticker or type name
  private getColorForKey(key: string, mode: "assets" | "types"): string {
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

    if (mode === "types") {
      // For types, use predefined colors
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
      return typeColors[key] || colors[Math.abs(key.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % colors.length];
    } else {
      // For assets, use deterministic hash-based color assignment
      // This ensures the same ticker always gets the same color
      const hash = key.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      return colors[Math.abs(hash) % colors.length];
    }
  }

  // Helper to ensure consecutive segments have different colors
  private ensureDistinctConsecutiveColors(segments: ChartSegment[]): ChartSegment[] {
    if (segments.length === 0) return segments;

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

    const adjustedSegments = segments.map(seg => ({ ...seg }));

    for (let i = 1; i < adjustedSegments.length; i++) {
      const prevColor = adjustedSegments[i - 1].color;
      const currentColor = adjustedSegments[i].color;

      // If consecutive segments have the same color, find a different one
      if (prevColor === currentColor) {
        // Find a color that's different from both the previous and next (if exists)
        const nextColor = i < adjustedSegments.length - 1 ? adjustedSegments[i + 1].color : null;
        const availableColors = colors.filter(
          color => color !== prevColor && color !== nextColor
        );

        if (availableColors.length > 0) {
          // Use a deterministic selection based on ticker to maintain some consistency
          const hash = adjustedSegments[i].ticker.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
          adjustedSegments[i].color = availableColors[Math.abs(hash) % availableColors.length];
        } else {
          // Fallback: just pick any different color
          adjustedSegments[i].color = colors.find(color => color !== prevColor) || colors[0];
        }
      }
    }

    return adjustedSegments;
  }

  // Helper to create chart segments (used by both current and target segments)
  private createChartSegments(items: StrategyItem[], mode: "assets" | "types"): ChartSegment[] {
    if (mode === "assets") {
      // Individual assets view - use consistent colors based on ticker
    return items
        .filter(
          (item) => item.currentPercentage > 0 || item.targetPercentage > 0
        )
        .map(
          (item) =>
            ({
        ticker: item.ticker,
        companyName: item.companyName,
        currentPercentage: item.currentPercentage,
        targetPercentage: item.targetPercentage,
              color: this.getColorForKey(item.ticker.toUpperCase(), "assets"),
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

      // Convert to chart segments with consistent colors
      return Array.from(typeMap.entries())
        .filter(([_, data]) => data.current > 0 || data.target > 0)
        .map(
          ([typeName, data]) =>
            ({
              ticker: typeName,
              companyName: typeName,
              currentPercentage: data.current,
              targetPercentage: data.target,
              color: this.getColorForKey(typeName, "types"),
            } as ChartSegment)
        );
    }
  }

  // Computed: Chart segments for CURRENT allocation (sorted by current percentage)
  currentChartSegments = computed(() => {
    const items = this.strategyItems();
    const mode = this.viewMode();
    const segments = this.createChartSegments(items, mode);
    
    // Sort by current percentage descending (maintains original order logic)
    const sorted = segments.sort((a, b) => {
      if (b.currentPercentage !== a.currentPercentage) {
        return b.currentPercentage - a.currentPercentage;
      }
      return a.ticker.localeCompare(b.ticker);
    });

    // Ensure consecutive segments have different colors
    return this.ensureDistinctConsecutiveColors(sorted);
  });

  // Computed: Chart segments for TARGET allocation (sorted by target percentage)
  chartSegments = computed(() => {
    const items = this.strategyItems();
    const mode = this.viewMode();
    const segments = this.createChartSegments(items, mode);
    
    // Sort by target percentage descending (updates dynamically as user edits)
    const sorted = segments.sort((a, b) => {
      if (b.targetPercentage !== a.targetPercentage) {
        return b.targetPercentage - a.targetPercentage;
      }
      return a.ticker.localeCompare(b.ticker);
    });

    // Ensure consecutive segments have different colors
    return this.ensureDistinctConsecutiveColors(sorted);
  });

  // Computed: Total portfolio value for center text
  // Health Checklist Computed Signals
  netWorth = computed(() => {
    return this.portfolioService.totalPortfolioValue();
  });

  isDiversified = computed(() => {
    return this.portfolio().length > 5;
  });

  isSafeConcentration = computed(() => {
    const items = this.portfolio();
    const totalValue = this.netWorth();
    if (items.length === 0 || totalValue === 0) return false;
    
    const sortedByValue = [...items].sort((a, b) => b.totalCost - a.totalCost);
    const topHolding = sortedByValue[0];
    const topHoldingPercentage = (topHolding.totalCost / totalValue) * 100;
    
    return topHoldingPercentage < 25;
  });

  isMultiAsset = computed(() => {
    const items = this.portfolio();
    const uniqueTypes = new Set<SecurityType>();
    items.forEach(item => {
      if (item.securityType !== undefined) {
        uniqueTypes.add(item.securityType);
      } else {
        uniqueTypes.add("Stock");
      }
    });
    return uniqueTypes.size > 1;
  });

  assetClassCount = computed(() => {
    const items = this.portfolio();
    const uniqueTypes = new Set<SecurityType>();
    items.forEach(item => {
      if (item.securityType !== undefined) {
        uniqueTypes.add(item.securityType);
      } else {
        uniqueTypes.add("Stock");
      }
    });
    return uniqueTypes.size;
  });

  totalPortfolioValue = computed(() => {
    return this.strategyItems().reduce(
      (sum, item) => sum + item.currentValue,
      0
    );
  });

  // Computed: Total current percentage
  totalCurrentPercentage = computed(() => {
    return this.currentChartSegments().reduce(
      (sum, s) => sum + s.currentPercentage,
      0
    );
  });

  // Computed: Top buy recommendations - use API recommendations if available, otherwise fallback to client-side calculation
  topRecommendations = computed(() => {
    const apiRecommendations = this.smartRecommendations();
    
    // If we have API recommendations, use them
    if (apiRecommendations.length > 0) {
      return apiRecommendations.map((rec) => ({
        ticker: rec.ticker,
        companyName: rec.securityName,
        buyAmount: rec.recommendedBuyAmount,
        delta: rec.gapScore,
      }));
    }

    // Fallback to client-side calculation if no API recommendations
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
      .filter((rec) => rec.buyAmount >= 1.0) // Filter tiny buys (<  €1.00)
      .sort((a, b) => b.buyAmount - a.buyAmount); // Sort by amount descending

    return recommendations;
  });

  // Computed: Diversification metrics for card display
  diversificationCard = computed(() => {
    const metrics = this.analyticsService.diversificationMetrics();
    if (!metrics) return null;

    // Determine diversification level
    let level: 'Excellent' | 'Good' | 'Moderate' | 'Poor' = 'Moderate';
    let levelColor = 'amber';
    if (metrics.diversificationScore >= 80) {
      level = 'Excellent';
      levelColor = 'emerald';
    } else if (metrics.diversificationScore >= 60) {
      level = 'Good';
      levelColor = 'emerald';
    } else if (metrics.diversificationScore >= 40) {
      level = 'Moderate';
      levelColor = 'amber';
    } else {
      level = 'Poor';
      levelColor = 'red';
    }

    return {
      score: metrics.diversificationScore,
      hhi: metrics.hhi,
      top5Concentration: metrics.top5Concentration,
      totalAssets: metrics.totalAssets,
      effectiveN: metrics.effectiveN,
      level,
      levelColor,
    };
  });

  // Computed: Risk metrics for card display
  riskCard = computed<RiskCardData | null>(() => {
    const metrics = this.analyticsService.riskMetrics();
    if (!metrics) return null;

    // Determine risk level
    let riskLevel: 'Conservative' | 'Moderate' | 'Aggressive' = 'Moderate';
    if (metrics.beta < 0.8) {
      riskLevel = 'Conservative';
    } else if (metrics.beta > 1.2) {
      riskLevel = 'Aggressive';
    }

    // Beta interpretation
    let betaLabel = 'Market Average';
    let betaColor: 'emerald' | 'red' | 'gray' = 'gray';
    if (metrics.beta < 0.8) {
      betaLabel = 'Low Volatility';
      betaColor = 'emerald';
    } else if (metrics.beta > 1.2) {
      betaLabel = 'High Volatility';
      betaColor = 'red';
    }

    // Sharpe Ratio interpretation
    let sharpeLabel = 'Average';
    let sharpeColor: 'emerald' | 'amber' | 'red' | 'gray' = 'gray';
    if (metrics.sharpeRatio >= 2) {
      sharpeLabel = 'Excellent';
      sharpeColor = 'emerald';
    } else if (metrics.sharpeRatio >= 1) {
      sharpeLabel = 'Good';
      sharpeColor = 'emerald';
    } else if (metrics.sharpeRatio >= 0.5) {
      sharpeLabel = 'Average';
      sharpeColor = 'amber';
    } else {
      sharpeLabel = 'Poor';
      sharpeColor = 'red';
    }

    return {
      riskLevel,
      beta: metrics.beta,
      betaLabel,
      betaColor,
      volatility: metrics.annualizedVolatility,
      sharpeRatio: metrics.sharpeRatio,
      sharpeLabel,
      sharpeColor,
      annualizedReturn: metrics.annualizedReturn,
      period: metrics.period,
    };
  });

  // Computed: Top 5 rebalancing actions for card display
  rebalancingActionsCard = computed<RebalancingActionsCardData | null>(() => {
    const actions = this.analyticsService.rebalancingActions();
    if (!actions || !actions.actions) return null;

    return {
      topActions: actions.actions.slice(0, 5),
      totalBuyAmount: actions.totalBuyAmount,
      totalSellAmount: actions.totalSellAmount,
      netCashFlow: actions.netCashFlow,
    };
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
    // Load analytics data
    this.analyticsService.loadAllAnalytics();
  }

  // Aggregation helpers
  aggregateBySector(): SectorAggregation[] {
    const items = this.strategyItems();
    const sectorMap = new Map<string, SectorAggregation>();

    items.forEach((item) => {
      const portfolioItem = this.portfolio().find(
        (p) => p.ticker.toUpperCase() === item.ticker.toUpperCase()
      );
      const sector = portfolioItem?.sector || 'Unknown';

      if (!sectorMap.has(sector)) {
        sectorMap.set(sector, {
          sector,
          currentPercentage: 0,
          targetPercentage: 0,
          currentValue: 0,
        });
      }

      const sectorData = sectorMap.get(sector)!;
      sectorData.currentPercentage += item.currentPercentage;
      sectorData.targetPercentage += item.targetPercentage;
      sectorData.currentValue += item.currentValue;
    });

    return Array.from(sectorMap.values()).sort(
      (a, b) => b.currentPercentage - a.currentPercentage
    );
  }

  aggregateByGeography(): GeographyAggregation[] {
    const items = this.strategyItems();
    const geographyMap = new Map<string, GeographyAggregation>();

    items.forEach((item) => {
      const portfolioItem = this.portfolio().find(
        (p) => p.ticker.toUpperCase() === item.ticker.toUpperCase()
      );
      const geography = portfolioItem?.geography || 'Unknown';

      if (!geographyMap.has(geography)) {
        geographyMap.set(geography, {
          geography,
          currentPercentage: 0,
          targetPercentage: 0,
          currentValue: 0,
        });
      }

      const geographyData = geographyMap.get(geography)!;
      geographyData.currentPercentage += item.currentPercentage;
      geographyData.targetPercentage += item.targetPercentage;
      geographyData.currentValue += item.currentValue;
    });

    return Array.from(geographyMap.values()).sort(
      (a, b) => b.currentPercentage - a.currentPercentage
    );
  }

  // Computed: Delta segments (difference between current and target)
  deltaChartSegments = computed(() => {
    const items = this.strategyItems();
    const mode = this.viewMode();
    const segments = this.createChartSegments(items, mode);

    return segments
      .map((seg) => {
        const delta = seg.currentPercentage - seg.targetPercentage;
        return {
          ...seg,
          delta,
          deltaPercentage: Math.abs(delta),
        };
      })
      .filter((seg) => Math.abs(seg.delta) > 0.1) // Only show significant differences
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  });

  // Computed: Total delta percentage for display
  totalDeltaPercentage = computed(() => {
    return this.deltaChartSegments().reduce((sum, s) => sum + Math.abs(s.delta), 0);
  });

  // Helper to get delta bar segments
  getDeltaBarSegments(): DeltaBarSegment[] {
    const segments = this.deltaChartSegments();
    const totalDelta = segments.reduce(
      (sum, s) => sum + Math.abs(s.delta),
      0
    );
    if (totalDelta === 0) return [];

    return segments.map((s) => {
      // Color: red for overweight (positive delta), green for underweight (negative delta), gray for balanced
      let color = '#9CA3AF'; // Gray for balanced
      if (s.delta > 0.1) {
        color = '#EF4444'; // Red for overweight
      } else if (s.delta < -0.1) {
        color = '#10B981'; // Green for underweight
      }

      return {
        color,
        width: (Math.abs(s.delta) / totalDelta) * 100,
        ticker: s.ticker,
        delta: s.delta,
        deltaPercentage: Math.abs(s.delta),
      };
    });
  }

  // Update smart recommendations when investment amount or max securities changes
  async updateSmartRecommendations(): Promise<void> {
    const amount = this.investmentAmount();
    const maxSec = this.maxSecurities();

    if (amount <= 0) {
      this.smartRecommendations.set([]);
      return;
    }

    this.smartRecommendationsLoading.set(true);
    try {
      const response = await this.analyticsService.getSmartRecommendations({
        investmentAmount: amount,
        maxSecurities: maxSec || null,
        onlyBuyUnderweight: true,
      });

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

  onInvestmentAmountChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    const numValue = parseFloat(value) || 0;
    this.investmentAmount.set(numValue);
    // Debounce API call
    setTimeout(() => this.updateSmartRecommendations(), 500);
  }

  onMaxSecuritiesChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    const numValue = value ? parseInt(value, 10) : null;
    this.maxSecurities.set(numValue && numValue > 0 ? numValue : null);
    // Debounce API call
    setTimeout(() => this.updateSmartRecommendations(), 500);
  }


  onTargetInputChange(ticker: string, event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    const rawValue = inputElement.value;
    const tickerUpper = ticker.toUpperCase();
    
    // Store the raw string value to prevent computed signal from interfering
    const currentRaw = this.rawInputValues();
    const newRaw = new Map(currentRaw);
    newRaw.set(tickerUpper, rawValue);
    this.rawInputValues.set(newRaw);
    
    // Parse and store numeric value if valid
    if (rawValue === '' || rawValue === '-' || rawValue === '.') {
      // Allow empty/incomplete input during typing
      return;
    }

    const numValue = parseFloat(rawValue);
    if (!isNaN(numValue) && numValue >= 0) {
      const currentInputs = this.targetInputs();
      const newInputs = new Map(currentInputs);
      newInputs.set(tickerUpper, numValue);
      this.targetInputs.set(newInputs);
    }
  }
  
  onTargetFocus(ticker: string, event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    const tickerUpper = ticker.toUpperCase();
    
    // Store current value as raw string when focusing
    const currentValue = this.getInputValue(ticker);
    const currentRaw = this.rawInputValues();
    const newRaw = new Map(currentRaw);
    newRaw.set(tickerUpper, currentValue.toString());
    this.rawInputValues.set(newRaw);
    
    this.focusedInputTicker.set(tickerUpper);
  }
  
  onTargetBlur(ticker: string, event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    const value = inputElement.value.trim();
    const tickerUpper = ticker.toUpperCase();
    
    // Clear raw value on blur
    const currentRaw = this.rawInputValues();
    const newRaw = new Map(currentRaw);
    newRaw.delete(tickerUpper);
    this.rawInputValues.set(newRaw);
    
    // Validate and normalize on blur
    const numValue = parseFloat(value);
    
    if (value === '' || isNaN(numValue) || numValue < 0) {
      // Reset to the computed value if invalid
      const currentInputs = this.targetInputs();
      const newInputs = new Map(currentInputs);
      newInputs.delete(tickerUpper);
      this.targetInputs.set(newInputs);
    } else {
      // Ensure the value is stored
    const currentInputs = this.targetInputs();
    const newInputs = new Map(currentInputs);
    newInputs.set(tickerUpper, numValue);
    this.targetInputs.set(newInputs);
  }

    this.focusedInputTicker.set(null);
  }
  
  // Get the display value for an input, respecting focus state
  getInputValue(ticker: string): number {
    const tickerUpper = ticker.toUpperCase();
    const localInputs = this.targetInputs();
    
    // If there's a local input value, use it
    if (localInputs.has(tickerUpper)) {
      return localInputs.get(tickerUpper)!;
    }
    
    // Fall back to computed strategyItems
    const item = this.strategyItems().find(i => i.ticker.toUpperCase() === tickerUpper);
    return item?.targetPercentage ?? 0;
  }
  
  // Get the display string value for the input element
  getInputDisplayValue(ticker: string): string {
    const tickerUpper = ticker.toUpperCase();
    const focusedTicker = this.focusedInputTicker();
    
    // If this input is focused, use raw value to allow free typing
    if (focusedTicker === tickerUpper) {
      const rawValues = this.rawInputValues();
      if (rawValues.has(tickerUpper)) {
        return rawValues.get(tickerUpper)!;
      }
    }
    
    // Otherwise, format the numeric value
    const numValue = this.getInputValue(ticker);
    return numValue.toString();
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
      // Build the complete allocation list with ALL portfolio items (modified and unmodified)
      // The backend expects ALL items to be sent so it can determine what to delete, update, or add
      const allAllocations = this.strategyItems().map(item => ({
        ticker: item.ticker,
        targetPercentage: localInputs.get(item.ticker.toUpperCase()) ?? item.targetPercentage
      }));

      // Send complete list to backend (includes all portfolio items)
      await this.allocationService.setAllocationStrategy(undefined, allAllocations);
      
      // Clear local inputs after successful save - this will trigger recomputation with sorted order
      // The service will reload the strategy, and computed signals will use service values
      this.targetInputs.set(new Map());
      this.rawInputValues.set(new Map());
      
      // Reload portfolio data from backend to refresh all portfolio items with updated target allocations
      await this.portfolioService.reload();
      
      toast.success('Successfully updated target allocations');
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

  // Helper to format tooltip text - shows percentage and amount
  getSegmentTooltip(ticker: string, percentage: number, amount: number): string {
    const formattedAmount = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
    return `${ticker}: ${percentage.toFixed(2)}% (${formattedAmount})`;
  }

  // Toggle view mode
  toggleViewMode(): void {
    this.viewMode.update((mode) => (mode === "assets" ? "types" : "assets"));
  }

  // Toggle Smart Rebalancing section expand/collapse
  toggleSmartRebalancing(): void {
    this.isSmartRebalancingExpanded.update((current) => !current);
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

  // Show info tooltip for Smart Rebalancing help button (in inputs section)
  showInfoTooltip(event: MouseEvent): void {
    const investmentAmount = this.investmentAmount();
    let tooltipText = "Enter an amount to see how to allocate it to reach your targets.";
    
    if (investmentAmount > 0) {
      const maxSec = this.maxSecurities();
      const maxSecText = maxSec && maxSec > 0 
        ? `top ${maxSec} underweight assets`
        : "underweight assets";
      tooltipText = `Distribute ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(investmentAmount)} across ${maxSecText}.`;
    }
    
    this.activeTooltip.set({
      x: event.clientX,
      y: event.clientY,
      text: tooltipText,
      color: "transparent", // No color dot for info tooltips
    });
  }

  // Show info tooltip for Smart Rebalancing header button
  showSmartRebalancingInfoTooltip(event: MouseEvent): void {
    this.activeTooltip.set({
      x: event.clientX,
      y: event.clientY,
      text: "Calculates optimal buy recommendations to bring your portfolio closer to target allocations.",
      color: "transparent", // No color dot for info tooltips
    });
  }

  // Show tooltip for HHI
  showHHITooltip(event: MouseEvent): void {
    this.activeTooltip.set({
      x: event.clientX,
      y: event.clientY,
      text: "Herfindahl-Hirschman Index (0-1). Lower is better. < 0.15 = well diversified, > 0.25 = high concentration.",
      color: "transparent",
    });
  }

  // Show tooltip for Beta
  showBetaTooltip(event: MouseEvent): void {
    const riskCard = this.riskCard();
    const betaValue = riskCard?.beta ?? 0;
    const benchmarkTicker = riskCard?.period ? 'S&P 500' : 'market';
    
    this.activeTooltip.set({
      x: event.clientX,
      y: event.clientY,
      text: `Beta (β) measures how much your portfolio moves relative to the ${benchmarkTicker}. Formula: Covariance(Portfolio, Market) / Variance(Market). A beta of ${betaValue.toFixed(2)} means your portfolio is ${betaValue < 1 ? 'less volatile' : betaValue > 1 ? 'more volatile' : 'equally volatile'} than the market. Use this to understand if your portfolio aligns with your risk tolerance.`,
      color: "transparent",
    });
  }

  // Show tooltip for Sharpe Ratio
  showSharpeTooltip(event: MouseEvent): void {
    const riskCard = this.riskCard();
    const sharpeValue = riskCard?.sharpeRatio ?? 0;
    
    this.activeTooltip.set({
      x: event.clientX,
      y: event.clientY,
      text: `Sharpe Ratio measures risk-adjusted returns. Formula: (Portfolio Return - Risk-Free Rate) / Volatility. Your ratio of ${sharpeValue.toFixed(2)} means you're earning ${sharpeValue.toFixed(2)} units of return per unit of risk. Higher is better: >1 = good, >2 = excellent. This helps you compare investments: a portfolio with higher Sharpe Ratio gives better returns for the same risk level.`,
      color: "transparent",
    });
  }

  // Show tooltip for Volatility
  showVolatilityTooltip(event: MouseEvent): void {
    const riskCard = this.riskCard();
    const volatilityValue = riskCard?.volatility ?? 0;
    const volatilityPercent = (volatilityValue * 100).toFixed(1);
    
    this.activeTooltip.set({
      x: event.clientX,
      y: event.clientY,
      text: `Volatility measures how much your portfolio's returns fluctuate over time. Calculated as the standard deviation of annualized returns. Your volatility of ${volatilityPercent}% means your portfolio value can swing by this amount in a typical year. Lower volatility = more stable returns, but potentially lower gains. Use this to understand if your portfolio's ups and downs match your comfort level.`,
      color: "transparent",
    });
  }

  // Show tooltip for Diversification Score
  showDiversificationScoreTooltip(event: MouseEvent): void {
    this.activeTooltip.set({
      x: event.clientX,
      y: event.clientY,
      text: "Portfolio diversification score (0-100). Higher scores indicate better diversification across assets.",
      color: "transparent",
    });
  }

  // Show tooltip for Portfolio Health section
  showPortfolioHealthTooltip(event: MouseEvent): void {
    this.activeTooltip.set({
      x: event.clientX,
      y: event.clientY,
      text: "Visualizes your current vs target allocation and identifies rebalancing needs through color-coded delta bars.",
      color: "transparent",
    });
  }

  // Show tooltip for Diversification section
  showDiversificationSectionTooltip(event: MouseEvent): void {
    this.activeTooltip.set({
      x: event.clientX,
      y: event.clientY,
      text: "Measures how well your portfolio is spread across different assets to reduce concentration risk.",
      color: "transparent",
    });
  }

  // Show tooltip for Risk Profile section
  showRiskProfileTooltip(event: MouseEvent): void {
    this.activeTooltip.set({
      x: event.clientX,
      y: event.clientY,
      text: "Risk Profile shows how your portfolio performs relative to the market. Beta measures market correlation, Volatility shows price swings, and Sharpe Ratio evaluates risk-adjusted returns. Together, these metrics help you understand if your portfolio's risk level matches your investment goals and tolerance.",
      color: "transparent",
    });
  }

  // Show tooltip for Rebalancing Actions section
  showRebalancingActionsTooltip(event: MouseEvent): void {
    this.activeTooltip.set({
      x: event.clientX,
      y: event.clientY,
      text: "Lists specific buy/sell actions needed to rebalance your portfolio to target allocations.",
      color: "transparent",
    });
  }

  // Helper to get segments for current bar (uses currentChartSegments - sorted by current percentage)
  getCurrentBarSegments(): BarSegment[] {
    const segments = this.currentChartSegments();
    const items = this.strategyItems();
    const total = segments.reduce((sum, s) => sum + s.currentPercentage, 0);
    if (total === 0) return [];
    
    return segments
      .filter((s) => s.currentPercentage > 0)
      .map((s) => {
        let currentValue = 0;
        if (this.viewMode() === 'assets') {
          // For assets view, find the single matching item
          const item = items.find(i => i.ticker.toUpperCase() === s.ticker.toUpperCase());
          currentValue = item?.currentValue ?? 0;
        } else {
          // For types view, sum up all items of that type
          currentValue = items
            .filter(i => this.getSecurityTypeName(this.getSecurityTypeForItem(i.ticker)) === s.ticker)
            .reduce((sum, i) => sum + i.currentValue, 0);
        }
        return {
          color: s.color,
          width: (s.currentPercentage / total) * 100,
          ticker: s.ticker,
          percentage: s.currentPercentage,
          value: currentValue,
        };
      });
  }

  // Helper method for template
  Math = Math;

  // Helper to get segments for target bar
  getTargetBarSegments(): BarSegment[] {
    const segments = this.chartSegments();
    const items = this.strategyItems();
    const totalPortfolioValue = this.totalPortfolioValue();
    const total = segments.reduce((sum, s) => sum + s.targetPercentage, 0);
    if (total === 0) return [];

    return segments
      .filter((s) => s.targetPercentage > 0)
      .map((s) => {
        // Calculate target amount based on target percentage and total portfolio value
        // Target amount = target percentage * total portfolio value / 100
        const targetAmount = (s.targetPercentage / 100) * totalPortfolioValue;
        
        return {
          color: s.color,
          width: (s.targetPercentage / total) * 100,
          ticker: s.ticker,
          percentage: s.targetPercentage,
          value: targetAmount,
        };
      });
  }
}
