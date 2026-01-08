import { Injectable, signal, Signal, inject, effect } from '@angular/core';
import { AuthService } from './auth.service';
import { environment } from '../environments/environment';
import {
  ApiDiversificationMetrics,
  ApiRiskMetrics,
  ApiRebalancingActions,
  ApiSmartRebalancingRequest,
  ApiSmartRebalancingResponse,
} from '../models/api-response.model';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class PortfolioAnalyticsService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);

  constructor() {
    // Reactive data fetching based on auth state
    effect(() => {
      if (this.authService.isAuthenticated()) {
        this.loadAllAnalytics();
      } else {
        this.reset();
      }
    });
  }

  /**
   * Clears all analytics state. Called on logout.
   */
  public reset(): void {
    this._diversificationMetrics.set(null);
    this._riskMetrics.set(null);
    this._rebalancingActions.set(null);
    this._loading.set(false);
    this._error.set(null);
  }
  private readonly _diversificationMetrics = signal<ApiDiversificationMetrics | null>(null);
  private readonly _riskMetrics = signal<ApiRiskMetrics | null>(null);
  private readonly _rebalancingActions = signal<ApiRebalancingActions | null>(null);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  public readonly diversificationMetrics: Signal<ApiDiversificationMetrics | null> = 
    this._diversificationMetrics.asReadonly();
  public readonly riskMetrics: Signal<ApiRiskMetrics | null> = 
    this._riskMetrics.asReadonly();
  public readonly rebalancingActions: Signal<ApiRebalancingActions | null> = 
    this._rebalancingActions.asReadonly();
  public readonly loading: Signal<boolean> = this._loading.asReadonly();
  public readonly error: Signal<string | null> = this._error.asReadonly();

  async getDiversificationMetrics(): Promise<ApiDiversificationMetrics | null> {
    try {
      this._loading.set(true);
      this._error.set(null);

      const data = await lastValueFrom(
        this.http.get<ApiDiversificationMetrics>(`${environment.apiUrl}/api/v1/portfolios/diversification`)
      );
      this._diversificationMetrics.set(data);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load diversification metrics';
      this._error.set(errorMessage);
      console.error('Error fetching diversification metrics:', err);
      return null;
    } finally {
      this._loading.set(false);
    }
  }

  async getRiskMetrics(period: '1Y' | '6M' | '3M' = '1Y'): Promise<ApiRiskMetrics | null> {
    try {
      this._loading.set(true);
      this._error.set(null);

      const data = await lastValueFrom(
        this.http.get<ApiRiskMetrics>(`${environment.apiUrl}/api/v1/portfolios/risk?period=${period}`)
      );
      this._riskMetrics.set(data);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load risk metrics';
      this._error.set(errorMessage);
      console.error('Error fetching risk metrics:', err);
      return null;
    } finally {
      this._loading.set(false);
    }
  }

  async getRebalancingActions(): Promise<ApiRebalancingActions | null> {
    try {
      this._loading.set(true);
      this._error.set(null);

      const data = await lastValueFrom(
        this.http.get<ApiRebalancingActions>(`${environment.apiUrl}/api/v1/portfolios/rebalancing/actions`)
      );
      this._rebalancingActions.set(data);
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load rebalancing actions';
      this._error.set(errorMessage);
      console.error('Error fetching rebalancing actions:', err);
      return null;
    } finally {
      this._loading.set(false);
    }
  }

  async getSmartRecommendations(request: ApiSmartRebalancingRequest): Promise<ApiSmartRebalancingResponse | null> {
    try {
      this._loading.set(true);
      this._error.set(null);

      const data = await lastValueFrom(
        this.http.post<ApiSmartRebalancingResponse>(`${environment.apiUrl}/api/v1/portfolios/rebalancing/recommendations`, request)
      );
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to calculate recommendations';
      this._error.set(errorMessage);
      console.error('Error calculating smart recommendations:', err);
      return null;
    } finally {
      this._loading.set(false);
    }
  }

  async loadAllAnalytics(riskPeriod: '1Y' | '6M' | '3M' = '1Y'): Promise<void> {
    await Promise.all([
      this.getDiversificationMetrics(),
      this.getRiskMetrics(riskPeriod),
      this.getRebalancingActions(),
    ]);
  }
}

