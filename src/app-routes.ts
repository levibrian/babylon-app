import { Routes } from '@angular/router';
import { TransactionsPageComponent } from './components/transactions-page/transactions-page.component';
import { PortfolioPageComponent } from './components/portfolio-page/portfolio-page.component';

export const routes: Routes = [
  { path: '', redirectTo: 'portfolio', pathMatch: 'full' },
  { path: 'transactions', component: TransactionsPageComponent },
  { path: 'portfolio', component: PortfolioPageComponent },
];