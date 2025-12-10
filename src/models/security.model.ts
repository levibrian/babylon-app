/**
 * Security type matching backend SecurityType
 */
export type SecurityType = 
  | "Stock" 
  | "ETF" 
  | "MutualFund" 
  | "Bond" 
  | "Crypto" 
  | "REIT" 
  | "Options" 
  | "Commodity";

/**
 * Security model representing a tradeable asset
 */
export interface Security {
  id: string;
  ticker: string; // e.g., 'AAPL', 'BTC'
  securityName: string; // e.g., 'Apple Inc.', 'Bitcoin'
  securityType?: SecurityType;
}

