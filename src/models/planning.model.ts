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

// Form-specific interfaces
export interface PlanningRowFormValue {
  ticker: string;
  securityName: string | null;
  assetType: 'Stocks' | 'ETFs' | 'Crypto';
  targetPercentage: number;
  isWeeklyEnabled: boolean;
  isBiWeeklyEnabled: boolean;
  isMonthlyEnabled: boolean;
  weeklyEur: number;
  biWeeklyEur: number;
  monthlyEur: number;
}

export interface PlanningFormValue {
  monthlyInvestment: number;
  rows: PlanningRowFormValue[];
}
