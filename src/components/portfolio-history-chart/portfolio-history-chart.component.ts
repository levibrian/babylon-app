import { Component, ChangeDetectionStrategy, input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Transaction } from '../../models/transaction.model';

interface DataPoint {
  date: Date;
  value: number;
}

type TimeRange = '1W' | '1M' | '6M' | '1Y' | 'ALL';

@Component({
  selector: 'app-portfolio-history-chart',
  templateUrl: './portfolio-history-chart.component.html',
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PortfolioHistoryChartComponent {
  transactions = input.required<Transaction[]>();
  selectedRange = signal<TimeRange>('ALL');
  
  // Available time ranges for the selector
  readonly timeRanges: TimeRange[] = ['1W', '1M', '6M', '1Y', 'ALL'];

  // Interactive tooltip state
  activePoint = signal<{ x: number; y: number; value: number; date: Date; screenX: number; screenY: number; chartWidth: number; containerX: number } | null>(null);

  // Computed: Check if tooltip should flip to left (near right edge)
  isNearRightEdge = computed(() => {
    const point = this.activePoint();
    if (!point) return false;
    // If past 70% of viewport width, flip to left (accounting for tooltip width ~150px)
    const viewportWidth = window.innerWidth;
    const tooltipWidth = 150; // Approximate tooltip width
    return (point.screenX + tooltipWidth) > viewportWidth;
  });

  // Process transactions into invested capital history with daily buckets
  chartPoints = computed<DataPoint[]>(() => {
    const txs = this.transactions();
    if (txs.length === 0) return [];

    // Filter buy and sell transactions, sort by date
    const sortedTxs = [...txs]
      .filter(tx => tx.transactionType === 'buy' || tx.transactionType === 'sell')
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (sortedTxs.length === 0) return [];

    // Get date range
    const firstDate = new Date(sortedTxs[0].date);
    const lastDate = new Date(sortedTxs[sortedTxs.length - 1].date);
    
    // Create daily buckets
    const dailyBuckets = new Map<string, number>();
    
    // Initialize all days from first transaction to today with 0
    const now = new Date();
    const endDate = lastDate > now ? lastDate : now;
    const currentDate = new Date(firstDate);
    currentDate.setHours(0, 0, 0, 0);
    
    while (currentDate <= endDate) {
      const dateKey = currentDate.toISOString().split('T')[0];
      dailyBuckets.set(dateKey, 0);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Process transactions into daily buckets
    sortedTxs.forEach(tx => {
      const txDate = new Date(tx.date);
      txDate.setHours(0, 0, 0, 0);
      const dateKey = txDate.toISOString().split('T')[0];
      
      const currentValue = dailyBuckets.get(dateKey) || 0;
      if (tx.transactionType === 'buy') {
        dailyBuckets.set(dateKey, currentValue + Math.abs(tx.totalAmount));
      } else if (tx.transactionType === 'sell') {
        dailyBuckets.set(dateKey, currentValue - Math.abs(tx.totalAmount));
      }
    });

    // Convert to cumulative values (value = previousValue + (buys - sells))
    const points: DataPoint[] = [];
    let cumulativeValue = 0;
    
    const sortedDates = Array.from(dailyBuckets.keys()).sort();
    sortedDates.forEach(dateKey => {
      const dailyChange = dailyBuckets.get(dateKey) || 0;
      cumulativeValue += dailyChange;
      // Ensure non-negative (invested capital can't go below 0)
      cumulativeValue = Math.max(0, cumulativeValue);
      
      points.push({
        date: new Date(dateKey),
        value: cumulativeValue,
      });
    });

    // Filter based on selectedRange (slice array)
    const range = this.selectedRange();
    let filteredPoints = points;

    switch (range) {
      case '1W':
        filteredPoints = points.slice(-7);
        break;
      case '1M':
        filteredPoints = points.slice(-30);
        break;
      case '6M':
        filteredPoints = points.slice(-180);
        break;
      case '1Y':
        filteredPoints = points.slice(-365);
        break;
      case 'ALL':
      default:
        filteredPoints = points;
    }

    return filteredPoints;
  });

  // Get min/max values for scaling (Y-axis labels)
  minValue = computed(() => {
    const data = this.chartPoints();
    if (data.length === 0) return 0;
    return Math.min(...data.map(d => d.value));
  });

  maxValue = computed(() => {
    const data = this.chartPoints();
    if (data.length === 0) return 1;
    return Math.max(...data.map(d => d.value), 1);
  });

  // SVG dimensions
  readonly width = 800;
  readonly height = 200;
  readonly padding = { top: 20, right: 40, bottom: 30, left: 60 };

  // Helper function to convert chartPoints to SVG polyline points string
  svgPath = computed(() => {
    const data = this.chartPoints();
    if (data.length === 0) return '';

    const min = this.minValue();
    const max = this.maxValue();
    const valueRange = max - min || 1;
    const chartWidth = this.width - this.padding.left - this.padding.right;
    const chartHeight = this.height - this.padding.top - this.padding.bottom;

    // Get date range for X-axis mapping
    const dates = data.map(d => d.date);
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
    const dateRange = maxDate.getTime() - minDate.getTime() || 1;

    // Map each point: X = date position (0-100% width), Y = value position (inverted, 0 is bottom)
    const points = data.map((point) => {
      const x = this.padding.left + (chartWidth * (point.date.getTime() - minDate.getTime()) / dateRange);
      const y = this.padding.top + chartHeight - (chartHeight * (point.value - min) / valueRange);
      return `${x},${y}`;
    });

    return points.join(' ');
  });

  // Calculate SVG path for gradient fill area
  svgAreaPath = computed(() => {
    const data = this.chartPoints();
    if (data.length === 0) return '';

    const min = this.minValue();
    const max = this.maxValue();
    const valueRange = max - min || 1;
    const chartWidth = this.width - this.padding.left - this.padding.right;
    const chartHeight = this.height - this.padding.top - this.padding.bottom;

    const dates = data.map(d => d.date);
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
    const dateRange = maxDate.getTime() - minDate.getTime() || 1;

    const firstPoint = data[0];
    const lastPoint = data[data.length - 1];

    const firstX = this.padding.left + (chartWidth * (firstPoint.date.getTime() - minDate.getTime()) / dateRange);
    const lastX = this.padding.left + (chartWidth * (lastPoint.date.getTime() - minDate.getTime()) / dateRange);
    const bottomY = this.padding.top + chartHeight;

    const linePoints = data.map((point) => {
      const x = this.padding.left + (chartWidth * (point.date.getTime() - minDate.getTime()) / dateRange);
      const y = this.padding.top + chartHeight - (chartHeight * (point.value - min) / valueRange);
      return `${x},${y}`;
    });

    return `M ${firstX},${bottomY} L ${linePoints.join(' L ')} L ${lastX},${bottomY} Z`;
  });

  // Format date for display
  formatDate(date: Date): string {
    const range = this.selectedRange();
    if (range === '1W') {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } else if (range === '1M' || range === '6M') {
      return date.toLocaleDateString('en-US', { month: 'short' });
    } else {
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
    }
  }

  // Get start and end date labels
  startDateLabel = computed(() => {
    const data = this.chartPoints();
    if (data.length === 0) return '';
    return this.formatDate(data[0].date);
  });

  endDateLabel = computed(() => {
    const data = this.chartPoints();
    if (data.length === 0) return '';
    return this.formatDate(data[data.length - 1].date);
  });

  // Format currency for Y-axis
  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }

  // Y-axis labels (min and max)
  minLabel = computed(() => this.formatCurrency(this.minValue()));
  maxLabel = computed(() => this.formatCurrency(this.maxValue()));

  selectRange(range: TimeRange): void {
    this.selectedRange.set(range);
  }

  // Handle mouse move on chart
  onChartMouseMove(event: MouseEvent, svgElement: SVGSVGElement): void {
    const data = this.chartPoints();
    if (data.length === 0) {
      this.activePoint.set(null);
      return;
    }

    const rect = svgElement.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    // Convert mouse X to SVG coordinates
    const svgPoint = svgElement.createSVGPoint();
    svgPoint.x = mouseX;
    svgPoint.y = mouseY;
    const svgCoords = svgPoint.matrixTransform(svgElement.getScreenCTM()?.inverse());

    const chartWidth = this.width - this.padding.left - this.padding.right;
    const chartHeight = this.height - this.padding.top - this.padding.bottom;

    // Get date range for X-axis mapping
    const dates = data.map(d => d.date);
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
    const dateRange = maxDate.getTime() - minDate.getTime() || 1;

    // Check if mouse is within chart bounds
    if (svgCoords.x < this.padding.left || svgCoords.x > this.width - this.padding.right) {
      this.activePoint.set(null);
      return;
    }

    // Find closest data point based on X position
    const relativeX = svgCoords.x - this.padding.left;
    const dateRatio = relativeX / chartWidth;
    const targetDate = new Date(minDate.getTime() + dateRatio * dateRange);

    // Find closest point
    let closestPoint = data[0];
    let minDistance = Math.abs(targetDate.getTime() - data[0].date.getTime());

    for (const point of data) {
      const distance = Math.abs(targetDate.getTime() - point.date.getTime());
      if (distance < minDistance) {
        minDistance = distance;
        closestPoint = point;
      }
    }

    // Calculate Y position for the point
    const min = this.minValue();
    const max = this.maxValue();
    const valueRange = max - min || 1;
    const y = this.padding.top + chartHeight - (chartHeight * (closestPoint.value - min) / valueRange);
    const x = this.padding.left + (chartWidth * (closestPoint.date.getTime() - minDate.getTime()) / dateRange);

    // Convert SVG coordinates to screen coordinates for tooltip
    // Calculate the scale factor from viewBox to actual rendered size
    const viewBoxWidth = 800;
    const viewBoxHeight = 200;
    const scaleX = rect.width / viewBoxWidth;
    const scaleY = rect.height / viewBoxHeight;
    
    const containerX = x * scaleX;
    const containerY = y * scaleY;
    
    // Convert to screen coordinates (for fixed positioning)
    const screenX = rect.left + containerX;
    const screenY = rect.top + containerY;

    this.activePoint.set({
      x,
      y,
      value: closestPoint.value,
      date: closestPoint.date,
      screenX,
      screenY,
      chartWidth: rect.width,
      containerX,
    });
  }

  // Handle mouse leave
  onChartMouseLeave(): void {
    this.activePoint.set(null);
  }

  // Format date for tooltip
  formatTooltipDate(date: Date): string {
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  // Format currency for tooltip
  formatTooltipCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }
}

