import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PortfolioHeroComponent } from './portfolio-hero.component';
import { provideZonelessChangeDetection } from '@angular/core';

describe('PortfolioHeroComponent', () => {
  let fixture: ComponentFixture<PortfolioHeroComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PortfolioHeroComponent],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();
    fixture = TestBed.createComponent(PortfolioHeroComponent);
    fixture.componentInstance.totalValue = 48204.33;
    fixture.componentInstance.pnlAmount = 3412.18;
    fixture.componentInstance.pnlPercent = 7.61;
    fixture.detectChanges();
  });

  it('should render the hero value', () => {
    const el = fixture.nativeElement.querySelector('.hero-value');
    expect(el).toBeTruthy();
  });

  it('should show positive P&L in green', () => {
    const el = fixture.nativeElement.querySelector('.hero-perf-amount');
    expect(el.classList).toContain('pos');
  });

  it('should default time period to 1M', () => {
    const active = fixture.nativeElement.querySelector('.time-item.active');
    expect(active?.textContent?.trim()).toBe('1M');
  });
});
