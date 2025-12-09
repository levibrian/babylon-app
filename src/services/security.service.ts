import { Injectable, signal, Signal } from '@angular/core';
import { Security } from '../models/security.model';

import { environment } from '../environments/environment';


@Injectable({
  providedIn: 'root',
})
export class SecurityService {
  private readonly _securities = signal<Security[]>([]);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  public readonly securities: Signal<Security[]> = this._securities.asReadonly();
  public readonly loading: Signal<boolean> = this._loading.asReadonly();
  public readonly error: Signal<string | null> = this._error.asReadonly();

  constructor() {
    this.fetchSecurities();
  }

  async reload(): Promise<void> {
    await this.fetchSecurities();
  }

  private async fetchSecurities(): Promise<void> {
    try {
      this._error.set(null);
      this._loading.set(true);

      const response = await fetch(`${environment.apiUrl}/api/v1/securities`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch securities: ${response.status} ${response.statusText}`);
      }

      const data: Security[] = await response.json();
      this._securities.set(data);

    } catch (err) {
      this._error.set('Could not load securities. Please ensure the backend server is running and accessible.');
      console.error('Error fetching securities:', err);
    } finally {
      this._loading.set(false);
    }
  }

  /**
   * Filter securities by search term (case-insensitive)
   * Matches against both ticker and securityName
   */
  filterSecurities(searchTerm: string): Security[] {
    if (!searchTerm || searchTerm.trim().length === 0) {
      return [];
    }

    const term = searchTerm.toLowerCase().trim();
    return this._securities().filter(security => 
      security.ticker.toLowerCase().includes(term) ||
      security.securityName.toLowerCase().includes(term)
    );
  }
}

