import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HoldingsListComponent } from './holdings-list.component';
import { provideZonelessChangeDetection } from '@angular/core';
import { PortfolioItem } from '../../../../models/portfolio.model';

const BASE_ITEM: PortfolioItem = {
  ticker: 'AAPL', companyName: 'Apple', totalShares: 12, totalCost: 16600,
  averageSharePrice: 1383.33, currentMarketValue: 18420, unrealizedPnL: 1820,
  unrealizedPnLPercentage: 10.9, transactions: [],
  securityType: 'Stock' as any,
  targetAllocationPercentage: 35, currentAllocationPercentage: 38.2,
  allocationDifference: 3.2, rebalanceAmount: -1542,
  rebalancingStatus: 'Overweight',
};

const MOCK_ITEMS: PortfolioItem[] = [BASE_ITEM];

describe('HoldingsListComponent', () => {
  let fixture: ComponentFixture<HoldingsListComponent>;
  let component: HoldingsListComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HoldingsListComponent],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();
    fixture = TestBed.createComponent(HoldingsListComponent);
    component = fixture.componentInstance;
    component.items = MOCK_ITEMS;
    fixture.detectChanges();
  });

  // --- Existing tests (must stay green) ---

  it('should render a holding row', () => {
    const rows = fixture.nativeElement.querySelectorAll('.h-row:not(.h-row-skel)');
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

  // --- P&L toggle ---

  describe('P&L toggle labels', () => {
    it('should show Absolute and Relative toggle buttons', () => {
      const buttons: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('.h-tog-opt'));
      const labels = buttons.map(b => b.textContent!.trim());
      expect(labels).toContain('Absolute');
      expect(labels).toContain('Relative');
    });

    it('should not show a Daily button', () => {
      const buttons: HTMLElement[] = Array.from(fixture.nativeElement.querySelectorAll('.h-tog-opt'));
      const labels = buttons.map(b => b.textContent!.trim());
      expect(labels).not.toContain('Daily');
    });
  });

  describe('P&L mode: Absolute (default)', () => {
    it('should default to Absolute mode', () => {
      const active: HTMLElement | null = fixture.nativeElement.querySelector('.h-tog-opt.active');
      expect(active?.textContent?.trim()).toBe('Absolute');
    });

    it('should display unrealizedPnLPercentage as % in Absolute mode', () => {
      const pnl: HTMLElement = fixture.nativeElement.querySelector('.h-pnl');
      expect(pnl.textContent!.trim()).toContain('10.9%');
    });

    it('should not display a currency amount in Absolute mode', () => {
      const pnl: HTMLElement = fixture.nativeElement.querySelector('.h-pnl');
      // Should be a % only — no euro currency amount mixed in
      expect(pnl.textContent!.trim()).not.toMatch(/1\.820/);
    });
  });

  describe('P&L mode: Relative', () => {
    beforeEach(() => {
      const relButton: HTMLElement = Array.from(
        fixture.nativeElement.querySelectorAll('.h-tog-opt')
      ).find((b: any) => b.textContent.trim() === 'Relative') as HTMLElement;
      relButton.click();
      fixture.detectChanges();
    });

    it('should display unrealizedPnL as a currency amount in Relative mode', () => {
      const pnl: HTMLElement = fixture.nativeElement.querySelector('.h-pnl');
      expect(pnl.textContent!.trim()).toContain('1.820');
    });

    it('should not display a % sign in Relative mode', () => {
      const pnl: HTMLElement = fixture.nativeElement.querySelector('.h-pnl');
      expect(pnl.textContent!.trim()).not.toContain('%');
    });
  });

  describe('P&L null handling', () => {
    it('should display — when unrealizedPnLPercentage is null in Absolute mode', () => {
      fixture.componentRef.setInput('items', [{ ...BASE_ITEM, unrealizedPnL: null, unrealizedPnLPercentage: null }]);
      fixture.detectChanges();
      const pnl: HTMLElement = fixture.nativeElement.querySelector('.h-pnl');
      expect(pnl.textContent!.trim()).toBe('—');
    });
  });

  // --- Type line ---

  describe('type line', () => {
    it('should show share count', () => {
      const type: HTMLElement = fixture.nativeElement.querySelector('.h-type');
      expect(type.textContent).toContain('12 shares');
    });

    it('should render .h-type-mkt span for current price per share', () => {
      const mkt: HTMLElement | null = fixture.nativeElement.querySelector('.h-type-mkt');
      expect(mkt).toBeTruthy();
    });

    it('should display current price per share (18420 / 12 = 1535) in .h-type-mkt', () => {
      const mkt: HTMLElement = fixture.nativeElement.querySelector('.h-type-mkt');
      // 1535.00 in de-DE format: "1.535,00"
      expect(mkt.textContent).toContain('1.535');
    });

    it('should show average share price in the type line', () => {
      const type: HTMLElement = fixture.nativeElement.querySelector('.h-type');
      // averageSharePrice 1383.33 in de-DE: "1.383"
      expect(type.textContent).toContain('1.383');
    });

    it('should not render .h-type-mkt when currentMarketValue is null', () => {
      fixture.componentRef.setInput('items', [{ ...BASE_ITEM, currentMarketValue: null }]);
      fixture.detectChanges();
      const mkt: HTMLElement | null = fixture.nativeElement.querySelector('.h-type-mkt');
      expect(mkt).toBeFalsy();
    });

    it('should still show share count and avg when currentMarketValue is null', () => {
      fixture.componentRef.setInput('items', [{ ...BASE_ITEM, currentMarketValue: null }]);
      fixture.detectChanges();
      const type: HTMLElement = fixture.nativeElement.querySelector('.h-type');
      expect(type.textContent).toContain('12 shares');
      expect(type.textContent).toContain('1.383');
    });
  });

  // --- P&L click-to-toggle ---

  describe('P&L click-to-toggle', () => {
    it('should switch to Relative when .h-pnl is clicked in Absolute mode', () => {
      const pnl: HTMLElement = fixture.nativeElement.querySelector('.h-pnl');
      pnl.click();
      fixture.detectChanges();
      const active: HTMLElement | null = fixture.nativeElement.querySelector('.h-tog-opt.active');
      expect(active?.textContent?.trim()).toBe('Relative');
    });

    it('should switch back to Absolute when .h-pnl is clicked again', () => {
      const pnl: HTMLElement = fixture.nativeElement.querySelector('.h-pnl');
      pnl.click();
      fixture.detectChanges();
      pnl.click();
      fixture.detectChanges();
      const active: HTMLElement | null = fixture.nativeElement.querySelector('.h-tog-opt.active');
      expect(active?.textContent?.trim()).toBe('Absolute');
    });

    it('should not emit rowClick when .h-pnl is clicked', fakeAsync(() => {
      const emitted: string[] = [];
      component.rowClick.subscribe((t: string) => emitted.push(t));
      const pnl: HTMLElement = fixture.nativeElement.querySelector('.h-pnl');
      pnl.click();
      tick(300);
      expect(emitted.length).toBe(0);
    }));
  });

  // --- Tap feedback ---

  describe('tap feedback', () => {
    it('should add .tapped class to the row immediately on click', fakeAsync(() => {
      const row: HTMLElement = fixture.nativeElement.querySelector('.h-row:not(.h-row-skel)');
      row.click();
      fixture.detectChanges();
      expect(row.classList.contains('tapped')).toBeTrue();
      tick(300);
    }));

    it('should not emit rowClick immediately on click', fakeAsync(() => {
      const emitted: string[] = [];
      component.rowClick.subscribe((t: string) => emitted.push(t));
      const row: HTMLElement = fixture.nativeElement.querySelector('.h-row:not(.h-row-skel)');
      row.click();
      expect(emitted.length).toBe(0);
      tick(300);
    }));

    it('should emit rowClick with the ticker after 160ms', fakeAsync(() => {
      const emitted: string[] = [];
      component.rowClick.subscribe((t: string) => emitted.push(t));
      const row: HTMLElement = fixture.nativeElement.querySelector('.h-row:not(.h-row-skel)');
      row.click();
      tick(160);
      expect(emitted).toEqual(['AAPL']);
      tick(100);
    }));

    it('should remove .tapped class after 160ms', fakeAsync(() => {
      const row: HTMLElement = fixture.nativeElement.querySelector('.h-row:not(.h-row-skel)');
      row.click();
      fixture.detectChanges();
      tick(160);
      fixture.detectChanges();
      expect(row.classList.contains('tapped')).toBeFalse();
      tick(100);
    }));
  });
});
