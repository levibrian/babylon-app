import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of, from } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { PlanningRow } from '../models/planning.model';
import { environment } from '../environments/environment';
import { SecurityType } from '../models/security.model';
import { ApiPortfolioResponse } from '../models/api-response.model';
import { AllocationService } from './allocation.service';
import { AllocationStrategyDto } from '../models/allocation.model';

export interface PlanningData {
  monthlyInvestment: number;
  rows: PlanningRow[];
}

@Injectable({
  providedIn: 'root'
})
export class PlanningService {
  private http = inject(HttpClient);
  private allocationService = inject(AllocationService);
  private apiUrl = `${environment.apiUrl}/api/v1`;

  getPlanningData(): Observable<PlanningData> {
    // Ensure allocation service has loaded strategy
    this.allocationService.loadStrategy();

    return forkJoin({
      user: this.http.get<any>(`${this.apiUrl}/users/me`).pipe(
        catchError(err => {
          console.error('Error fetching user:', err);
          return of({ monthlyInvestmentAmount: 0 });
        })
      ),
      strategy: this.http.get<any>(`${this.apiUrl}/portfolios/allocation`).pipe(
        catchError(err => {
          console.error('Error fetching strategy:', err);
          return of({ allocations: [] });
        })
      ),
      portfolio: this.http.get<ApiPortfolioResponse>(`${this.apiUrl}/portfolios`).pipe(
        catchError(err => {
          console.error('Error fetching portfolio:', err);
          return of({ positions: [], totalInvested: 0, dailyGainLoss: 0, dailyGainLossPercentage: 0 } as ApiPortfolioResponse);
        })
      )
    }).pipe(
      map(data => {
        const rows = this.mergeAndMapToRows(data.portfolio.positions, data.strategy.allocations);
        return {
          monthlyInvestment: data.user.monthlyInvestmentAmount ?? 0,
          rows: rows
        };
      })
    );
  }

  updateMonthlyInvestment(amount: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/users/me`, { monthlyInvestmentAmount: amount });
  }

  updateAllocation(row: PlanningRow): Observable<any> {
    return from(this.allocationService.updateTarget(
      row.ticker, 
      row.targetPercentage,
      {
        isEnabledForWeekly: row.isWeeklyEnabled,
        isEnabledForBiWeekly: row.isBiWeeklyEnabled,
        isEnabledForMonthly: row.isMonthlyEnabled
      }
    ));
  }

  addSecurity(ticker: string): Observable<any> {
    return from(this.allocationService.updateTarget(ticker, 0));
  }

  deleteSecurity(ticker: string): Observable<void> {
    const currentStrategy = this.allocationService.strategy();
    if (!currentStrategy || !currentStrategy.allocations) {
      return of(undefined);
    }

    const updatedAllocations = currentStrategy.allocations.filter(
      a => a.ticker.toUpperCase() !== ticker.toUpperCase()
    );

    return from(this.allocationService.setAllocationStrategy(updatedAllocations));
  }

  private mergeAndMapToRows(portfolioPositions: any[], allocations: AllocationStrategyDto[]): PlanningRow[] {
    const uniqueTickers = new Set<string>();
    
    // Add tickers from allocations (planned items)
    allocations?.forEach(a => {
      if (a.ticker) uniqueTickers.add(a.ticker);
    });
    
    // // Add tickers from portfolio positions (owned items)
    // portfolioPositions?.forEach(p => uniqueTickers.add(p.ticker));

    return Array.from(uniqueTickers).map(ticker => {
      const position = portfolioPositions?.find(p => p.ticker === ticker);
      const allocation = allocations?.find(a => a.ticker === ticker);
      
      // Determine type: prefer position info, default to Stock
      let type: SecurityType = "Stock";
      if (position && position.securityType !== undefined) {
        type = position.securityType;
      }

      const row: PlanningRow = {
        ticker,
        securityName: position?.securityName,
        assetType: position ? this.mapAssetType(position.securityType) : 'Stocks',
        weeklyEur: 0, 
        biWeeklyEur: 0, 
        monthlyEur: 0, 
        targetPercentage: allocation ? allocation.targetPercentage : 0,
        isWeeklyEnabled: allocation ? (allocation.isEnabledForWeekly ?? true) : true,
        isBiWeeklyEnabled: allocation ? (allocation.isEnabledForBiWeekly ?? true) : true,
        isMonthlyEnabled: allocation ? (allocation.isEnabledForMonthly ?? true) : true
      };
      
      return row;
    });
  }

  private mapAssetType(type?: SecurityType | string | any): 'Stocks' | 'ETFs' | 'Crypto' {
    // Handle string values from API
    if (typeof type === 'string') {
      const normalized = type.toUpperCase();
      if (normalized === 'STOCK' || normalized === 'STOCKS') return 'Stocks';
      if (normalized === 'ETF' || normalized === 'ETFS') return 'ETFs';
      if (normalized === 'CRYPTO') return 'Crypto';
      return 'Stocks';
    }

    // Type is now always a string, so this should not be needed, but kept for safety
    return 'Stocks';
  }
}
