/**
 * Strategy Panel Models
 * Centralized type definitions for strategy-related components
 */

export interface StrategyItem {
  ticker: string;
  companyName: string;
  currentPercentage: number;
  targetPercentage: number;
  currentValue: number;
}

export interface Recommendation {
  ticker: string;
  companyName: string;
  buyAmount: number;
  delta: number;
}

export interface SectorAggregation {
  sector: string;
  currentPercentage: number;
  targetPercentage: number;
  currentValue: number;
}

export interface GeographyAggregation {
  geography: string;
  currentPercentage: number;
  targetPercentage: number;
  currentValue: number;
}

export interface ChartSegment {
  ticker: string;
  companyName: string;
  currentPercentage: number;
  targetPercentage: number;
  color: string;
}

export interface BarSegment {
  color: string;
  width: number;
  ticker: string;
  percentage: number;
  value: number;
}

export interface DeltaBarSegment {
  color: string;
  width: number;
  ticker: string;
  delta: number;
  deltaPercentage: number;
}

export interface DiversificationCardData {
  score: number;
  hhi: number;
  top5Concentration: number;
  totalAssets: number;
  effectiveN: number;
  level: 'Excellent' | 'Good' | 'Moderate' | 'Poor';
  levelColor: 'emerald' | 'amber' | 'red';
}

export interface RiskCardData {
  riskLevel: 'Conservative' | 'Moderate' | 'Aggressive';
  beta: number;
  betaLabel: string;
  betaColor: 'emerald' | 'red' | 'gray';
  volatility: number;
  sharpeRatio: number;
  sharpeLabel: string;
  sharpeColor: 'emerald' | 'amber' | 'red' | 'gray';
  annualizedReturn: number;
  period: string;
}

export interface RebalancingActionsCardData {
  topActions: Array<{
    ticker: string;
    securityName: string;
    currentAllocationPercentage: number;
    targetAllocationPercentage: number;
    differenceValue: number;
    actionType: 'Buy' | 'Sell';
  }>;
  totalBuyAmount: number;
  totalSellAmount: number;
  netCashFlow: number;
}

