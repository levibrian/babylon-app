import { Routes } from '@angular/router';
import { TransactionsPageComponent } from './components/transactions-page/transactions-page.component';
import { WealthPageComponent } from './components/wealth-page/wealth-page.component';
import { PortfolioDesignDemoComponent } from './components/portfolio-design-demo/portfolio-design-demo.component';

export const routes: Routes = [
  { path: '', redirectTo: 'wealth', pathMatch: 'full' },
  { path: 'transactions', component: TransactionsPageComponent },
  { path: 'wealth', component: WealthPageComponent },
  { path: 'portfolio-design-demo', component: PortfolioDesignDemoComponent },
];