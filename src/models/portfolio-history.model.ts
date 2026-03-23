export type Timeframe = '1D' | '1W' | '1M' | '6M' | '1Y' | 'YTD' | 'Max';

export interface PortfolioSnapshotDto {
  timestamp: number; // Unix timestamp in seconds (UnixDateTimeConverter applied globally on backend)
  totalInvested: number;
  cashBalance: number;
  totalMarketValue: number;
  unrealizedPnL: number;
  unrealizedPnLPercentage: number;
  realizedPnL: number;
  realizedPnLPercentage: number;
}

export interface PortfolioHistoryApiResponse {
  userId: string;
  from?: string;
  to?: string;
  count: number;
  snapshots: PortfolioSnapshotDto[];
}

export interface TimeframeSummary {
  startingValue: number;
  endingValue: number;
  valueChange: number;
  valueChangePercentage: number;
  highestValue: number;
  highestValueTimestamp: number; // Unix timestamp in seconds
  lowestValue: number;
  lowestValueTimestamp: number; // Unix timestamp in seconds
}
