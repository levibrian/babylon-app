import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, CurrencyPipe, DecimalPipe } from '@angular/common';

@Component({
  selector: 'app-portfolio-design-demo',
  templateUrl: './portfolio-design-demo.component.html',
  imports: [CommonModule, CurrencyPipe, DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PortfolioDesignDemoComponent {
  // Static demo data
  demoPositions = [
    {
      ticker: 'AAPL',
      companyName: 'Apple Inc.',
      totalShares: 1250.5,
      totalCost: 56500.75,
      averageSharePrice: 45.20,
      targetAllocationPercentage: 30.0,
      currentAllocationPercentage: 32.5,
      allocationDifference: 2.5,
      rebalanceAmount: 1600,
      rebalancingStatus: 'Overweight',
    },
    {
      ticker: 'MSFT',
      companyName: 'Microsoft Corporation',
      totalShares: 800.25,
      totalCost: 32000.50,
      averageSharePrice: 40.00,
      targetAllocationPercentage: 25.0,
      currentAllocationPercentage: 18.4,
      allocationDifference: -6.6,
      rebalanceAmount: 2200,
      rebalancingStatus: 'Underweight',
    },
    {
      ticker: 'GOOGL',
      companyName: 'Alphabet Inc.',
      totalShares: 500.0,
      totalCost: 75000.00,
      averageSharePrice: 150.00,
      targetAllocationPercentage: 35.0,
      currentAllocationPercentage: 35.0,
      allocationDifference: 0,
      rebalanceAmount: 0,
      rebalancingStatus: 'Balanced',
    },
  ];

  getCurrentAllocationColorClass(item: any): string {
    switch (item.rebalancingStatus) {
      case 'Overweight':
        return 'text-red-600';
      case 'Underweight':
        return 'text-green-600';
      case 'Balanced':
      default:
        return 'text-gray-900';
    }
  }

  getRebalancingStatusClass(item: any): string {
    switch (item.rebalancingStatus) {
      case 'Overweight':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'Underweight':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Balanced':
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  }

  getRebalancingText(item: any): string {
    const absAmount = Math.abs(item.rebalanceAmount);
    switch (item.rebalancingStatus) {
      case 'Overweight':
        return `Sell €${absAmount.toFixed(0)}`;
      case 'Underweight':
        return `Buy €${absAmount.toFixed(0)}`;
      case 'Balanced':
      default:
        return 'Balanced';
    }
  }
}

