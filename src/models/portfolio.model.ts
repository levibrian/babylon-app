import { Transaction } from './transaction.model';
import { SecurityType } from './security.model';

export interface VisualContext {
  currentValue: number; // Current percentage/value
  targetValue: number; // Target percentage/value
  projectedValue: number | null; // After action percentage/value
  format: "Currency" | "Percent";
}

export interface PortfolioInsight {
  category: "Risk" | "Opportunity" | "Trend" | "Efficiency" | "Income";
  title: string;
  message: string;
  relatedTicker: string | null;
  metadata: Record<string, any>;
  severity: "Info" | "Warning" | "Critical";
  actionLabel: string | null;
  actionPayload: any | null;
  visualContext: VisualContext | null;
}

export interface PortfolioItem {
  ticker: string;
  companyName: string;
  totalShares: number;
  totalCost: number;
  averageSharePrice: number;
  transactions: Transaction[];
  securityType?: SecurityType;

  // Security metadata (NEW)
  sector?: string | null;
  industry?: string | null;
  geography?: string | null;
  marketCap?: number | null;

  // Strategic Allocation fields (from backend - Source of Truth)
  targetAllocationPercentage: number; // e.g., 30 for 30%
  currentAllocationPercentage: number; // e.g., 31.5 for 31.5%
  allocationDifference: number; // e.g., 1.5 for 1.5% overweight
  rebalanceAmount: number | null; // e.g., 160 for "Sell ~€160"
  rebalancingStatus: "Balanced" | "Overweight" | "Underweight";
  
  // Pending sync state (for optimistic updates)
  pendingSync?: boolean; // true when local changes are pending backend sync
}
