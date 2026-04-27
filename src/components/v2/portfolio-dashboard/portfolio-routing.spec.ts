import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { routes } from '../../../app-routes';

describe('v2/portfolio route', () => {
  it('should load PortfolioDashboardV2Component', async () => {
    await TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideRouter(routes)],
    }).compileComponents();

    const v2Route = routes.find(r => r.path === 'v2');
    const children = (v2Route as any)?.children ?? [];
    const portfolioRoute = children.find((c: any) => c.path === 'portfolio');

    expect(portfolioRoute).toBeTruthy();
    const component = await portfolioRoute.loadComponent();
    expect(component.name).toBe('PortfolioDashboardV2Component');
  });
});
