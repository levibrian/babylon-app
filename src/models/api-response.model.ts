// C# DTO: TransactionDto
export interface ApiTransaction {
  Id: string;
  TransactionType: 'buy' | 'sell' | 'dividend';
  Date: string; // ISO string
  SharesQuantity: number;
  SharePrice: number;
  Fees: number;
  Amount: number;
  TotalAmount: number;
}

// C# DTO: PositionDto
export interface ApiPortfolioPosition {
  Ticker: string;
  CompanyName: string;
  TotalInvested: number;
  Transactions: ApiTransaction[];
  // Assuming these will be added to the backend DTO as discussed
  TotalShares: number;
  AverageSharePrice: number;
  TargetAllocation: number; // e.g., 0.3 for 30%
}

// C# DTO: PortfolioInsightDto
export interface ApiPortfolioInsight {
    Message: string;
    Severity: 'warning' | 'info' | 'positive';
}

// C# DTO: PortfolioResponse
export interface ApiPortfolioResponse {
  Positions: ApiPortfolioPosition[];
  TotalInvested: number;
  DailyGainLoss?: number;
  DailyGainLossPercentage?: number;
  Insights?: ApiPortfolioInsight[];
}
