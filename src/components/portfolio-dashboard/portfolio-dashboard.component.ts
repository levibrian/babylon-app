import { Component, ChangeDetectionStrategy, input, computed, Signal, inject, signal, OnDestroy, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { PortfolioItem } from '../../models/portfolio.model';
import { Transaction } from '../../models/transaction.model';
import { PortfolioService } from '../../services/portfolio.service';
import { SecurityType } from '../../models/security.model';
import { PortfolioHistoryChartComponent } from '../portfolio-history-chart/portfolio-history-chart.component';

interface AllocationSegment {
  label: string;
  value: number;
  color: string;
  percentage: number;
}

interface MonthlyIncome {
  month: string;
  amount: number;
  monthIndex: number;
}

interface DiversityAnalysis {
  score: number;
  label: string;
  color: string;
  warnings: string[];
  positiveFactors: string[];
}

interface PortfolioInsight {
  label: string;
  status: 'good' | 'warning' | 'critical';
  icon: string;
}

interface HealthScore {
  score: number;
  label: string;
  colorClass: string;
}

@Component({
  selector: 'app-portfolio-dashboard',
  templateUrl: './portfolio-dashboard.component.html',
  imports: [CommonModule, CurrencyPipe, PortfolioHistoryChartComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PortfolioDashboardComponent implements OnInit, OnDestroy {
  portfolio = input.required<PortfolioItem[]>();
  transactions = input.required<Transaction[]>();
  private portfolioService = inject(PortfolioService);

  // Grouping mode toggle: 'asset' | 'category'
  groupingMode = signal<'asset' | 'category'>('category');

  // Insights carousel state
  activeInsightIndex = signal(0);
  private carouselInterval: any;

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

  // Portfolio Insights (Analyst's Note)
  portfolioInsights = computed<PortfolioInsight[]>(() => {
    const items = this.portfolio();
    const insights: PortfolioInsight[] = [];

    if (items.length === 0) {
      return [{
        label: 'No portfolio data available',
        status: 'critical',
        icon: 'alert',
      }];
    }

    // Calculate metrics
    const assetCount = items.length;
    const maxConcentrationItem = [...items].sort((a, b) => b.currentAllocationPercentage - a.currentAllocationPercentage)[0];
    const maxConcentration = maxConcentrationItem?.currentAllocationPercentage || 0;
    
    const uniqueTypes = new Set<SecurityType | string>();
    items.forEach(item => {
      const type = item.securityType ?? (item.transactions?.[0]?.securityType);
      if (type !== undefined && type !== null) {
        uniqueTypes.add(type as any);
      }
    });
    const assetClasses = uniqueTypes.size;

    // Rule 1: Asset Count
    if (assetCount > 5) {
      insights.push({
        label: 'Well diversified (>5 assets)',
        status: 'good',
        icon: 'check',
      });
    } else {
      insights.push({
        label: 'Concentrated portfolio',
        status: 'warning',
        icon: 'alert',
      });
    }

    // Rule 2: Max Concentration
    if (maxConcentration < 25) {
      insights.push({
        label: 'No single asset > 25%',
        status: 'good',
        icon: 'check',
      });
    } else {
      insights.push({
        label: `High exposure to ${maxConcentrationItem.ticker} (${maxConcentration.toFixed(1)}%)`,
        status: 'warning',
        icon: 'alert',
      });
    }

    // Rule 3: Asset Classes
    if (assetClasses >= 3) {
      insights.push({
        label: 'Multiple asset classes',
        status: 'good',
        icon: 'check',
      });
    } else {
      insights.push({
        label: 'Limited asset class exposure',
        status: 'warning',
        icon: 'alert',
      });
    }

    return insights;
  });

  // Health Score
  healthScore = computed<HealthScore>(() => {
    const insights = this.portfolioInsights();
    let score = 10;

    insights.forEach(insight => {
      if (insight.status === 'warning') {
        score -= 2;
      } else if (insight.status === 'critical') {
        score -= 3;
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

  // Active insight for carousel
  activeInsight = computed(() => {
    const insights = this.portfolioInsights();
    const index = this.activeInsightIndex();
    if (insights.length === 0) return null;
    return insights[index % insights.length];
  });

  ngOnInit(): void {
    // Start carousel rotation
    this.carouselInterval = setInterval(() => {
      const insights = this.portfolioInsights();
      if (insights.length > 0) {
        const currentIndex = this.activeInsightIndex();
        this.activeInsightIndex.set((currentIndex + 1) % insights.length);
      }
    }, 3500); // Rotate every 3.5 seconds
  }

  ngOnDestroy(): void {
    if (this.carouselInterval) {
      clearInterval(this.carouselInterval);
    }
  }

  // Allocation segments grouped by category or asset
  allocationSegments = computed(() => {
    const items = this.portfolio();
    const mode = this.groupingMode();
    
    // Calculate current market value for each position
    // Since we don't have individual position current values, we'll use totalCost
    // but calculate percentages based on the sum of totalCost (not netWorth)
    // This ensures percentages add up to 100% correctly
    const totalCostBasis = items.reduce((sum, item) => sum + item.totalCost, 0);
    
    if (totalCostBasis === 0) return [];

    const colors: Record<string, string> = {
      'Stock': '#2563EB',      // Blue-600
      'ETF': '#6366F1',        // Indigo-500
      'Crypto': '#FBBF24',     // Amber-400
      'MutualFund': '#8B5CF6', // Purple
      'Bond': '#06B6D4',       // Cyan
      'REIT': '#EC4899',       // Pink
      'Options': '#F97316',    // Orange
      'Commodity': '#84CC16',  // Lime
      'Cash': '#9CA3AF',       // Gray-400
    };

    const assetColors = [
      '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6',
      '#EC4899', '#06B6D4', '#F97316', '#84CC16',
    ];

    if (mode === 'category') {
      // Group by SecurityType
      const categoryMap = new Map<string, number>();
      
      items.forEach(item => {
        // Try to get securityType from item, then from transactions, then default to Stock
        // Backend may send as string ("ETF") or number (2), so we handle both
        let type: SecurityType | string | undefined = item.securityType as any;
        
        // If not on item, try to get from first transaction
        if ((type === undefined || type === null) && item.transactions && item.transactions.length > 0) {
          type = item.transactions[0].securityType as any;
        }
        
        // If still undefined, default to Stock enum value
        if (type === undefined || type === null) {
          type = SecurityType.Stock;
        }
        
        const categoryName = this.getSecurityTypeName(type);
        const currentValue = item.totalCost;
        
        categoryMap.set(
          categoryName,
          (categoryMap.get(categoryName) || 0) + currentValue
        );
      });

      const segments: AllocationSegment[] = [];

      categoryMap.forEach((value, label) => {
        const percentage = (value / totalCostBasis) * 100;
        segments.push({
          label,
          value,
          color: colors[label] || '#6B7280',
          percentage,
        });
      });

      return segments.sort((a, b) => b.value - a.value);
    } else {
      // Group by individual asset
      return items
        .map((item, index) => ({
          label: item.ticker,
          value: item.totalCost,
          color: assetColors[index % assetColors.length],
          percentage: (item.totalCost / totalCostBasis) * 100,
        }))
        .filter(seg => seg.value > 0)
        .sort((a, b) => b.value - a.value)
        .slice(0, 8); // Limit to top 8 for readability
    }
  });

  // Doughnut chart conic gradient string
  doughnutGradient = computed(() => {
    const segments = this.allocationSegments();
    if (segments.length === 0) return 'conic-gradient(#E5E7EB 0deg 360deg)';

    let currentAngle = 0;
    const gradientParts: string[] = [];

    segments.forEach(seg => {
      const angle = (seg.percentage / 100) * 360;
      if (angle > 0) {
        gradientParts.push(`${seg.color} ${currentAngle}deg ${currentAngle + angle}deg`);
        currentAngle += angle;
      }
    });

    // Fill remaining space if segments don't add up to 100%
    if (currentAngle < 360) {
      gradientParts.push(`transparent ${currentAngle}deg 360deg`);
    }

    return `conic-gradient(${gradientParts.join(', ')})`;
  });

  // Monthly income for last 12 months
  monthlyIncome = computed(() => {
    const transactions = this.transactions();
    // Filter for dividend transactions
    const incomeTransactions = transactions.filter(t => 
      t.transactionType === 'dividend'
    );
    
    // Get last 12 months
    const now = new Date();
    const months: MonthlyIncome[] = [];
    
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthIndex = date.getMonth();
      // Get first letter of month abbreviation (J, F, M, A, M, J, J, A, S, O, N, D)
      const monthLabel = date.toLocaleDateString('en-US', { month: 'short' }).charAt(0).toUpperCase();
      
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);
      
      const amount = incomeTransactions
        .filter(t => {
          const txDate = new Date(t.date);
          return txDate >= monthStart && txDate <= monthEnd;
        })
        .reduce((sum, t) => sum + t.totalAmount, 0);
      
      months.push({
        month: monthLabel,
        amount,
        monthIndex,
      });
    }
    
    return months;
  });

  maxMonthlyIncome = computed(() => {
    const months = this.monthlyIncome();
    if (months.length === 0) return 1;
    return Math.max(...months.map(m => m.amount), 1);
  });

  // Tooltip state
  activeTooltip = signal<{ x: number; y: number; text: string } | null>(null);

  showTooltip(event: MouseEvent, amount: number): void {
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
    
    this.activeTooltip.set({
      x: event.clientX,
      y: event.clientY,
      text: formatted,
    });
  }

  hideTooltip(): void {
    this.activeTooltip.set(null);
  }

  toggleGroupingMode(): void {
    this.groupingMode.update(mode => mode === 'asset' ? 'category' : 'asset');
  }

  getBarHeight(amount: number): number {
    const max = this.maxMonthlyIncome();
    if (max === 0) return 0;
    return Math.max((amount / max) * 100, 1);
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
}

