import { Injectable, Signal, signal, computed, inject, effect } from '@angular/core';
import { AuthService } from './auth.service';
import { AllocationStrategyResponse, AllocationStrategyDto, SetAllocationStrategyRequest } from '../models/allocation.model';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';

import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AllocationService {
  private http = inject(HttpClient);
  private readonly _strategy = signal<AllocationStrategyResponse | null>(null);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  public readonly strategy: Signal<AllocationStrategyResponse | null> = this._strategy.asReadonly();
  public readonly loading: Signal<boolean> = this._loading.asReadonly();
  public readonly error: Signal<string | null> = this._error.asReadonly();

  public readonly targetMap: Signal<Map<string, number>> = computed(() => {
    const currentStrategy = this._strategy();
    if (!currentStrategy || !currentStrategy.allocations) {
      return new Map<string, number>();
    }

    const map = new Map<string, number>();
    currentStrategy.allocations.forEach(allocation => {
      map.set(allocation.ticker.toUpperCase(), allocation.targetPercentage);
    });
    return map;
  });

  async loadStrategy(): Promise<void> {
    if (this._loading()) {
      return;
    }

    try {
      this._loading.set(true);
      this._error.set(null);

      const data = await lastValueFrom(this.http.get<AllocationStrategyResponse>(`${environment.apiUrl}/api/v1/portfolios/allocation`));
      this._strategy.set(data);

    } catch (err) {
      console.error('Error loading allocation strategy:', err);
      this._error.set(err instanceof Error ? err.message : 'Failed to load allocation strategy');
      this._strategy.set(null);
    } finally {
      this._loading.set(false);
    }
  }

  async updateTarget(
    ticker: string, 
    newPercentage: number,
    options?: { isEnabledForWeekly?: boolean, isEnabledForBiWeekly?: boolean, isEnabledForMonthly?: boolean }
  ): Promise<void> {
    const currentStrategy = this._strategy();
    
    if (!currentStrategy) {
      throw new Error('Allocation strategy not loaded. Please load strategy first.');
    }

    const updatedAllocations: AllocationStrategyDto[] = [...currentStrategy.allocations];
    
    const tickerUpper = ticker.toUpperCase();
    const existingIndex = updatedAllocations.findIndex(
      alloc => alloc.ticker.toUpperCase() === tickerUpper
    );

    if (existingIndex >= 0) {
      updatedAllocations[existingIndex] = {
        ...updatedAllocations[existingIndex],
        targetPercentage: newPercentage,
        ...(options?.isEnabledForWeekly !== undefined && { isEnabledForWeekly: options.isEnabledForWeekly }),
        ...(options?.isEnabledForBiWeekly !== undefined && { isEnabledForBiWeekly: options.isEnabledForBiWeekly }),
        ...(options?.isEnabledForMonthly !== undefined && { isEnabledForMonthly: options.isEnabledForMonthly }),
      };
    } else {
      updatedAllocations.push({
        ticker: tickerUpper,
        targetPercentage: newPercentage,
        isEnabledForWeekly: options?.isEnabledForWeekly ?? true,
        isEnabledForBiWeekly: options?.isEnabledForBiWeekly ?? true,
        isEnabledForMonthly: options?.isEnabledForMonthly ?? true,
      });
    }

    const newTotalAllocated = updatedAllocations.reduce(
      (sum, alloc) => sum + alloc.targetPercentage,
      0
    );

    const previousStrategy = currentStrategy;
    this._strategy.set({
      allocations: updatedAllocations,
      totalAllocated: newTotalAllocated,
    });

    try {
      const request: SetAllocationStrategyRequest = {
        allocations: updatedAllocations,
      };

      await lastValueFrom(this.http.put(`${environment.apiUrl}/api/v1/portfolios/allocation`, request));

      await this.loadStrategy();

    } catch (err) {
      console.error('Error updating allocation target:', err);
      this._strategy.set(previousStrategy);
      this._error.set(err instanceof Error ? err.message : 'Failed to update allocation target');
      throw err;
    }
  }

  async setAllocationStrategy(allocations: AllocationStrategyDto[]): Promise<void> {
    const totalAllocated = allocations.reduce((sum, alloc) => sum + alloc.targetPercentage, 0);

    const previousStrategy = this._strategy();
    this._strategy.set({
      allocations: [...allocations],
      totalAllocated,
    });

    try {
      const request: SetAllocationStrategyRequest = {
        allocations: allocations,
      };

      await lastValueFrom(this.http.put(`${environment.apiUrl}/api/v1/portfolios/allocation`, request));

      await this.loadStrategy();

    } catch (err) {
      console.error('Error setting allocation strategy:', err);
      if (previousStrategy) {
        this._strategy.set(previousStrategy);
      }
      this._error.set(err instanceof Error ? err.message : 'Failed to set allocation strategy');
      throw err;
    }
  }
  private authService = inject(AuthService);

  constructor() {
    // Reactive data fetching based on auth state
    effect(() => {
      if (this.authService.isAuthenticated()) {
        this.loadStrategy();
      } else {
        this.reset();
      }
    });
  }

  /**
   * Clears all allocation state. Called on logout.
   */
  public reset(): void {
    this._strategy.set(null);
    this._loading.set(false);
    this._error.set(null);
  }
}

