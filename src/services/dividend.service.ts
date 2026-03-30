import { Injectable, signal, Signal, inject, effect } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { AuthService } from './auth.service';
import { environment } from '../environments/environment';
import { DividendTrackerResponse } from '../models/dividend-tracker.model';

@Injectable({
  providedIn: 'root',
})
export class DividendService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);

  constructor() {
    effect(() => {
      if (this.authService.isAuthenticated()) {
        this.fetchDividendTracker();
      } else {
        this.reset();
      }
    });
  }

  private readonly _dividendTracker = signal<DividendTrackerResponse | null>(null);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  public readonly dividendTracker: Signal<DividendTrackerResponse | null> = this._dividendTracker.asReadonly();
  public readonly loading: Signal<boolean> = this._loading.asReadonly();
  public readonly error: Signal<string | null> = this._error.asReadonly();

  public reset(): void {
    this._dividendTracker.set(null);
    this._loading.set(false);
    this._error.set(null);
  }

  async fetchDividendTracker(): Promise<void> {
    try {
      this._loading.set(true);
      this._error.set(null);

      const data = await lastValueFrom(
        this.http.get<DividendTrackerResponse>(`${environment.apiUrl}/api/v1/portfolios/dividends`)
      );
      this._dividendTracker.set(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load dividend tracker';
      this._error.set(errorMessage);
      console.error('Error fetching dividend tracker:', err);
    } finally {
      this._loading.set(false);
    }
  }
}
