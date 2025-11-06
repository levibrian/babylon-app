import { Transaction } from './transaction.model';

export interface PortfolioItem {
  ticker: string;
  totalShares: number;
  totalCost: number;
  averageSharePrice: number;
  transactions: Transaction[];
}
