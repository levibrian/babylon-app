import { Injectable, signal, Signal } from '@angular/core';
import { environment } from '../environments/environment';
import {
  ApiDiversificationMetrics,
  ApiRiskMetrics,
  ApiRebalancingActions,
  ApiSmartRebalancingRequest,
  ApiSmartRebalancingResponse,
} from '../models/api-response.model';

const USER_ID = 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d';

@Injectable({
  providedIn: 'root',
})
export class PortfolioAnalyticsService {
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

  /**
   * Fetches diversification metrics for a user
   */
  async getDiversificationMetrics(userId: string = USER_ID): Promise<ApiDiversificationMetrics | null> {
    try {
      this._loading.set(true);
      this._error.set(null);

      const response = await fetch(
        `${environment.apiUrl}/api/v1/portfolios/${userId}/diversification`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch diversification metrics: ${response.status} ${response.statusText}`);
      }

      const data: ApiDiversificationMetrics = await response.json();
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

  /**
   * Fetches risk metrics for a user
   */
  async getRiskMetrics(
    userId: string = USER_ID,
    period: '1Y' | '6M' | '3M' = '1Y'
  ): Promise<ApiRiskMetrics | null> {
    try {
      this._loading.set(true);
      this._error.set(null);

      const response = await fetch(
        `${environment.apiUrl}/api/v1/portfolios/${userId}/risk?period=${period}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch risk metrics: ${response.status} ${response.statusText}`);
      }

      const data: ApiRiskMetrics = await response.json();
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

  /**
   * Fetches rebalancing actions for a user
   */
  async getRebalancingActions(userId: string = USER_ID): Promise<ApiRebalancingActions | null> {
    try {
      this._loading.set(true);
      this._error.set(null);

      const response = await fetch(
        `${environment.apiUrl}/api/v1/portfolios/${userId}/rebalancing/actions`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch rebalancing actions: ${response.status} ${response.statusText}`);
      }

      const data: ApiRebalancingActions = await response.json();
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

  /**
   * Calculates smart rebalancing recommendations
   */
  async getSmartRecommendations(
    request: ApiSmartRebalancingRequest,
    userId: string = USER_ID
  ): Promise<ApiSmartRebalancingResponse | null> {
    try {
      this._loading.set(true);
      this._error.set(null);

      const response = await fetch(
        `${environment.apiUrl}/api/v1/portfolios/${userId}/rebalancing/recommendations`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(request),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', response.status, errorText);
        throw new Error(`Failed to calculate recommendations: ${response.status} ${response.statusText}`);
      }

      const data: ApiSmartRebalancingResponse = await response.json();
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

  /**
   * Loads all analytics data in parallel
   */
  async loadAllAnalytics(userId: string = USER_ID, riskPeriod: '1Y' | '6M' | '3M' = '1Y'): Promise<void> {
    await Promise.all([
      this.getDiversificationMetrics(userId),
      this.getRiskMetrics(userId, riskPeriod),
      this.getRebalancingActions(userId),
    ]);
  }
}

