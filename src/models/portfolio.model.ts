import { Transaction } from './transaction.model';

export interface PortfolioItem {
  ticker: string;
  companyName: string;
  totalShares: number;
  totalCost: number;
  averageSharePrice: number;
  transactions: Transaction[];

  // Strategic Allocation fields
  targetAllocationPercentage: number; // e.g., 30 for 30%
  currentAllocationPercentage: number; // e.g., 31.5 for 31.5%
  allocationDifference: number; // e.g., 1.5 for 1.5% overweight
  rebalanceAmount: number; // e.g., 160 for "Sell ~€160"
}
