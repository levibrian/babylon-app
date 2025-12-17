import { Routes } from '@angular/router';
import { TransactionsPageComponent } from './components/transactions-page/transactions-page.component';
import { TransactionsPageV2Component } from './components/transactions-page-v2/transactions-page-v2.component';
import { WealthPageComponent } from './components/wealth-page/wealth-page.component';
import { PortfolioDesignDemoComponent } from './components/portfolio-design-demo/portfolio-design-demo.component';

export const routes: Routes = [
  { path: '', redirectTo: 'wealth', pathMatch: 'full' },
  { path: 'transactions', component: TransactionsPageV2Component },
  { path: 'transactions-legacy', component: TransactionsPageComponent }, // Keep old version accessible
  { path: 'wealth', component: WealthPageComponent },
  { path: 'portfolio-design-demo', component: PortfolioDesignDemoComponent },
];