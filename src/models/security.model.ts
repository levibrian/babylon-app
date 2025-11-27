/**
 * Security type enum matching backend SecurityType
 */
export enum SecurityType {
  Stock = 1,
  ETF = 2,
  MutualFund = 3,
  Bond = 4,
  Crypto = 5,
  REIT = 6,
  Options = 7,
  Commodity = 8
}

/**
 * Security model representing a tradeable asset
 */
export interface Security {
  id: string;
  ticker: string; // e.g., 'AAPL', 'BTC'
  securityName: string; // e.g., 'Apple Inc.', 'Bitcoin'
  securityType?: SecurityType;
}

