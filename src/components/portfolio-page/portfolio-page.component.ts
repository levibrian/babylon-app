import { Component, ChangeDetectionStrategy, inject, Signal } from '@angular/core';
import { PortfolioListComponent } from '../portfolio-list/portfolio-list.component';
import { PortfolioService } from '../../services/portfolio.service';
import { PortfolioItem } from '../../models/portfolio.model';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-portfolio-page',
  templateUrl: './portfolio-page.component.html',
  imports: [PortfolioListComponent, RouterLink, CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PortfolioPageComponent {
  private portfolioService = inject(PortfolioService);
  portfolio: Signal<PortfolioItem[]> = this.portfolioService.portfolio;
  totalValue: Signal<number> = this.portfolioService.totalPortfolioValue;
}