import { Component, ChangeDetectionStrategy, input, computed, Signal, inject, signal, effect, OnDestroy } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { Router } from '@angular/router';
import { PortfolioItem, PortfolioInsight } from '../../models/portfolio.model';
import { Transaction, NewTransactionData } from '../../models/transaction.model';
import { PortfolioService } from '../../services/portfolio.service';
import { SecurityType } from '../../models/security.model';
import { PassiveIncomeCalendarComponent } from '../passive-income-calendar/passive-income-calendar.component';
import { InsightCardComponent } from '../insight-card/insight-card.component';

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
  imports: [CommonModule, CurrencyPipe, PassiveIncomeCalendarComponent, InsightCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PortfolioDashboardComponent implements OnDestroy {
  portfolio = input.required<PortfolioItem[]>();
  transactions = input.required<Transaction[]>();
  private portfolioService = inject(PortfolioService);
  private router = inject(Router);

  // Carousel state
  currentInsightIndex = signal(0);
  private carouselTimeout: any;
  private readonly CAROUSEL_INTERVAL = 6000; // 6 seconds per insight

  constructor() {
    // Reset carousel and restart timer when insights change
    effect(() => {
      const insights = this.portfolioInsights();
      this.currentInsightIndex.set(0);
      this.restartCarousel();
    });
  }

  ngOnDestroy(): void {
    this.stopCarousel();
  }

  // Current insight to display
  currentInsight = computed(() => {
    const insights = this.portfolioInsights();
    const index = this.currentInsightIndex();
    return insights.length > 0 ? insights[index] : null;
  });

  // Navigate to specific insight
  goToInsight(index: number): void {
    this.currentInsightIndex.set(index);
    this.restartCarousel();
  }

  // Navigate to next insight
  nextInsight(): void {
    const insights = this.portfolioInsights();
    if (insights.length === 0) return;
    this.currentInsightIndex.update(i => (i + 1) % insights.length);
    this.restartCarousel();
  }

  // Navigate to previous insight
  prevInsight(): void {
    const insights = this.portfolioInsights();
    if (insights.length === 0) return;
    this.currentInsightIndex.update(i => (i - 1 + insights.length) % insights.length);
    this.restartCarousel();
  }

  private restartCarousel(): void {
    this.stopCarousel();
    const insights = this.portfolioInsights();
    if (insights.length > 1) {
      this.scheduleNextInsight();
    }
  }

  private scheduleNextInsight(): void {
    this.carouselTimeout = setTimeout(() => {
      const insights = this.portfolioInsights();
      this.currentInsightIndex.update(i => (i + 1) % (insights.length || 1));
      this.scheduleNextInsight();
    }, this.CAROUSEL_INTERVAL);
  }

  private stopCarousel(): void {
    if (this.carouselTimeout) {
      clearTimeout(this.carouselTimeout);
      this.carouselTimeout = undefined;
    }
  }


  // Computed KPIs
  netWorth = computed(() => {
    // Use totalPortfolioValue from service which calculates from currentMarketValue of each position
    // This represents the current market value based on current/last close prices
    return this.portfolioService.totalPortfolioValue();
  });

  totalInvested = computed(() => {
    // Total cost basis (what was actually invested)
    return this.portfolioService.totalInvested();
  });

  absolutePnL = computed(() => {
    // All-time P&L: current market value minus total invested
    return this.portfolioService.totalPnL();
  });

  percentPnL = computed(() => {
    // All-time P&L percentage
    return this.portfolioService.totalPnLPercentage();
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
    const localInsights: PortfolioInsight[] = [];
    const items = this.portfolio();
    const totalValue = this.netWorth();

    // 1. Generate Efficiency Insights for Rebalancing
    items.forEach(item => {
      if (item.rebalancingStatus !== 'Balanced' && item.rebalancingStatus) {
        // Safe check for rebalancingStatus as it might be undefined/null in edge cases
        localInsights.push({
          category: 'Efficiency',
          title: 'Rebalancing Opportunity',
          message: `${item.companyName} is ${item.rebalancingStatus.toLowerCase()} by ${(Math.abs(item.allocationDifference)).toFixed(1)}%.`,
          relatedTicker: item.ticker,
          severity: 'Warning',
          actionLabel: item.rebalancingStatus === 'Overweight' ? 'Reduce Position' : 'Increase Position',
          actionPayload: null,
          metadata: { amount: item.rebalanceAmount },
          visualContext: {
            currentValue: item.currentAllocationPercentage,
            targetValue: item.targetAllocationPercentage,
            projectedValue: item.targetAllocationPercentage, 
            format: 'Percent'
          }
        });
      }
    });

    // 2. Generate Risk Insights for Concentration
    if (items.length > 0 && totalValue > 0) {
      const sortedByValue = [...items].sort((a, b) => b.totalCost - a.totalCost);
      const topHolding = sortedByValue[0];
      const topHoldingPercentage = (topHolding.totalCost / totalValue) * 100;

      if (topHoldingPercentage > 25) {
         localInsights.push({
          category: 'Risk',
          title: 'High Concentration Risk',
          message: `${topHolding.companyName} makes up ${topHoldingPercentage.toFixed(1)}% of your portfolio.`,
          relatedTicker: topHolding.ticker,
          severity: topHoldingPercentage > 50 ? 'Critical' : 'Warning',
          actionLabel: 'Analyze',
          actionPayload: null,
          metadata: {},
          visualContext: {
            currentValue: topHoldingPercentage,
            targetValue: 15, // Suggested max
            projectedValue: null,
            format: 'Percent'
          }
         });
      }
    }

    // Combine backend and local insights
    // Deduplicate based on message/title to avoid showing same thing twice if backend sends it later
    const allInsights = [...(backendInsights || []), ...localInsights];
    
    // Sort by severity (Critical first)
    return allInsights.sort((a, b) => {
        const severityScore = { 'Critical': 3, 'Warning': 2, 'Info': 1 };
        return (severityScore[b.severity] || 0) - (severityScore[a.severity] || 0);
    });
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
    if (!insight.relatedTicker) {
      console.warn('Insight missing required data for action:', insight);
      return;
    }

    const portfolioItem = this.portfolio().find(p => p.ticker === insight.relatedTicker);
    if (!portfolioItem) {
      console.warn('Portfolio item not found for ticker:', insight.relatedTicker);
      return;
    }

    // Extract amount from metadata or actionPayload if available
    const amount = insight.metadata?.amount || insight.actionPayload?.amount || 
                   (insight.visualContext?.currentValue && insight.visualContext.format === 'Currency' 
                     ? insight.visualContext.currentValue : null);

    if (insight.category === 'Efficiency') {
      // Rebalancing insights - determine if it's a buy or sell based on rebalancing status
      const isSell = portfolioItem.rebalancingStatus === 'Overweight';
      const transactionType = isSell ? 'sell' : 'buy';
      
      // Navigate to transactions page with query params for pre-filling
      this.router.navigate(['/transactions'], {
        queryParams: {
          add: 'true',
          ticker: insight.relatedTicker,
          type: transactionType,
          amount: amount ? Math.abs(amount) : undefined,
          shares: portfolioItem.totalShares > 0 && amount ? Math.abs(amount) / portfolioItem.averageSharePrice : undefined
        }
      });
    } else if (insight.category === 'Income' && insight.actionLabel?.toLowerCase().includes('dividend')) {
      // For dividend insights
      this.router.navigate(['/transactions'], {
        queryParams: {
          add: 'true',
          ticker: insight.relatedTicker,
          type: 'dividend',
          shares: portfolioItem.totalShares
        }
      });
    } else {
      // Default: navigate to transactions page
      this.router.navigate(['/transactions'], {
        queryParams: {
          add: 'true',
          ticker: insight.relatedTicker
        }
      });
    }
  }



  // Helper function to get security type name from string or numeric value
  private getSecurityTypeName(typeValue: SecurityType | string | undefined): string {
    // If it's already a string, validate and return it
    if (typeof typeValue === 'string') {
      const validTypes: SecurityType[] = ["Stock", "ETF", "MutualFund", "Bond", "Crypto", "REIT", "Options", "Commodity"];
      if (validTypes.includes(typeValue as SecurityType)) {
        return typeValue === "MutualFund" ? "Mutual Fund" : typeValue;
      }
    }
    
    // If it's a number (backward compatibility with old enum values), look it up
    if (typeof typeValue === 'number') {
      const typeNames: Record<number, string> = {
        1: "Stock",
        2: "ETF",
        3: "Mutual Fund",
        4: "Bond",
        5: "Crypto",
        6: "REIT",
        7: "Options",
        8: "Commodity",
      };
      return typeNames[typeValue] || 'Stock';
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
        uniqueTypes.add("Stock"); // Default to Stock if undefined
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
        uniqueTypes.add("Stock");
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
        uniqueTypes.add("Stock");
      }
    });
    return uniqueTypes.size;
  });
}

