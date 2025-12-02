import { Component, ChangeDetectionStrategy, input, computed, signal } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { Transaction } from '../../models/transaction.model';
import { PortfolioItem } from '../../models/portfolio.model';
import { PortfolioHistoryChartComponent } from '../portfolio-history-chart/portfolio-history-chart.component';
import { MilestoneTrackerComponent } from '../milestone-tracker/milestone-tracker.component';
import { PassiveIncomeCalendarComponent } from '../passive-income-calendar/passive-income-calendar.component';

interface MonthlyData {
  month: string;
  amount: number;
  monthIndex: number;
}

interface CombinedMonthlyData {
  month: string;
  monthIndex: number;
  income: number;
  deposits: number;
}

@Component({
  selector: 'app-transactions-dashboard',
  templateUrl: './transactions-dashboard.component.html',
  imports: [CommonModule, CurrencyPipe, PortfolioHistoryChartComponent, MilestoneTrackerComponent, PassiveIncomeCalendarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransactionsDashboardComponent {
  transactions = input.required<Transaction[]>();
  totalInvested = input.required<number>();
  portfolio = input.required<PortfolioItem[]>();

  // Tooltip state for bar charts
  activeTooltip = signal<{ x: number; y: number; text: string } | null>(null);

  // Total Passive Income (sum of all dividends)
  totalIncome = computed(() => {
    const transactions = this.transactions();
    return transactions
      .filter(t => t.transactionType === 'dividend')
      .reduce((sum, t) => sum + t.totalAmount, 0);
  });

  // Passive Flow (Income) - Sum dividend transactions by month
  monthlyIncome = computed(() => {
    const transactions = this.transactions();
    const incomeTransactions = transactions.filter(t => t.transactionType === 'dividend');
    
    // Get last 12 months
    const now = new Date();
    const months: MonthlyData[] = [];
    
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthIndex = date.getMonth();
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
    if (months.length === 0) return 0;
    const max = Math.max(...months.map(m => m.amount), 0);
    // Ensure we have at least 1 to avoid division by zero, but return 0 if truly no income
    return max > 0 ? max : 0;
  });

  // Monthly Deposits (DCA) - Sum buy transaction amounts by month
  monthlyDeposits = computed(() => {
    const transactions = this.transactions();
    const buyTransactions = transactions.filter(t => t.transactionType === 'buy');
    
    // Get last 12 months
    const now = new Date();
    const months: MonthlyData[] = [];
    
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthIndex = date.getMonth();
      const monthLabel = date.toLocaleDateString('en-US', { month: 'short' }).charAt(0).toUpperCase();
      
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);
      
      const amount = buyTransactions
        .filter(t => {
          const txDate = new Date(t.date);
          return txDate >= monthStart && txDate <= monthEnd;
        })
        .reduce((sum, t) => sum + Math.abs(t.totalAmount), 0);
      
      months.push({
        month: monthLabel,
        amount,
        monthIndex,
      });
    }
    
    return months;
  });

  maxMonthlyDeposits = computed(() => {
    const months = this.monthlyDeposits();
    if (months.length === 0) return 0;
    const max = Math.max(...months.map(m => m.amount), 0);
    return max > 0 ? max : 0;
  });

  // Combined maximum for both income and deposits (for relative scaling)
  maxCombinedCashFlow = computed(() => {
    const income = this.monthlyIncome();
    const deposits = this.monthlyDeposits();
    
    // Find the maximum value across both income and deposits
    const allValues = [
      ...income.map(m => m.amount),
      ...deposits.map(m => m.amount),
    ];
    
    const max = Math.max(...allValues, 0);
    return max > 0 ? max : 0;
  });

  // Combined monthly data for stacked bar chart
  combinedMonthlyData = computed(() => {
    const income = this.monthlyIncome();
    const deposits = this.monthlyDeposits();
    const combined: CombinedMonthlyData[] = [];
    
    for (let i = 0; i < 12; i++) {
      combined.push({
        month: income[i].month,
        monthIndex: income[i].monthIndex,
        income: income[i].amount,
        deposits: deposits[i].amount,
      });
    }
    
    return combined;
  });


  // Helper for percentage-based height
  getBarHeight(amount: number, max: number): number {
    if (max === 0 || amount === 0) return 0;
    const percentage = (amount / max) * 100;
    // Ensure minimum 3% height for visibility when there's data, but don't exceed 100%
    return Math.min(Math.max(percentage, 3), 100);
  }

  showCombinedTooltip(event: MouseEvent, monthData: CombinedMonthlyData): void {
    const incomeText = monthData.income > 0 
      ? `Income: ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(monthData.income)}`
      : '';
    const depositsText = monthData.deposits > 0
      ? `Deposits: ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(monthData.deposits)}`
      : '';
    
    const tooltipText = [incomeText, depositsText].filter(Boolean).join('<br>');
    
    this.activeTooltip.set({
      x: event.clientX,
      y: event.clientY,
      text: tooltipText,
    });
  }

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
    const totalInvested = recentBuys.reduce((sum, t) => sum + Math.abs(t.totalAmount), 0);
    
    // Average monthly contribution over 6 months
    return totalInvested / 6;
  });
}

