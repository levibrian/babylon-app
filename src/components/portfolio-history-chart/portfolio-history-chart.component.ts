import { Component, ChangeDetectionStrategy, computed, signal, inject } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { NgApexchartsModule } from 'ng-apexcharts';
import { PortfolioHistoryService } from '../../services/portfolio-history.service';
import { Timeframe } from '../../models/portfolio-history.model';
import type { ApexChart, ApexXAxis, ApexYAxis, ApexStroke, ApexTooltip, ApexGrid, ApexDataLabels } from 'ng-apexcharts';

@Component({
  selector: 'app-portfolio-history-chart',
  templateUrl: './portfolio-history-chart.component.html',
  imports: [CommonModule, NgApexchartsModule, DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PortfolioHistoryChartComponent {
  private readonly historyService = inject(PortfolioHistoryService);

  protected readonly isLoading = this.historyService.isLoading;
  protected readonly error = this.historyService.error;

  protected readonly activeTimeframe = signal<Timeframe>('1M');
  protected readonly timeframes: Timeframe[] = ['1D', '1W', '1M', '6M', '1Y', 'YTD', 'Max'];

  protected readonly filteredSnapshots = computed(() =>
    this.historyService.filterByTimeframe(this.activeTimeframe())
  );

  protected readonly summary = computed(() =>
    this.historyService.computeSummary(this.filteredSnapshots())
  );

  protected readonly chartSeries = computed(() => [
    {
      name: 'Performance',
      data: this.filteredSnapshots().map(s => [
        s.timestamp * 1000, // Unix seconds → milliseconds
        s.unrealizedPnL + s.realizedPnL,
      ]),
    },
  ]);

  protected readonly isPositive = computed(() => {
    const s = this.summary();
    return !s || s.valueChange >= 0;
  });

  // xAxisConfig is computed so min/max update when the timeframe changes,
  // forcing ApexCharts to re-render the date labels correctly.
  protected readonly xAxisConfig = computed<ApexXAxis>(() => {
    const snapshots = this.filteredSnapshots();
    const base: ApexXAxis = {
      type: 'datetime',
      labels: {
        style: { colors: '#9CA3AF', fontSize: '10px' },
        datetimeUTC: false,
      },
      axisBorder: { show: false },
      axisTicks: { show: false },
    };
    if (snapshots.length < 2) return base;
    return {
      ...base,
      min: snapshots[0].timestamp * 1000,
      max: snapshots[snapshots.length - 1].timestamp * 1000,
    };
  });

  protected readonly chartConfig: ApexChart = {
    type: 'line',
    height: 360,
    toolbar: { show: false },
    zoom: { enabled: false },
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    animations: { enabled: true, speed: 400 },
  };

  protected readonly yAxisConfig: ApexYAxis = {
    labels: { show: false },
  };

  protected readonly strokeConfig: ApexStroke = {
    curve: 'smooth',
    width: 2,
    colors: ['#111827'],
  };

  protected readonly tooltipConfig: ApexTooltip = {
    x: { format: 'dd MMM yyyy HH:mm' },
    y: {
      formatter: (value: number) =>
        new Intl.NumberFormat('de-DE', {
          style: 'currency',
          currency: 'EUR',
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(value),
    },
    theme: 'dark',
  };

  protected readonly gridConfig: ApexGrid = {
    borderColor: '#F3F4F6',
    strokeDashArray: 4,
    xaxis: { lines: { show: false } },
    yaxis: { lines: { show: true } },
  };

  protected readonly dataLabelsConfig: ApexDataLabels = { enabled: false };

  protected readonly colors = ['#7B248D'];
}
