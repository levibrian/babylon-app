import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PortfolioChartComponent } from './portfolio-chart.component';
import { provideZonelessChangeDetection } from '@angular/core';

describe('PortfolioChartComponent', () => {
  let fixture: ComponentFixture<PortfolioChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PortfolioChartComponent],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();
    fixture = TestBed.createComponent(PortfolioChartComponent);
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should show shimmer when snapshots is empty', () => {
    fixture.componentInstance.snapshots = [];
    fixture.detectChanges();
    const shimmer = fixture.nativeElement.querySelector('.chart-shimmer');
    expect(shimmer).toBeTruthy();
  });

  it('should hide shimmer when snapshots has data', () => {
    fixture.componentInstance.snapshots = [
      { timestamp: 1000, totalInvested: 1000, cashBalance: 0, totalMarketValue: 1100,
        unrealizedPnL: 100, unrealizedPnLPercentage: 10, realizedPnL: 0, realizedPnLPercentage: 0 },
    ];
    fixture.detectChanges();
    const shimmer = fixture.nativeElement.querySelector('.chart-shimmer.hidden');
    expect(shimmer).toBeTruthy();
  });
});
