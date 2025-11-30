import { Injectable, Signal, signal, computed } from '@angular/core';
import { AllocationStrategyResponse, AllocationStrategyDto, SetAllocationStrategyRequest } from '../models/allocation.model';

const API_BASE_URL = 'https://localhost:7192';
const USER_ID = 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d';

@Injectable({
  providedIn: 'root',
})
export class AllocationService {
  private readonly _strategy = signal<AllocationStrategyResponse | null>(null);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);

  public readonly strategy: Signal<AllocationStrategyResponse | null> = this._strategy.asReadonly();
  public readonly loading: Signal<boolean> = this._loading.asReadonly();
  public readonly error: Signal<string | null> = this._error.asReadonly();

  // Computed signal for O(1) lookups of target percentages by ticker
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

  async loadStrategy(userId: string = USER_ID): Promise<void> {
    // Prevent multiple simultaneous loads
    if (this._loading()) {
      return;
    }

    try {
      this._loading.set(true);
      this._error.set(null);

      const response = await fetch(`${API_BASE_URL}/api/v1/portfolios/allocation?userId=${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch allocation strategy: ${response.status} ${response.statusText}`);
      }

      const data: AllocationStrategyResponse = await response.json();
      this._strategy.set(data);

    } catch (err) {
      console.error('Error loading allocation strategy:', err);
      this._error.set(err instanceof Error ? err.message : 'Failed to load allocation strategy');
      this._strategy.set(null);
    } finally {
      this._loading.set(false);
    }
  }

  /**
   * Update a single target allocation.
   * NOTE: This method only sends allocations that are currently in the loaded strategy.
   * For sending ALL portfolio items (including new ones), use setAllocationStrategy() instead.
   * The backend expects ALL items to be sent so it can determine what to delete, update, or add.
   */
  async updateTarget(userId: string = USER_ID, ticker: string, newPercentage: number): Promise<void> {
    const currentStrategy = this._strategy();
    
    if (!currentStrategy) {
      throw new Error('Allocation strategy not loaded. Please load strategy first.');
    }

    // Create a copy of current allocations
    // WARNING: This only includes allocations already in the strategy, not all portfolio items
    const updatedAllocations: AllocationStrategyDto[] = [...currentStrategy.allocations];
    
    // Find existing allocation for this ticker
    const tickerUpper = ticker.toUpperCase();
    const existingIndex = updatedAllocations.findIndex(
      alloc => alloc.ticker.toUpperCase() === tickerUpper
    );

    if (existingIndex >= 0) {
      // Update existing allocation
      updatedAllocations[existingIndex] = {
        ...updatedAllocations[existingIndex],
        targetPercentage: newPercentage,
      };
    } else {
      // Add new allocation
      updatedAllocations.push({
        ticker: tickerUpper,
        targetPercentage: newPercentage,
      });
    }

    // Calculate new total allocated
    const newTotalAllocated = updatedAllocations.reduce(
      (sum, alloc) => sum + alloc.targetPercentage,
      0
    );

    // Optimistic update: update local signal immediately
    const previousStrategy = currentStrategy;
    this._strategy.set({
      allocations: updatedAllocations,
      totalAllocated: newTotalAllocated,
    });

    try {
      // Send PUT request with full list
      const request: SetAllocationStrategyRequest = {
        allocations: updatedAllocations,
      };

      const response = await fetch(`${API_BASE_URL}/api/v1/portfolios/allocation?userId=${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        // Revert optimistic update on error
        this._strategy.set(previousStrategy);
        const errorText = await response.text();
        console.error('API Error:', response.status, errorText);
        throw new Error(`Failed to update allocation strategy: ${response.status} ${response.statusText}`);
      }

      // Reload to ensure consistency with backend
      await this.loadStrategy(userId);

    } catch (err) {
      console.error('Error updating allocation target:', err);
      // Strategy already reverted on error, but ensure error state is set
      this._error.set(err instanceof Error ? err.message : 'Failed to update allocation target');
      throw err;
    }
  }

  /**
   * Set the complete allocation strategy for all portfolio items.
   * This method sends ALL allocations (modified and unmodified) to the backend,
   * which expects the complete list to determine what to delete, update, or add.
   */
  async setAllocationStrategy(userId: string = USER_ID, allocations: AllocationStrategyDto[]): Promise<void> {
    // Calculate total allocated
    const totalAllocated = allocations.reduce(
      (sum, alloc) => sum + alloc.targetPercentage,
      0
    );

    // Optimistic update: update local signal immediately
    const previousStrategy = this._strategy();
    this._strategy.set({
      allocations: [...allocations],
      totalAllocated,
    });

    try {
      // Send PUT request with complete list of ALL allocations
      const request: SetAllocationStrategyRequest = {
        allocations: allocations,
      };

      const response = await fetch(`${API_BASE_URL}/api/v1/portfolios/allocation?userId=${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        // Revert optimistic update on error
        if (previousStrategy) {
          this._strategy.set(previousStrategy);
        }
        const errorText = await response.text();
        console.error('API Error:', response.status, errorText);
        throw new Error(`Failed to set allocation strategy: ${response.status} ${response.statusText}`);
      }

      // Reload to ensure consistency with backend
      await this.loadStrategy(userId);

    } catch (err) {
      console.error('Error setting allocation strategy:', err);
      // Strategy already reverted on error, but ensure error state is set
      this._error.set(err instanceof Error ? err.message : 'Failed to set allocation strategy');
      throw err;
    }
  }
}

