import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PortfolioDashboardV2Component } from './portfolio-dashboard.component';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';

describe('PortfolioDashboardV2Component integration', () => {
  let fixture: ComponentFixture<PortfolioDashboardV2Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PortfolioDashboardV2Component],
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(PortfolioDashboardV2Component);
    fixture.detectChanges();
  });

  it('should render hero component', () => {
    const hero = fixture.nativeElement.querySelector('app-portfolio-hero');
    expect(hero).toBeTruthy();
  });

  it('should render chart component', () => {
    const chart = fixture.nativeElement.querySelector('app-portfolio-chart');
    expect(chart).toBeTruthy();
  });

  it('should render holdings list component', () => {
    const holdings = fixture.nativeElement.querySelector('app-holdings-list');
    expect(holdings).toBeTruthy();
  });
});
