import { Component, ChangeDetectionStrategy, input, computed } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { PortfolioItem } from '../../models/portfolio.model';

interface UpcomingEvent {
  date: Date;
  ticker: string;
  companyName: string;
  amount: number;
  logoColor: string;
}

@Component({
  selector: 'app-passive-income-calendar',
  templateUrl: './passive-income-calendar.component.html',
  imports: [CommonModule, CurrencyPipe, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PassiveIncomeCalendarComponent {
  portfolio = input.required<PortfolioItem[]>();

  // Generate mock upcoming dividend events for the next 30 days
  upcomingEvents = computed<UpcomingEvent[]>(() => {
    const items = this.portfolio();
    const events: UpcomingEvent[] = [];
    const today = new Date();
    
    // Generate a color palette for avatars
    const colors = [
      '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
      '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
    ];

    items.forEach((item, index) => {
      // Skip items that don't typically pay dividends (crypto, etc.)
      // For MVP, include all items
      
      // Generate a random date within the next 30 days
      const daysFromNow = Math.floor(Math.random() * 30) + 1;
      const eventDate = new Date(today);
      eventDate.setDate(today.getDate() + daysFromNow);
      
      // Estimate dividend amount (mock: 1-3% of position value annually, prorated)
      const annualYield = 0.01 + (Math.random() * 0.02); // 1-3% yield
      const quarterlyAmount = (item.totalCost * annualYield) / 4;
      
      events.push({
        date: eventDate,
        ticker: item.ticker,
        companyName: item.companyName,
        amount: quarterlyAmount,
        logoColor: colors[index % colors.length],
      });
    });

    // Sort by date (soonest first)
    return events.sort((a, b) => a.date.getTime() - b.date.getTime());
  });

  // Helper to get initials for avatar
  getInitials(ticker: string): string {
    return ticker.substring(0, 2).toUpperCase();
  }
}

