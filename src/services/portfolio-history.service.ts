import { Injectable, signal, Signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { environment } from '../environments/environment';
import {
  PortfolioSnapshotDto,
  PortfolioHistoryApiResponse,
  TimeframeSummary,
  Timeframe,
} from '../models/portfolio-history.model';

@Injectable({
  providedIn: 'root',
})
export class PortfolioHistoryService {
  private http = inject(HttpClient);

  private readonly _portfolioHistory = signal<PortfolioSnapshotDto[]>([]);
  private readonly _isLoading = signal<boolean>(false);
  private readonly _error = signal<string | null>(null);

  public readonly portfolioHistory: Signal<PortfolioSnapshotDto[]> = this._portfolioHistory.asReadonly();
  public readonly isLoading: Signal<boolean> = this._isLoading.asReadonly();
  public readonly error: Signal<string | null> = this._error.asReadonly();

  public reset(): void {
    this._portfolioHistory.set([]);
    this._isLoading.set(false);
    this._error.set(null);
  }

  /**
   * Fetches all portfolio snapshots once and caches them in a signal.
   * Subsequent calls are no-ops if data is already loaded.
   */
  async loadHistory(): Promise<void> {
    if (this._portfolioHistory().length > 0) return;

    try {
      this._isLoading.set(true);
      this._error.set(null);

      const response = await lastValueFrom(
        this.http.get<PortfolioHistoryApiResponse>(`${environment.apiUrl}/api/v1/portfolios/history`)
      );

      this._portfolioHistory.set(response.snapshots ?? []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load portfolio history';
      this._error.set(errorMessage);
      console.error('Error fetching portfolio history:', err);
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Forces a refresh of the cached snapshot data.
   */
  async refresh(): Promise<void> {
    this._portfolioHistory.set([]);
    await this.loadHistory();
  }

  /**
   * Filters snapshots to a given timeframe window.
   * Returns all snapshots for 'Max'. Timestamps from backend are Unix seconds.
   */
  filterByTimeframe(timeframe: Timeframe, snapshots: PortfolioSnapshotDto[] = this._portfolioHistory()): PortfolioSnapshotDto[] {
    if (timeframe === 'Max') return snapshots;

    const now = Date.now(); // ms
    const cutoffMs = this.getCutoffMs(timeframe);

    return snapshots.filter(s => s.timestamp * 1000 >= cutoffMs && s.timestamp * 1000 <= now);
  }

  /**
   * Computes summary statistics for a filtered set of snapshots.
   * Returns null for an empty array.
   */
  computeSummary(snapshots: PortfolioSnapshotDto[]): TimeframeSummary | null {
    if (snapshots.length === 0) return null;

    const first = snapshots[0];
    const last = snapshots[snapshots.length - 1];

    const startingValue = first.unrealizedPnL + first.realizedPnL;
    const endingValue = last.unrealizedPnL + last.realizedPnL;
    const valueChange = endingValue - startingValue;
    // % relative to capital invested at the start of the period — avoids inflating
    // the return when new cash is deployed during the window.
    const valueChangePercentage = first.totalInvested === 0 ? 0 : (valueChange / first.totalInvested) * 100;

    let highestValue = startingValue;
    let highestValueTimestamp = first.timestamp;
    let lowestValue = startingValue;
    let lowestValueTimestamp = first.timestamp;

    for (const s of snapshots) {
      const pnl = s.unrealizedPnL + s.realizedPnL;
      if (pnl > highestValue) {
        highestValue = pnl;
        highestValueTimestamp = s.timestamp;
      }
      if (pnl < lowestValue) {
        lowestValue = pnl;
        lowestValueTimestamp = s.timestamp;
      }
    }

    return {
      startingValue,
      endingValue,
      valueChange,
      valueChangePercentage,
      highestValue,
      highestValueTimestamp,
      lowestValue,
      lowestValueTimestamp,
    };
  }

  private getCutoffMs(timeframe: Timeframe): number {
    const now = new Date();

    switch (timeframe) {
      case '1D':
        return now.getTime() - 24 * 60 * 60 * 1000;
      case '1W':
        return now.getTime() - 7 * 24 * 60 * 60 * 1000;
      case '1M':
        return now.getTime() - 30 * 24 * 60 * 60 * 1000;
      case '6M':
        return now.getTime() - 180 * 24 * 60 * 60 * 1000;
      case '1Y':
        return now.getTime() - 365 * 24 * 60 * 60 * 1000;
      case 'YTD': {
        const ytdStart = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
        return ytdStart.getTime();
      }
      default:
        return 0;
    }
  }
}
