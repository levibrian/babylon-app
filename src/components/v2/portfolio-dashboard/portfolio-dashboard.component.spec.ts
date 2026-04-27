import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PortfolioDashboardV2Component } from './portfolio-dashboard.component';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { SOCIAL_AUTH_CONFIG } from '@abacritt/angularx-social-login';

describe('PortfolioDashboardV2Component', () => {
  let fixture: ComponentFixture<PortfolioDashboardV2Component>;
  let component: PortfolioDashboardV2Component;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PortfolioDashboardV2Component],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideRouter([]),
        {
          provide: SOCIAL_AUTH_CONFIG,
          useValue: {
            autoLogin: false,
            providers: [],
            onError: () => {},
          },
        },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(PortfolioDashboardV2Component);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should default timePeriod to 1M', () => {
    expect(component.timePeriod()).toBe('1M');
  });
});
