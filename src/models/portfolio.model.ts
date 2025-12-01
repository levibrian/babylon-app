import { Transaction } from './transaction.model';
import { SecurityType } from './security.model';

export interface VisualContext {
  now: number; // Current percentage/value
  target: number; // Target percentage/value
  after: number; // After action percentage/value
}

export interface PortfolioInsight {
  message: string;
  severity: 'Info' | 'Warning' | 'Critical';
  type?: 'Rebalancing' | 'PerformanceMilestone' | 'DiversificationWarning';
  ticker?: string | null;
  amount?: number | null;
  actionLabel?: string | null; // e.g., "Sell €242", "Buy €150"
  visualContext?: VisualContext | null; // For bar chart visualization
}

export interface PortfolioItem {
  ticker: string;
  companyName: string;
  totalShares: number;
  totalCost: number;
  averageSharePrice: number;
  transactions: Transaction[];
  securityType?: SecurityType;

  // Strategic Allocation fields (from backend - Source of Truth)
  targetAllocationPercentage: number; // e.g., 30 for 30%
  currentAllocationPercentage: number; // e.g., 31.5 for 31.5%
  allocationDifference: number; // e.g., 1.5 for 1.5% overweight
  rebalanceAmount: number; // e.g., 160 for "Sell ~€160"
  rebalancingStatus: string; // "Balanced", "Overweight", or "Underweight"
  
  // Pending sync state (for optimistic updates)
  pendingSync?: boolean; // true when local changes are pending backend sync
}
