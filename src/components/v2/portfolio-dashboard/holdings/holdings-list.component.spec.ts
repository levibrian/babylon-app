import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HoldingsListComponent } from './holdings-list.component';
import { provideZonelessChangeDetection } from '@angular/core';
import { PortfolioItem } from '../../../../models/portfolio.model';

const MOCK_ITEMS: PortfolioItem[] = [
  {
    ticker: 'AAPL', companyName: 'Apple', totalShares: 12, totalCost: 16600,
    averageSharePrice: 1383.33, currentMarketValue: 18420, unrealizedPnL: 1820,
    unrealizedPnLPercentage: 10.9, transactions: [],
    securityType: 'Stock' as any,
    targetAllocationPercentage: 35, currentAllocationPercentage: 38.2,
    allocationDifference: 3.2, rebalanceAmount: -1542,
    rebalancingStatus: 'Overweight',
  },
];

describe('HoldingsListComponent', () => {
  let fixture: ComponentFixture<HoldingsListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HoldingsListComponent],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();
    fixture = TestBed.createComponent(HoldingsListComponent);
    fixture.componentInstance.items = MOCK_ITEMS;
    fixture.detectChanges();
  });

  it('should render a holding row', () => {
    const rows = fixture.nativeElement.querySelectorAll('.h-row');
    expect(rows.length).toBe(1);
  });

  it('should show overweight pill for overweight holdings', () => {
    const pill = fixture.nativeElement.querySelector('.alloc-pill.overweight');
    expect(pill).toBeTruthy();
  });

  it('should render holding name', () => {
    const name = fixture.nativeElement.querySelector('.h-name');
    expect(name.textContent.trim()).toBe('Apple');
  });
});
