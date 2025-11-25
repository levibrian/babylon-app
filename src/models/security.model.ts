/**
 * Security model representing a tradeable asset
 */
export interface Security {
  id: string;
  ticker: string; // e.g., 'AAPL', 'BTC'
  securityName: string; // e.g., 'Apple Inc.', 'Bitcoin'
}

