import { Component, ChangeDetectionStrategy, input, computed, Signal, inject } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { Router } from '@angular/router';
import { PortfolioItem, PortfolioInsight } from '../../models/portfolio.model';
import { Transaction, NewTransactionData } from '../../models/transaction.model';
import { PortfolioService } from '../../services/portfolio.service';
import { SecurityType } from '../../models/security.model';
import { InsightCardComponent } from '../insight-card/insight-card.component';
import { MilestoneTrackerComponent } from '../milestone-tracker/milestone-tracker.component';

interface AllocationSegment {
  label: string;
  value: number;
  color: string;
  percentage: number;
}

interface DiversityAnalysis {
  score: number;
  label: string;
  color: string;
  warnings: string[];
  positiveFactors: string[];
}

interface HealthScore {
  score: number;
  label: string;
  colorClass: string;
}

@Component({
  selector: 'app-portfolio-dashboard',
  templateUrl: './portfolio-dashboard.component.html',
  imports: [CommonModule, CurrencyPipe, InsightCardComponent, MilestoneTrackerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PortfolioDashboardComponent {
  portfolio = input.required<PortfolioItem[]>();
  transactions = input.required<Transaction[]>();
  private portfolioService = inject(PortfolioService);
  private router = inject(Router);


  // Computed KPIs
  netWorth = computed(() => {
    // Use totalPortfolioValue from service which includes daily gain/loss
    // This represents the current market value (cost basis + unrealized gains)
    return this.portfolioService.totalPortfolioValue();
  });

  totalInvested = computed(() => {
    const items = this.portfolio();
    return items.reduce((sum, item) => sum + item.totalCost, 0);
  });

  absolutePnL = computed(() => {
    return this.netWorth() - this.totalInvested();
  });

  percentPnL = computed(() => {
    const invested = this.totalInvested();
    if (invested === 0) return 0;
    return (this.absolutePnL() / invested) * 100;
  });

  totalIncome = computed(() => {
    const transactions = this.transactions();
    return transactions
      .filter(t => t.transactionType === 'dividend')
      .reduce((sum, t) => sum + t.totalAmount, 0);
  });

  // Estimate monthly contribution from recent buy transactions
  estimatedMonthlyContribution = computed(() => {
    const transactions = this.transactions();
    const buyTransactions = transactions.filter(t => t.transactionType === 'buy');
    
    if (buyTransactions.length === 0) return 0;
    
    // Get transactions from last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const recentBuys = buyTransactions.filter(t => {
      const txDate = new Date(t.date);
      return txDate >= sixMonthsAgo;
    });
    
    if (recentBuys.length === 0) return 0;
    
    // Calculate total invested in last 6 months
    const totalInvested = recentBuys.reduce((sum, t) => sum + t.totalAmount, 0);
    
    // Average monthly contribution over 6 months
    return totalInvested / 6;
  });

  // Portfolio Insights from backend API
  portfolioInsights = computed<PortfolioInsight[]>(() => {
    const backendInsights = this.portfolioService.insights();
    
    // If no insights from backend, return empty array (or fallback message)
    if (!backendInsights || backendInsights.length === 0) {
      return [];
    }
    
    return backendInsights;
  });

  // Health Score (computed from backend insights)
  healthScore = computed<HealthScore>(() => {
    const insights = this.portfolioInsights();
    let score = 10;

    insights.forEach(insight => {
      if (insight.severity === 'Warning') {
        score -= 2;
      } else if (insight.severity === 'Critical') {
        score -= 3;
      } else if (insight.severity === 'Info') {
        score -= 0.5; // Info insights have minimal impact
      }
    });

    score = Math.max(0, score);

    let label: string;
    let colorClass: string;

    if (score >= 8) {
      label = 'HEALTHY';
      colorClass = 'bg-emerald-50 text-emerald-600';
    } else if (score >= 5) {
      label = 'MODERATE';
      colorClass = 'bg-amber-50 text-amber-600';
    } else {
      label = 'CRITICAL';
      colorClass = 'bg-rose-50 text-rose-600';
    }

    return {
      score,
      label,
      colorClass,
    };
  });


  /**
   * Handles insight card action execution.
   * Navigates to transactions page with pre-filled form data based on insight type.
   */
  handleInsightAction(insight: PortfolioInsight): void {
    if (!insight.ticker || !insight.amount) {
      console.warn('Insight missing required data for action:', insight);
      return;
    }

    const portfolioItem = this.portfolio().find(p => p.ticker === insight.ticker);
    if (!portfolioItem) {
      console.warn('Portfolio item not found for ticker:', insight.ticker);
      return;
    }

    if (insight.type === 'Rebalancing') {
      // Determine if it's a buy or sell based on amount sign or rebalancing status
      const isSell = portfolioItem.rebalancingStatus === 'Overweight' || (insight.amount && insight.amount > 0);
      const transactionType = isSell ? 'sell' : 'buy';
      
      // Navigate to transactions page with query params for pre-filling
      this.router.navigate(['/transactions'], {
        queryParams: {
          add: 'true',
          ticker: insight.ticker,
          type: transactionType,
          amount: Math.abs(insight.amount),
          shares: portfolioItem.totalShares > 0 ? Math.abs(insight.amount) / portfolioItem.averageSharePrice : undefined
        }
      });
    } else if (insight.type === 'PerformanceMilestone' && insight.actionLabel?.toLowerCase().includes('dividend')) {
      // For dividend insights
      this.router.navigate(['/transactions'], {
        queryParams: {
          add: 'true',
          ticker: insight.ticker,
          type: 'dividend',
          shares: portfolioItem.totalShares
        }
      });
    } else {
      // Default: navigate to transactions page
      this.router.navigate(['/transactions'], {
        queryParams: {
          add: 'true',
          ticker: insight.ticker
        }
      });
    }
  }



  // Helper function to get enum name from numeric value or string name
  private getSecurityTypeName(typeValue: SecurityType | string | undefined): string {
    // If it's already a string (enum name), return it directly
    if (typeof typeValue === 'string') {
      // Validate it's a valid SecurityType name
      const validNames = Object.keys(SecurityType).filter(key => isNaN(Number(key)));
      if (validNames.includes(typeValue)) {
        return typeValue;
      }
    }
    
    // If it's a number (enum value), look it up
    if (typeof typeValue === 'number') {
      const enumKeys = Object.keys(SecurityType).filter(key => isNaN(Number(key)));
      for (const key of enumKeys) {
        if (SecurityType[key as keyof typeof SecurityType] === typeValue) {
          return key;
        }
      }
    }
    
    return 'Stock'; // Default fallback
  }

  // Portfolio Diversity Analysis
  diversityAnalysis = computed<DiversityAnalysis>(() => {
    const items = this.portfolio();
    const totalValue = this.netWorth();

    if (items.length === 0 || totalValue === 0) {
      return {
        score: 0,
        label: 'CRITICAL',
        color: 'rose',
        warnings: ['No portfolio data available'],
        positiveFactors: [],
      };
    }

    let score = 0;
    const warnings: string[] = [];
    const positiveFactors: string[] = [];

    // 1. Asset Count Score (Max 3 pts)
    const assetCount = items.length;
    let assetCountScore = 0;
    if (assetCount < 3) {
      assetCountScore = 0;
      warnings.push('Low asset count');
    } else if (assetCount >= 3 && assetCount <= 5) {
      assetCountScore = 1.5;
    } else {
      assetCountScore = 3;
      positiveFactors.push(`Well diversified (>5 assets)`);
    }
    score += assetCountScore;

    // 2. Concentration Risk (Max 4 pts)
    // Find the largest holding by value
    const sortedByValue = [...items].sort((a, b) => b.totalCost - a.totalCost);
    const topHolding = sortedByValue[0];
    const topHoldingPercentage = (topHolding.totalCost / totalValue) * 100;

    let concentrationScore = 0;
    if (topHoldingPercentage > 50) {
      concentrationScore = 0;
      warnings.push(`High exposure to ${topHolding.companyName} (${topHoldingPercentage.toFixed(1)}%)`);
    } else if (topHoldingPercentage > 25) {
      concentrationScore = 2;
      warnings.push(`Moderate concentration in ${topHolding.companyName} (${topHoldingPercentage.toFixed(1)}%)`);
    } else {
      concentrationScore = 4;
      positiveFactors.push(`No single asset > 25%`);
    }
    score += concentrationScore;

    // 3. Asset Class Spread (Max 3 pts)
    const uniqueTypes = new Set<SecurityType>();
    items.forEach(item => {
      if (item.securityType !== undefined) {
        uniqueTypes.add(item.securityType);
      } else {
        uniqueTypes.add(SecurityType.Stock); // Default to Stock if undefined
      }
    });

    const typeCount = uniqueTypes.size;
    let spreadScore = 0;
    
    if (typeCount === 1) {
      spreadScore = 1;
      const typeName = this.getSecurityTypeName(Array.from(uniqueTypes)[0]);
      warnings.push(`Portfolio is ${typeName.toLowerCase()}-only`);
    } else if (typeCount === 2) {
      spreadScore = 2;
    } else {
      spreadScore = 3;
      positiveFactors.push(`Multiple asset classes (${typeCount} types)`);
    }
    score += spreadScore;

    // Determine label and color
    let label: string;
    let color: string;

    if (score >= 8) {
      label = 'HEALTHY';
      color = 'emerald';
    } else if (score >= 5) {
      label = 'CONCENTRATED';
      color = 'amber';
    } else {
      label = 'CRITICAL';
      color = 'rose';
    }

    return {
      score: Math.round(score * 10) / 10, // Round to 1 decimal place
      label,
      color,
      warnings,
      positiveFactors,
    };
  });

  // Health Checklist Booleans
  isDiversified = computed(() => {
    return this.portfolio().length > 5;
  });

  isSafeConcentration = computed(() => {
    const items = this.portfolio();
    const totalValue = this.netWorth();
    if (items.length === 0 || totalValue === 0) return false;
    
    const sortedByValue = [...items].sort((a, b) => b.totalCost - a.totalCost);
    const topHolding = sortedByValue[0];
    const topHoldingPercentage = (topHolding.totalCost / totalValue) * 100;
    
    return topHoldingPercentage < 25;
  });

  isMultiAsset = computed(() => {
    const items = this.portfolio();
    const uniqueTypes = new Set<SecurityType>();
    items.forEach(item => {
      if (item.securityType !== undefined) {
        uniqueTypes.add(item.securityType);
      } else {
        uniqueTypes.add(SecurityType.Stock);
      }
    });
    return uniqueTypes.size > 1;
  });

  assetClassCount = computed(() => {
    const items = this.portfolio();
    const uniqueTypes = new Set<SecurityType>();
    items.forEach(item => {
      if (item.securityType !== undefined) {
        uniqueTypes.add(item.securityType);
      } else {
        uniqueTypes.add(SecurityType.Stock);
      }
    });
    return uniqueTypes.size;
  });
}

