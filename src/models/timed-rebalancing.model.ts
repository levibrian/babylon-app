/**
 * Timed Rebalancing Actions API Response Types
 * 
 * These interfaces define the contract for the timed rebalancing endpoint
 * which combines allocation gaps with market timing signals.
 */

/**
 * Individual rebalancing action (buy or sell recommendation)
 */
export interface TimedRebalancingAction {
  /** Action type - 'Buy' or 'Sell' */
  actionType: 'Buy' | 'Sell';
  
  /** Ticker symbol (e.g., "NVDA", "VTI") */
  ticker: string;
  
  /** Full security name (e.g., "NVIDIA Corporation") */
  securityName: string;
  
  /** Recommended transaction amount (always positive, in currency) */
  amount: number;
  
  /** Priority ranking (1 = highest, only set when aiApplied=true) */
  priority: number | null;
  
  /** Current allocation percentage (e.g., 18.5 for 18.5%) */
  currentAllocationPercentage: number;
  
  /** Target allocation percentage (e.g., 15.0 for 15%) */
  targetAllocationPercentage: number;
  
  /** Allocation deviation (positive = overweight, negative = underweight) */
  allocationDeviation: number;
  
  /** Current price of the security */
  currentPrice: number | null;
  
  /** 
   * Timing percentile based on 1-year price history (0-100)
   * - 0-20: Cheap (good time to buy)
   * - 21-79: Fair/Neutral
   * - 80-100: Expensive (good time to sell)
   */
  timingPercentile1Y: number | null;
  
  /** Unrealized P&L percentage for this position */
  unrealizedPnLPercentage: number | null;
  
  /** Human-readable reason for this recommendation */
  reason: string;
  
  /** Confidence score (0.0 - 1.0) */
  confidence: number;
}

/**
 * Full response from the timed rebalancing actions endpoint
 */
export interface TimedRebalancingActionsResponse {
  /** Total portfolio value */
  totalPortfolioValue: number;
  
  /** Available cash balance */
  cashAvailable: number;
  
  /** Sum of all buy amounts */
  totalBuyAmount: number;
  
  /** Sum of all sell amounts */
  totalSellAmount: number;
  
  /** Net cash flow (Buy - Sell, negative = accumulating cash) */
  netCashFlow: number;
  
  /** Percentile threshold used for buy timing (e.g., 20) */
  buyPercentileThreshold1Y: number;
  
  /** Percentile threshold used for sell timing (e.g., 80) */
  sellPercentileThreshold1Y: number;
  
  /** ISO 8601 timestamp when recommendations were generated */
  generatedAtUtc: string;
  
  /** List of sell recommendations */
  sells: TimedRebalancingAction[];
  
  /** List of buy recommendations */
  buys: TimedRebalancingAction[];
  
  /** Whether AI optimization was applied */
  aiApplied: boolean;
  
  /** AI-generated summary (only when aiApplied=true) */
  aiSummary: string | null;
}

/**
 * Request parameters for the timed actions endpoint
 */
export interface TimedRebalancingActionsRequest {
  /** Additional cash to deploy (added to existing cash balance) */
  investmentAmount?: number;
  
  /** Maximum number of sell/buy actions each (default: 10) */
  maxActions?: number;
  
  /** Enable AI optimization (requires Gemini config) */
  useAi?: boolean;
}

/**
 * Scenario type based on available actions
 */
export type RebalancingScenario = 'sell-only' | 'buy-only' | 'rebalance' | 'balanced';

/**
 * Timing category based on percentile
 */
export type TimingCategory = 'cheap' | 'fair' | 'expensive';

/**
 * Helper functions for working with timed rebalancing data
 */
export class TimedRebalancingHelpers {
  /**
   * Determines the scenario type based on available actions
   */
  static getScenarioType(response: TimedRebalancingActionsResponse): RebalancingScenario {
    const hasSells = response.sells.length > 0;
    const hasBuys = response.buys.length > 0;

    if (!hasSells && !hasBuys) return 'balanced';
    if (hasSells && !hasBuys) return 'sell-only';
    if (!hasSells && hasBuys) return 'buy-only';
    return 'rebalance';
  }

  /**
   * Gets the header title based on scenario
   */
  static getHeaderTitle(scenario: RebalancingScenario): string {
    switch (scenario) {
      case 'sell-only': return 'Take Profits';
      case 'buy-only': return 'Deploy Cash';
      case 'rebalance': return 'Rebalancing Actions';
      case 'balanced': return 'Portfolio Balanced';
    }
  }

  /**
   * Gets all actions sorted by priority (AI) or amount (non-AI)
   */
  static getAllActionsSortedByPriority(response: TimedRebalancingActionsResponse): TimedRebalancingAction[] {
    const allActions = [...response.sells, ...response.buys];
    
    if (response.aiApplied) {
      // Sort by priority (AI-assigned)
      return allActions.sort((a, b) => (a.priority ?? 999) - (b.priority ?? 999));
    }
    
    // Sort by amount (descending) for non-AI
    return allActions.sort((a, b) => b.amount - a.amount);
  }

  /**
   * Determines timing category based on percentile
   */
  static getTimingCategory(percentile: number | null): TimingCategory {
    if (percentile === null) return 'fair';
    if (percentile <= 20) return 'cheap';
    if (percentile >= 80) return 'expensive';
    return 'fair';
  }

  /**
   * Gets timing label for display
   */
  static getTimingLabel(percentile: number | null): string {
    if (percentile === null) return 'N/A';
    if (percentile <= 20) return 'Cheap';
    if (percentile >= 80) return 'Expensive';
    return 'Fair';
  }
}
