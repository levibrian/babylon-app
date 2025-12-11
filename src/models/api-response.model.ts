import { SecurityType } from './security.model';

// Backend API: TransactionDto
export interface ApiTransaction {
  id: string;
  transactionType: string; // "Buy", "Sell", etc. (capitalized)
  date: number; // Unix timestamp
  sharesQuantity: number;
  sharePrice: number;
  fees: number;
  totalAmount: number;
  tax?: number; // Tax withheld (for dividend transactions)
  securityName?: string; // Company/security name (optional for backward compatibility)
  ticker?: string; // Ticker symbol (should be included in transactions endpoint response)
  securityType?: SecurityType;
}

// Backend API: PortfolioPositionDto
export interface ApiPortfolioPosition {
  ticker: string;
  securityName: string;
  securityType: SecurityType;
  totalInvested: number;
  totalShares: number;
  averageSharePrice: number;
  
  // Security metadata (NEW)
  sector: string | null;
  industry: string | null;
  geography: string | null;
  marketCap: number | null;
  
  // Allocation properties
  currentAllocationPercentage: number | null;
  targetAllocationPercentage: number; // Already a percentage (e.g., 4.48 for 4.48%)
  allocationDeviation: number;
  rebalancingAmount: number | null;
  rebalancingStatus: "Balanced" | "Overweight" | "Underweight";
  currentMarketValue: number | null;
  
  // P&L properties (NEW)
  unrealizedPnL: number; // Unrealized profit/loss in currency
  unrealizedPnLPercentage: number; // Unrealized profit/loss as percentage
  
  transactions: ApiTransaction[];
}

// Backend API: VisualContextDto
export interface ApiVisualContext {
  currentValue: number;
  targetValue: number;
  projectedValue: number | null;
  format: "Currency" | "Percent";
}

// Backend API: PortfolioInsightDto
export interface ApiPortfolioInsight {
  category: "Risk" | "Opportunity" | "Trend" | "Efficiency" | "Income";
  title: string;
  message: string;
  relatedTicker: string | null;
  metadata: Record<string, any>;
  severity: "Info" | "Warning" | "Critical";
  actionLabel: string | null;
  actionPayload: any | null;
  visualContext: ApiVisualContext | null;
}

// Backend API: PortfolioResponse
export interface ApiPortfolioResponse {
  positions: ApiPortfolioPosition[];
  totalInvested: number;
  dailyGainLoss?: number;
  dailyGainLossPercentage?: number;
  insights?: ApiPortfolioInsight[];
}

// Backend API: TransactionsResponse (for GET /api/v1/transactions/{userId})
export interface ApiTransactionsResponse {
  transactions: ApiTransaction[];
}

// Backend API: DiversificationMetricsDto
export interface ApiDiversificationMetrics {
  hhi: number; // 0-1, lower is better (<0.15 = well diversified)
  effectiveN: number; // Equivalent number of equally-weighted positions
  diversificationScore: number; // 0-100, higher is better
  top3Concentration: number; // % of portfolio in top 3 holdings
  top5Concentration: number; // % of portfolio in top 5 holdings
  totalAssets: number; // Number of distinct securities
}

// Backend API: RiskMetricsDto
export interface ApiRiskMetrics {
  annualizedVolatility: number; // Standard deviation of returns (annualized)
  beta: number; // β vs S&P 500 benchmark
  sharpeRatio: number; // Risk-adjusted return
  annualizedReturn: number; // Portfolio return (annualized)
  period: string; // "1Y", "6M", or "3M"
  benchmarkTicker: string; // "^GSPC" (S&P 500)
}

// Backend API: RebalancingActionDto
export interface ApiRebalancingAction {
  ticker: string;
  securityName: string;
  currentAllocationPercentage: number;
  targetAllocationPercentage: number;
  differenceValue: number; // Positive = buy, negative = sell
  actionType: "Buy" | "Sell";
}

// Backend API: RebalancingActionsDto
export interface ApiRebalancingActions {
  actions: ApiRebalancingAction[];
  totalPortfolioValue: number;
  totalBuyAmount: number; // Sum of all buy amounts
  totalSellAmount: number; // Sum of all sell amounts (absolute)
  netCashFlow: number; // Should be ~0 for pure rebalancing
}

// Backend API: SmartRebalancingRequestDto
export interface ApiSmartRebalancingRequest {
  investmentAmount: number; // Amount to invest (required, > 0)
  maxSecurities: number | null; // Limit number of securities (optional)
  onlyBuyUnderweight: boolean; // Only buy underweight positions (default: true)
}

// Backend API: SmartRebalancingRecommendationDto
export interface ApiSmartRebalancingRecommendation {
  ticker: string;
  securityName: string;
  currentAllocationPercentage: number;
  targetAllocationPercentage: number;
  gapScore: number; // Target% - Current%
  recommendedBuyAmount: number; // Proportional allocation
}

// Backend API: SmartRebalancingResponseDto
export interface ApiSmartRebalancingResponse {
  recommendations: ApiSmartRebalancingRecommendation[];
  totalInvestmentAmount: number;
  securitiesCount: number;
}
