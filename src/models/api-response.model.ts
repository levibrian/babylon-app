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

// Backend API: PositionDto
export interface ApiPortfolioPosition {
  ticker: string;
  securityName: string;
  totalInvested: number;
  totalShares: number;
  averageSharePrice: number;
  currentAllocationPercentage: number | null;
  targetAllocationPercentage: number; // Already a percentage (e.g., 4.48 for 4.48%)
  allocationDeviation: number;
  rebalancingAmount: number;
  rebalancingStatus: string; // "Balanced", "Overweight", or "Underweight"
  currentMarketValue: number | null;
  securityType?: SecurityType;
  transactions: ApiTransaction[];
}

// Backend API: VisualContextDto
export interface ApiVisualContext {
  now: number;
  target: number;
  after: number;
}

// Backend API: PortfolioInsightDto
export interface ApiPortfolioInsight {
  type: 'Rebalancing' | 'PerformanceMilestone' | 'DiversificationWarning';
  message: string;
  ticker?: string | null;
  amount?: number | null;
  severity: 'Info' | 'Warning' | 'Critical';
  actionLabel?: string | null;
  visualContext?: ApiVisualContext | null;
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
