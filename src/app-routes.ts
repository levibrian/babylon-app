import { Routes } from '@angular/router';
import { TransactionsPageComponent } from './components/transactions-page/transactions-page.component';
import { TransactionsPageV2Component } from './components/transactions-page-v2/transactions-page-v2.component';
import { WealthPageComponent } from './components/wealth-page/wealth-page.component';
import { PortfolioDesignDemoComponent } from './components/portfolio-design-demo/portfolio-design-demo.component';
import { LoginComponent } from './components/auth/login/login.component';
import { authGuard, publicGuard } from './guards/auth.guard';
import { ShellComponent } from './components/v2/shell/shell.component';

export const routes: Routes = [
  { path: '', redirectTo: 'wealth', pathMatch: 'full' },
  // Both /login and /register load the same LoginComponent.
  // Route data.mode pre-selects the tab so direct links to /register work.
  {
    path: 'login',
    component: LoginComponent,
    canActivate: [publicGuard],
    data: { mode: 'login' },
  },
  {
    path: 'register',
    component: LoginComponent,
    canActivate: [publicGuard],
    data: { mode: 'register' },
  },
  { path: 'transactions', component: TransactionsPageV2Component, canActivate: [authGuard] },
  { path: 'transactions-legacy', component: TransactionsPageComponent, canActivate: [authGuard] },
  { path: 'wealth', component: WealthPageComponent, canActivate: [authGuard] },
  {
    path: 'settings',
    loadComponent: () =>
      import('./components/profile-settings/profile-settings.component').then(
        (m) => m.ProfileSettingsComponent
      ),
    canActivate: [authGuard],
  },
  { path: 'portfolio-design-demo', component: PortfolioDesignDemoComponent, canActivate: [authGuard] },
  // ── SPEC-003 redesign — live alongside old routes until full rollout ──
  {
    path: 'v2',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'portfolio', pathMatch: 'full' },
      {
        path: 'portfolio',
        loadComponent: () =>
          import('./components/v2/portfolio-dashboard/portfolio-dashboard.component').then(m => m.PortfolioDashboardV2Component),
      },
      {
        path: 'transactions',
        loadComponent: () =>
          import('./components/v2/placeholder/placeholder.component').then(m => m.PlaceholderComponent),
        data: { label: 'Transactions — coming in Plan D' },
      },
      {
        path: 'recurring',
        loadComponent: () =>
          import('./components/v2/placeholder/placeholder.component').then(m => m.PlaceholderComponent),
        data: { label: 'Recurring Investments — coming in Plan E' },
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./components/v2/placeholder/placeholder.component').then(m => m.PlaceholderComponent),
        data: { label: 'Settings — coming in Plan E' },
      },
      {
        path: 'asset/:ticker',
        loadComponent: () =>
          import('./components/v2/placeholder/placeholder.component').then(m => m.PlaceholderComponent),
        data: { label: 'Asset Detail — coming in Plan C' },
      },
    ],
  },
];