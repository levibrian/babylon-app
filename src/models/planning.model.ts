export interface PlanningRow {
  ticker: string;
  assetType: 'Stocks' | 'ETFs' | 'Crypto';
  weeklyEur: number;
  biWeeklyEur: number;
  monthlyEur: number;
  targetPercentage: number;
  isWeeklyEnabled: boolean;
  isBiWeeklyEnabled: boolean;
  isMonthlyEnabled: boolean;
  securityName?: string;
}

export interface AssetGroup {
  assetType: string;
  rows: PlanningRow[];
  isExpanded?: boolean;
}
