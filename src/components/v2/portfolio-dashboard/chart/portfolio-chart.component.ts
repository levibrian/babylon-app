import {
  ChangeDetectionStrategy, Component, ElementRef, Input, OnChanges,
  SimpleChanges, ViewChild, AfterViewInit, OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { PortfolioSnapshotDto } from '../../../../models/portfolio-history.model';

interface ChartPoint { x: number; y: number; value: number; date: Date; }

@Component({
  selector: 'app-portfolio-chart',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './portfolio-chart.component.html',
  styleUrl: './portfolio-chart.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PortfolioChartComponent implements OnChanges, AfterViewInit, OnDestroy {
  @Input() snapshots: PortfolioSnapshotDto[] = [];
  @Input() positive = true;

  @ViewChild('chartSvg')     chartSvgEl!:     ElementRef<SVGSVGElement>;
  @ViewChild('chartLine')    chartLineEl!:    ElementRef<SVGPathElement>;
  @ViewChild('chartFill')    chartFillEl!:    ElementRef<SVGPathElement>;
  @ViewChild('crossDot')     crossDotEl!:     ElementRef<SVGCircleElement>;
  @ViewChild('chartAxis')    chartAxisEl!:    ElementRef<HTMLDivElement>;
  @ViewChild('chartTooltip') tooltipEl!:      ElementRef<HTMLDivElement>;
  @ViewChild('tooltipVal')   tooltipValEl!:   ElementRef<HTMLDivElement>;
  @ViewChild('tooltipDate')  tooltipDateEl!:  ElementRef<HTMLDivElement>;

  protected showShimmer = true;
  private points: ChartPoint[] = [];
  private animFrameId: number | null = null;

  private readonly W = 800;
  private readonly H = 120;
  private readonly PADDING_TOP = 12;
  private readonly PADDING_BOTTOM = 22;

  get lineColor(): string { return this.positive ? '#27C97A' : '#E8524A'; }
  get gradientId(): string { return this.positive ? 'fillGradPos' : 'fillGradNeg'; }

  ngAfterViewInit(): void {
    if (this.snapshots.length > 0) this.renderChart();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['snapshots'] && this.chartLineEl) {
      this.showShimmer = this.snapshots.length === 0;
      if (this.snapshots.length > 0) this.renderChart();
    }
  }

  ngOnDestroy(): void {
    if (this.animFrameId !== null) cancelAnimationFrame(this.animFrameId);
  }

  private renderChart(): void {
    this.showShimmer = false;
    this.points = this.buildPoints();
    if (this.points.length < 2) return;

    const linePath = this.smoothPath(this.points);
    const fillPath = linePath + ` L${this.W},${this.H} L0,${this.H} Z`;

    this.chartLineEl.nativeElement.setAttribute('stroke', this.lineColor);
    this.chartLineEl.nativeElement.setAttribute('d', linePath);
    this.chartFillEl.nativeElement.setAttribute('d', fillPath);

    this.renderXAxis();
    this.animateLineIn(this.chartLineEl.nativeElement);
  }

  private buildPoints(): ChartPoint[] {
    const snaps = this.snapshots;
    const values = snaps.map(s => s.totalMarketValue);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const usableH = this.H - this.PADDING_TOP - this.PADDING_BOTTOM;

    return snaps.map((s, i) => ({
      x: snaps.length === 1 ? this.W / 2 : (i / (snaps.length - 1)) * this.W,
      y: this.PADDING_TOP + usableH - ((s.totalMarketValue - min) / range) * usableH,
      value: s.totalMarketValue,
      date: new Date(s.timestamp * 1000),
    }));
  }

  private smoothPath(pts: ChartPoint[]): string {
    if (pts.length === 1) return `M${pts[0].x},${pts[0].y}`;
    let d = `M${pts[0].x},${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
      const prev = pts[i - 1];
      const curr = pts[i];
      const cpX = (prev.x + curr.x) / 2;
      d += ` C${cpX},${prev.y} ${cpX},${curr.y} ${curr.x},${curr.y}`;
    }
    return d;
  }

  private animateLineIn(line: SVGPathElement): void {
    const len = line.getTotalLength();
    line.style.strokeDasharray = `${len}`;
    line.style.strokeDashoffset = `${len}`;

    const start = performance.now();
    const duration = 800;

    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      line.style.strokeDashoffset = `${len * (1 - eased)}`;
      if (progress < 1) {
        this.animFrameId = requestAnimationFrame(tick);
      } else {
        line.style.strokeDasharray = '';
        line.style.strokeDashoffset = '';
      }
    };
    this.animFrameId = requestAnimationFrame(tick);
  }

  private renderXAxis(): void {
    const axis = this.chartAxisEl?.nativeElement;
    if (!axis || this.points.length < 2) return;

    while (axis.firstChild) {
      axis.removeChild(axis.firstChild);
    }

    const count = Math.min(5, this.points.length);
    const indices: number[] = [];
    for (let i = 0; i < count; i++) {
      indices.push(Math.round((i / (count - 1)) * (this.points.length - 1)));
    }

    indices.forEach(idx => {
      const pt = this.points[idx];
      const pct = (pt.x / this.W) * 100;
      const label = document.createElement('span');
      label.className = 'axis-label';
      label.textContent = this.formatAxisDate(pt.date);
      label.style.left = `${pct}%`;
      axis.appendChild(label);
    });
  }

  private formatAxisDate(d: Date): string {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  protected onMouseMove(event: MouseEvent): void {
    this.updateCrosshair(event.clientX, event.currentTarget as SVGSVGElement);
  }

  protected onTouchMove(event: TouchEvent): void {
    event.preventDefault();
    if (event.touches.length > 0) {
      this.updateCrosshair(event.touches[0].clientX, event.currentTarget as SVGSVGElement);
    }
  }

  protected onLeave(): void {
    if (!this.crossDotEl) return;
    this.chartSvgEl.nativeElement.classList.remove('crosshair-visible');
    this.tooltipEl.nativeElement.classList.remove('visible');
  }

  private updateCrosshair(clientX: number, svgEl: SVGSVGElement): void {
    if (this.points.length < 2) return;
    const rect = svgEl.getBoundingClientRect();
    const fraction = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const svgX = fraction * this.W;

    let nearest = this.points[0];
    let minDist = Math.abs(this.points[0].x - svgX);
    for (const pt of this.points) {
      const d = Math.abs(pt.x - svgX);
      if (d < minDist) { minDist = d; nearest = pt; }
    }

    this.crossDotEl.nativeElement.setAttribute('cx', `${nearest.x}`);
    this.crossDotEl.nativeElement.setAttribute('cy', `${nearest.y}`);
    this.crossDotEl.nativeElement.setAttribute('fill', this.lineColor);
    svgEl.classList.add('crosshair-visible');

    this.tooltipValEl.nativeElement.textContent = new Intl.NumberFormat('en-US', {
      style: 'currency', currency: 'USD', minimumFractionDigits: 2,
    }).format(nearest.value);
    this.tooltipDateEl.nativeElement.textContent = nearest.date.toLocaleDateString('en-US', {
      month: 'short', day: 'numeric',
    });

    const dotScreenX = rect.left + (nearest.x / this.W) * rect.width;
    this.tooltipEl.nativeElement.style.left = `${dotScreenX}px`;
    this.tooltipEl.nativeElement.style.top = `${rect.top - 52}px`;
    this.tooltipEl.nativeElement.classList.add('visible');
  }
}
