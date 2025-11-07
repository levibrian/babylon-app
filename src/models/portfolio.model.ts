import { Transaction } from './transaction.model';

export interface PortfolioItem {
  ticker: string;
  companyName: string;
  totalShares: number;
  totalCost: number;
  averageSharePrice: number;
  transactions: Transaction[];
}
