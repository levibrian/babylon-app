export interface Transaction {
  id: string;
  date: string; // ISO format
  ticker: string; // e.g., 'AAPL'
  transactionType: 'buy' | 'sell' | 'dividend';
  shares: number;
  sharePrice: number;
  fees: number;
  notes?: string;
}
