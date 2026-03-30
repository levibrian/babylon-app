import { Component, ChangeDetectionStrategy, computed, input } from '@angular/core';
import { NgApexchartsModule } from 'ng-apexcharts';
import type {
  ApexChart,
  ApexXAxis,
  ApexYAxis,
  ApexTooltip,
  ApexGrid,
  ApexDataLabels,
  ApexFill,
  ApexStroke,
  ApexPlotOptions,
  ApexLegend,
} from 'ng-apexcharts';
import { DividendMonth } from '../../models/dividend-tracker.model';

@Component({
  selector: 'app-dividend-tracker-chart',
  templateUrl: './dividend-tracker-chart.component.html',
  imports: [NgApexchartsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DividendTrackerChartComponent {
  readonly paid = input<DividendMonth[]>([]);
  readonly projected = input<DividendMonth[]>([]);

  protected readonly categories = computed(() =>
    [...this.paid(), ...this.projected()].map(m => m.label)
  );

  protected readonly chartSeries = computed(() => {
    const paidCount = this.paid().length;
    const projectedCount = this.projected().length;

    const paidData: (number | null)[] = [
      ...this.paid().map(m => m.amount),
      ...Array(projectedCount).fill(null),
    ];

    const projectedData: (number | null)[] = [
      ...Array(paidCount).fill(null),
      ...this.projected().map(m => m.amount),
    ];

    return [
      { name: 'Received', data: paidData },
      { name: 'Projected', data: projectedData },
    ];
  });

  protected readonly chartConfig: ApexChart = {
    type: 'bar',
    height: 360,
    toolbar: { show: false },
    zoom: { enabled: false },
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    animations: { enabled: true, speed: 400 },
  };

  protected readonly plotOptions: ApexPlotOptions = {
    bar: {
      columnWidth: '60%',
      borderRadius: 3,
    },
  };

  protected readonly fillConfig: ApexFill = {
    type: 'solid',
    opacity: [1, 0.15],
  };

  protected readonly strokeConfig: ApexStroke = {
    show: true,
    width: [0, 2],
    colors: ['transparent', '#10B981'],
    dashArray: [0, 4],
  };

  protected readonly xAxisConfig = computed<ApexXAxis>(() => ({
    categories: this.categories(),
    labels: {
      style: { colors: '#9CA3AF', fontSize: '10px' },
      rotate: -30,
    },
    axisBorder: { show: false },
    axisTicks: { show: false },
  }));

  protected readonly yAxisConfig: ApexYAxis = {
    labels: { show: false },
  };

  protected readonly tooltipConfig: ApexTooltip = {
    y: {
      formatter: (value: number | null) => {
        if (value === null || value === 0) return '—';
        return new Intl.NumberFormat('de-DE', {
          style: 'currency',
          currency: 'EUR',
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(value);
      },
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

  protected readonly legendConfig: ApexLegend = {
    show: true,
    position: 'top',
    horizontalAlign: 'right',
    fontSize: '11px',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    labels: { colors: '#6B7280' },
    markers: { size: 6 },
  };

  protected readonly colors = ['#10B981', '#10B981'];
}
